-- Álbum de fotos por usuário, separado em rosto/corpo (conceito de fase 2/3
-- da spec, antecipado a pedido). Regras de visibilidade diferentes por
-- categoria:
--   - corpo: visível a qualquer usuário verificado, olhando o álbum de
--     qualquer outro usuário também verificado.
--   - rosto: mais sensível — só visível depois de o dono aprovar um pedido
--     de acesso específico de quem quer ver (ver photo_access_requests).
create table profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  category text not null check (category in ('rosto', 'corpo')),
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table profile_photos enable row level security;

-- Pedido de acesso ao álbum de rosto de alguém. Reaproveita a mesma linha
-- (upsert) se a pessoa pedir de novo depois de uma negativa.
create table photo_access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users (id) on delete cascade,
  owner_id uuid not null references users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> owner_id),
  unique (requester_id, owner_id)
);

alter table photo_access_requests enable row level security;

create policy "photo requests select own"
  on photo_access_requests for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = owner_id);

create policy "photo requests insert own"
  on photo_access_requests for insert to authenticated
  with check (
    auth.uid() = requester_id
    and exists (select 1 from users v where v.id = auth.uid() and v.verification_badge_id is not null)
  );

create policy "photo requests update owner"
  on photo_access_requests for update to authenticated
  using (auth.uid() = owner_id);

-- PROFILE_PHOTOS: policies de leitura ---------------------------------------

create policy "profile_photos select own"
  on profile_photos for select to authenticated
  using (auth.uid() = user_id);

create policy "profile_photos select verified corpo"
  on profile_photos for select to authenticated
  using (
    category = 'corpo'
    and exists (select 1 from users v where v.id = auth.uid() and v.verification_badge_id is not null)
    and exists (select 1 from users o where o.id = profile_photos.user_id and o.verification_badge_id is not null)
  );

create policy "profile_photos select rosto approved"
  on profile_photos for select to authenticated
  using (
    category = 'rosto'
    and exists (select 1 from users v where v.id = auth.uid() and v.verification_badge_id is not null)
    and exists (
      select 1 from photo_access_requests r
      where r.requester_id = auth.uid()
        and r.owner_id = profile_photos.user_id
        and r.status = 'approved'
    )
  );

create policy "profile_photos insert own"
  on profile_photos for insert to authenticated
  with check (auth.uid() = user_id);

create policy "profile_photos update own"
  on profile_photos for update to authenticated
  using (auth.uid() = user_id);

create policy "profile_photos delete own"
  on profile_photos for delete to authenticated
  using (auth.uid() = user_id);

-- Bucket separado do de verificação: fotos de perfil são visíveis dentro da
-- comunidade verificada (respeitando a regra de rosto acima), ao contrário
-- do documento/vídeo de verificação (que só admin vê).
-- Path: {user_id}/{rosto|corpo}/{arquivo}.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

create policy "profile photos bucket insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile photos bucket select own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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

create policy "profile photos bucket update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile photos bucket delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
