-- CHAT DE GRUPO DO EVENTO: bloqueio + "quem do casal falou" + foto (parte 1/2).
--
-- Esta parte é toda COMPATÍVEL com o app atual (só adiciona colunas nulas,
-- amplia o que event_group_messages devolve e abre uma policy de leitura de
-- foto que ainda não tem arquivo). Roda ANTES do deploy. A exigência de
-- "quem falou" pro casal (que quebraria o app antigo) fica na parte 2, que
-- roda DEPOIS do deploy.
--
-- Decisões (confirmadas com o fundador):
--   - BLOQUEIO: "some só entre os dois" — quem você bloqueou (ou te bloqueou)
--     some do grupo só pra você, e você pra ele; o resto do grupo vê os dois.
--     Feito filtrando a leitura (event_group_messages), não apagando nada.
--   - FOTO no grupo: só 'fixa' e 'temporaria' (some em 24h). Nada de
--     'visualização única' — num grupo ela não faz sentido (só o 1º a abrir
--     veria). Foto mora em <uid>/grupo/<arquivo>, no bucket profile-photos.
--   - PERSONA: casal marca quem está falando, igual ao 1-a-1.

begin;

-- Colunas novas na mensagem de grupo (todas nulas; app antigo não as usa).
alter table event_messages add column if not exists sender_persona text
  check (sender_persona in ('p1', 'p2'));
alter table event_messages add column if not exists photo_path text;
alter table event_messages add column if not exists photo_mode text
  check (photo_mode in ('fixa', 'temporaria'));
alter table event_messages add column if not exists photo_expires_at timestamptz;

-- Bloqueio também na LEITURA DIRETA da tabela (não só na função): sem isto,
-- um membro bloqueado ainda leria as mensagens do outro chamando a tabela por
-- API crua. A função é security definer (ignora o RLS) e tem o próprio filtro;
-- esta policy fecha o caminho direto. (O insert/update não mudam aqui.)
drop policy if exists "event msgs select members" on event_messages;
create policy "event msgs select members"
  on event_messages for select to authenticated
  using (
    is_event_member(event_id, auth.uid())
    and not ha_bloqueio(auth.uid(), sender_id)
  );

-- Leitura do grupo: agora devolve quem falou (persona + gêneros, pra montar o
-- rótulo Ele/Ela) e a foto, E ESCONDE as mensagens de quem está em bloqueio
-- com quem está lendo (nos dois sentidos, via ha_bloqueio). Continua security
-- definer e só responde pra membro do evento.
drop function if exists event_group_messages(uuid);
create function event_group_messages(p_event_id uuid)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_persona text,
  sender_gender text,
  sender_partner_gender text,
  content text,
  created_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  photo_path text,
  photo_mode text,
  photo_expires_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select m.id, m.sender_id, u.name, m.sender_persona, u.gender, u.partner_gender,
         m.content, m.created_at, m.edited_at, m.deleted_at,
         m.photo_path, m.photo_mode, m.photo_expires_at
    from event_messages m
    join users u on u.id = m.sender_id
   where m.event_id = p_event_id
     and is_event_member(p_event_id, auth.uid())
     and not ha_bloqueio(auth.uid(), m.sender_id)
   order by m.created_at asc;
$$;

revoke execute on function event_group_messages(uuid) from public, anon;
grant execute on function event_group_messages(uuid) to authenticated;

-- Quem pode ver uma foto do grupo: membro do evento dono da mensagem, sem
-- bloqueio com quem enviou, e só enquanto a foto é permitida (fixa, ou
-- temporária no prazo). Security definer pra não recorrer ao RLS dentro da
-- policy de storage (mesmo padrão de is_verified / is_event_member).
--
-- DONO DO ARQUIVO: exige que a pasta do arquivo seja a de quem enviou a
-- mensagem. Sem isto, bastaria inserir uma mensagem apontando pro photo_path
-- de OUTRA pessoa (o upload é travado na pasta própria, mas o registro aceita
-- qualquer string) pra ressuscitar/vazar a foto dela. Mensagem legítima sempre
-- passa: cada um sobe a foto na própria pasta <uid>/grupo/.
create or replace function pode_ver_foto_grupo(p_path text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from event_messages m
     where m.photo_path = p_path
       and (storage.foldername(m.photo_path))[1] = m.sender_id::text
       and m.deleted_at is null
       and is_event_member(m.event_id, auth.uid())
       and not ha_bloqueio(auth.uid(), m.sender_id)
       and (
         m.photo_mode = 'fixa'
         or (m.photo_mode = 'temporaria' and m.photo_expires_at > now())
       )
  );
$$;

revoke execute on function pode_ver_foto_grupo(text) from public, anon;
grant execute on function pode_ver_foto_grupo(text) to authenticated;

-- O DONO já lê a própria foto (policy "profile photos bucket select own").
-- Os outros membros leem pela policy abaixo. Subpasta 'grupo' separa do chat
-- 1-a-1 ('chat') e do álbum ('corpo'/'rosto'/'avatar').
drop policy if exists "event photo select members" on storage.objects;
create policy "event photo select members"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'grupo'
    and pode_ver_foto_grupo(name)
  );

commit;

-- Provas:
-- select count(*) as cols from information_schema.columns
--   where table_name='event_messages'
--     and column_name in ('sender_persona','photo_path','photo_mode','photo_expires_at');  -- 4
-- select count(*) as funcs from pg_proc
--   where proname in ('event_group_messages','pode_ver_foto_grupo');  -- 2
-- select count(*) as policy from pg_policies where policyname = 'event photo select members';  -- 1
