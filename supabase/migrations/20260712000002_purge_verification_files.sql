-- LGPD/minimização de dados: tratamos o Lumeo como sujeito às regras mais
-- restritivas de "conteúdo adulto" da Lei 15.211/2025 (ECA Digital) por
-- garantia — dado coletado para verificação de idade/identidade não deve
-- ser retido além do necessário. Documento e vídeo passam a ser apagados do
-- Storage assim que a verificação é aprovada (ver approveVerification em
-- src/app/admin/verificacoes/actions.ts); só o resultado (status, selo)
-- permanece. Reprovações continuam retidas (usuário ainda vai reenviar).
alter table verifications alter column document_url drop not null;
alter table verifications alter column video_url drop not null;
alter table verifications add column if not exists purged_at timestamptz;

-- Faltava policy de DELETE em storage.objects — só existiam insert/select/update.
create policy "verifications bucket delete admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'verifications'
    and exists (
      select 1 from users u where u.id = auth.uid() and u.is_admin
    )
  );
