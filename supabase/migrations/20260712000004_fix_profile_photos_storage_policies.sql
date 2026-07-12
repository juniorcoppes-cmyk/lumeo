-- Achado em teste ao vivo (2 usuários reais): geração de signed URL para
-- fotos de "corpo" e "rosto aprovado" de OUTRO usuário retornava
-- "Object not found" mesmo com todas as condições da policy satisfeitas
-- (ambos verificados / pedido aprovado). O acesso à própria pasta (index 1
-- do path) sempre funcionou; só o acesso cross-user (que depende de
-- sub-consulta em outra tabela) falhava — sugere que a versão aplicada no
-- banco divergiu do que está neste arquivo. Recriando do zero, idempotente.

drop policy if exists "profile photos bucket select verified corpo" on storage.objects;
drop policy if exists "profile photos bucket select rosto approved" on storage.objects;

create policy "profile photos bucket select verified corpo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'corpo'
    and exists (select 1 from users v where v.id = auth.uid() and v.verification_badge_id is not null)
    and exists (
      select 1 from users o
      where o.id::text = (storage.foldername(name))[1]
        and o.verification_badge_id is not null
    )
  );

create policy "profile photos bucket select rosto approved"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'rosto'
    and exists (select 1 from users v where v.id = auth.uid() and v.verification_badge_id is not null)
    and exists (
      select 1 from photo_access_requests r
      where r.requester_id = auth.uid()
        and r.owner_id::text = (storage.foldername(name))[1]
        and r.status = 'approved'
    )
  );
