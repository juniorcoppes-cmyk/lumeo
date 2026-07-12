-- As actions de upload usam { upsert: true } (para permitir reenvio após
-- reprovação). O Storage do Supabase implementa upsert como um
-- "insert ... on conflict do update", e o Postgres exige uma policy de
-- UPDATE satisfeita para validar esse caminho — mesmo quando o objeto
-- ainda não existe. Sem isso, o upload falha com "new row violates
-- row-level security policy" mesmo tendo a policy de INSERT correta.
create policy "verifications bucket update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
