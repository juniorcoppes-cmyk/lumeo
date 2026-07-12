-- Upload com { upsert: true } vira "INSERT ... ON CONFLICT DO UPDATE" no
-- Postgres, que exige visibilidade de SELECT na tabela para checar se já
-- existe linha conflitante — mesmo quando a linha ainda não existe. Como só
-- havia SELECT para admin (usuário comum não devia ler o próprio arquivo de
-- volta), todo upload falhava com "new row violates row-level security
-- policy". Adiciona SELECT restrito à própria pasta do usuário (não expõe
-- arquivos de outros usuários, só o registro do storage.objects do próprio).
create policy "verifications bucket select own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
