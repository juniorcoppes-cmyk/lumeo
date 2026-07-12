-- Bucket privado para documento/vídeo de verificação (seção 7 da especificação).
-- Convenção de path: {user_id}/documento.<ext> e {user_id}/video.<ext>

insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

-- Papel de aprovação: por ora um flag simples na própria tabela users.
alter table users add column if not exists is_admin boolean not null default false;

create policy "verifications bucket insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura restrita à equipe de aprovação — usuário comum não lê o arquivo de volta.
create policy "verifications bucket select admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verifications'
    and exists (
      select 1 from users u where u.id = auth.uid() and u.is_admin
    )
  );
