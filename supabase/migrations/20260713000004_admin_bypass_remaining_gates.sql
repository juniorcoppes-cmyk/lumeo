-- Achado ao vivo pelo fundador (2026-07-13, quinta rodada): o bypass de
-- verificação do ADM (is_verified() incluindo is_admin, migração
-- 20260713000001) só valia onde o código já chamava is_verified(). Várias
-- policies mais antigas checavam a coluna verification_badge_id direto (do
-- CHAMADOR, não de quem está sendo visto/acessado), ignorando esse bypass —
-- por isso Comunidade, perfil de outros, acesso a fotos e inscrição em
-- evento continuavam bloqueando o ADM mesmo depois da correção anterior.
-- Trocando todo checagem "sou eu (auth.uid()) que preciso estar verificado"
-- pra usar is_verified(auth.uid()) em vez da coluna direta. As checagens
-- sobre quem está sendo visto/acessado (o "dono" dos dados) continuam
-- olhando a coluna direto, de propósito — isso não é sobre o ADM precisar
-- de selo, é sobre o outro usuário ser mesmo verificado.

drop policy "registrations insert own" on event_registrations;
create policy "registrations insert own"
  on event_registrations for insert
  with check (auth.uid() = user_id and is_verified(auth.uid()));

drop policy "photo requests insert own" on photo_access_requests;
create policy "photo requests insert own"
  on photo_access_requests for insert to authenticated
  with check (auth.uid() = requester_id and is_verified(auth.uid()));

drop policy "profile_photos select verified corpo" on profile_photos;
create policy "profile_photos select verified corpo"
  on profile_photos for select to authenticated
  using (
    category = 'corpo'
    and is_verified(auth.uid())
    and exists (select 1 from users o where o.id = profile_photos.user_id and o.verification_badge_id is not null)
  );

drop policy "profile_photos select rosto approved" on profile_photos;
create policy "profile_photos select rosto approved"
  on profile_photos for select to authenticated
  using (
    category = 'rosto'
    and is_verified(auth.uid())
    and exists (
      select 1 from photo_access_requests r
      where r.requester_id = auth.uid()
        and r.owner_id = profile_photos.user_id
        and r.status = 'approved'
    )
  );

drop policy "profile photos bucket select verified corpo" on storage.objects;
create policy "profile photos bucket select verified corpo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'corpo'
    and is_verified(auth.uid())
    and exists (
      select 1 from users o
      where o.id::text = (storage.foldername(name))[1]
        and o.verification_badge_id is not null
    )
  );

drop policy "profile photos bucket select rosto approved" on storage.objects;
create policy "profile photos bucket select rosto approved"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'rosto'
    and is_verified(auth.uid())
    and exists (
      select 1 from photo_access_requests r
      where r.requester_id = auth.uid()
        and r.owner_id::text = (storage.foldername(name))[1]
        and r.status = 'approved'
    )
  );
