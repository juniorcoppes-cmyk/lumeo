-- FECHA A BRECHA DE "CAMINHO ROUBADO" NA FOTO DO CHAT PRIVADO.
--
-- A policy "chat photo select recipient" (20261126190000, já em produção)
-- libera um arquivo se existir uma mensagem apontando pro caminho — mas não
-- confere que o arquivo é de quem MANDOU a mensagem. O upload é travado na
-- pasta do dono, porém o registro da mensagem aceita qualquer string em
-- photo_path. Então quem souber o caminho da foto de alguém (ex.: recebeu uma
-- visualização única) pode inserir uma mensagem NOVA como 'fixa' apontando pro
-- mesmo caminho e, assim, ressuscitar a foto ou vazá-la pra um terceiro numa
-- outra conversa.
--
-- Correção (idêntica à do grupo em pode_ver_foto_grupo): exigir que a pasta do
-- arquivo seja a de quem enviou a mensagem. Mensagem legítima sempre passa —
-- cada um sobe a foto na própria pasta <uid>/chat/.

begin;

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
        and (storage.foldername(m.photo_path))[1] = m.sender_id::text
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

commit;

-- Prova: a policy recriada existe (1). E, se der, teste ao vivo: pegar o
-- caminho de uma foto recebida e referenciá-lo numa mensagem nova não deve
-- mais abrir a foto pra quem não é o dono.
-- select count(*) from pg_policies where policyname = 'chat photo select recipient';
