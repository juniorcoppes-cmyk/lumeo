-- FOTO NO CHAT + modo de visualização.
--
-- No chat (privado, entre dois que já se escolheram) a foto PODE ter rosto —
-- diferente do feed, que borra. Ao enviar, quem manda escolhe um de três modos:
--   'fixa'        fica na conversa como qualquer mensagem
--   'temporaria'  some sozinha 24h depois de enviada, vista ou não
--   'unica'       o destinatário abre UMA vez e some
--
-- A foto mora em <uid>/chat/<arquivo>, no mesmo bucket profile-photos. O DONO
-- já lê a própria (policy "profile photos bucket select own"); o OUTRO da
-- conversa ganha uma policy nova, que só libera enquanto a foto é permitida.
-- A limpeza do arquivo no storage é feita por cron (igual aos stories).

begin;

alter table messages add column if not exists photo_path text;
alter table messages add column if not exists photo_mode text
  check (photo_mode in ('fixa', 'temporaria', 'unica'));
alter table messages add column if not exists photo_expires_at timestamptz;
alter table messages add column if not exists photo_viewed_at timestamptz;

-- Leitura da foto do chat pelo destinatário. Só enquanto permitida: fixa,
-- temporária no prazo, ou única ainda não vista. A URL da única é gerada
-- ANTES de marcar vista — por isso aqui a condição é `photo_viewed_at is null`
-- (depois de marcada, esta policy já nega a próxima tentativa).
drop policy if exists "chat photo select recipient" on storage.objects;
create policy "chat photo select recipient"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'chat'
    and exists (
      select 1
      from messages m
      join conversations c on c.id = m.conversation_id
      where m.photo_path = name
        and m.sender_id <> auth.uid()
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
        and m.deleted_at is null
        and (
          m.photo_mode = 'fixa'
          or (m.photo_mode = 'temporaria' and m.photo_expires_at > now())
          or (m.photo_mode = 'unica' and m.photo_viewed_at is null)
        )
    )
  );

-- Marca a foto de visualização única como vista. Security definer pra não
-- precisar abrir update de mensagem pro destinatário; só mexe nesta coluna,
-- nesta mensagem, e só se quem chama é o destinatário e ela ainda não foi
-- vista. O app gera a URL assinada ANTES de chamar isto.
create or replace function marcar_foto_unica_vista(p_message_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update messages
     set photo_viewed_at = now()
   where id = p_message_id
     and photo_mode = 'unica'
     and photo_viewed_at is null
     and sender_id <> auth.uid()
     and exists (
       select 1 from conversations c
       where c.id = conversation_id
         and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
     );
$$;

revoke execute on function public.marcar_foto_unica_vista(uuid) from public, anon;
grant execute on function public.marcar_foto_unica_vista(uuid) to authenticated, service_role;

commit;

-- Prova rápida (esperado 4):
-- select count(*) as cols from information_schema.columns
--   where table_name='messages'
--     and column_name in ('photo_path','photo_mode','photo_expires_at','photo_viewed_at');
