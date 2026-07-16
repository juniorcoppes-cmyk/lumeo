-- Hardening do "hidden" (2026-07-16): além das 3 RPCs principais (Comunidade,
-- perfil por link, linha do tempo), fecha os caminhos de leitura DIRETA que
-- ainda expunham dados de quem se ocultou — fotos (profile_photos + storage)
-- e lista de presença de evento. Defesa em profundidade: pela UI já estava
-- bloqueado (todas as telas que levam à foto de um oculto retornam vazio);
-- isto cobre chamada crua de API.

-- Helper security definer (bypassa RLS, evita recursão dentro de policy de
-- storage — mesmo padrão de is_verified). Retorna false pra id inexistente.
create or replace function is_hidden(p_user_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce((select hidden from users where id = p_user_id), false);
$$;

grant execute on function is_hidden(uuid) to authenticated;

-- profile_photos: some corpo/rosto de quem está oculto (o dono continua vendo
-- as próprias, pela policy "select own", que não é tocada aqui).
drop policy "profile_photos select verified corpo" on profile_photos;
create policy "profile_photos select verified corpo"
  on profile_photos for select to authenticated
  using (
    category = 'corpo'
    and is_verified(auth.uid())
    and exists (select 1 from users o where o.id = profile_photos.user_id and o.verification_badge_id is not null)
    and not is_hidden(profile_photos.user_id)
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
    and not is_hidden(profile_photos.user_id)
  );

-- storage.objects: mesma regra nos arquivos (corpo / rosto / avatar).
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
    and not is_hidden((storage.foldername(name))[1]::uuid)
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
    and not is_hidden((storage.foldername(name))[1]::uuid)
  );

drop policy "profile photos bucket select verified avatar" on storage.objects;
create policy "profile photos bucket select verified avatar"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'avatar'
    and is_verified(auth.uid())
    and is_verified((storage.foldername(name))[1]::uuid)
    and not is_hidden((storage.foldername(name))[1]::uuid)
  );

-- Lista de presença de evento: não inclui quem está oculto.
create or replace function confirmed_attendees_for_event(p_event_id uuid)
returns table (id uuid, name text, verification_badge_id text, experience_level text, avatar_path text)
language sql security definer set search_path = public stable
as $$
  select u.id, u.name, u.verification_badge_id, u.experience_level, u.avatar_path
  from event_registrations self
  join event_registrations other
    on other.event_id = self.event_id and other.status = 'confirmed'
  join users u on u.id = other.user_id
  where self.event_id = p_event_id
    and self.user_id = auth.uid()
    and self.status = 'confirmed'
    and other.user_id <> auth.uid()
    and u.hidden = false;
$$;

grant execute on function confirmed_attendees_for_event(uuid) to authenticated;
