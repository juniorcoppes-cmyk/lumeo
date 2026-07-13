-- Foto de perfil (pedido do fundador, 2026-07-12): uma foto única e
-- canônica, diferente do álbum (corpo/rosto) — visível pra qualquer
-- verificado, em qualquer lugar que mostra a identidade da pessoa
-- (Comunidade, perfil, linha do tempo). Mesma regra de visibilidade do
-- "corpo" do álbum, mas é um campo à parte, não uma foto do álbum: o
-- upload substitui a anterior (upsert), não acumula.
alter table users add column avatar_path text;

-- Insert/update/delete de storage.objects já cobertos pelas policies
-- existentes de profile-photos (que valem pra qualquer path dentro de
-- {user_id}/..., não só corpo/rosto) — só falta a leitura cross-user.
-- Usa is_verified() desde o início (não a subquery aninhada em `users`
-- que já causou bug de recursão de RLS na policy de "corpo").
create policy "profile photos bucket select verified avatar"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'avatar'
    and is_verified(auth.uid())
    and is_verified((storage.foldername(name))[1]::uuid)
  );

create or replace function browse_verified_users(p_max_distance_km int default null)
returns table (
  id uuid,
  name text,
  profile_type text,
  verification_badge_id text,
  experience_level text,
  avatar_path text,
  distance_bucket text
)
language sql
security definer
set search_path = public
stable
as $$
  with candidates as (
    select
      u.id,
      u.name,
      u.profile_type,
      u.verification_badge_id,
      u.experience_level,
      u.avatar_path,
      case
        when (select latitude from users where id = auth.uid()) is null or u.latitude is null
          then null
        else 6371 * acos(
          least(1, greatest(-1,
            sin(radians((select latitude from users where id = auth.uid())))
              * sin(radians(u.latitude))
            + cos(radians((select latitude from users where id = auth.uid())))
              * cos(radians(u.latitude))
              * cos(radians(u.longitude - (select longitude from users where id = auth.uid())))
          ))
        )
      end as distance_km
    from users u
    where u.verification_badge_id is not null
      and u.discreet_mode = false
      and u.id <> auth.uid()
      and is_verified(auth.uid())
  )
  select
    id,
    name,
    profile_type,
    verification_badge_id,
    experience_level,
    avatar_path,
    case
      when distance_km is null then null
      when distance_km < 5 then 'menos de 5 km'
      when distance_km < 25 then '5–25 km'
      when distance_km < 100 then '25–100 km'
      else 'mais de 100 km'
    end as distance_bucket
  from candidates
  where p_max_distance_km is null
    or (distance_km is not null and distance_km <= p_max_distance_km);
$$;

grant execute on function browse_verified_users(int) to authenticated;

create or replace function get_verified_profile(p_user_id uuid)
returns table (
  name text,
  profile_type text,
  verification_badge_id text,
  experience_level text,
  bio text,
  birth_date date,
  gender text,
  sexual_orientation text,
  looking_for text[],
  partner_birth_date date,
  partner_gender text,
  partner_sexual_orientation text,
  avatar_path text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.name, u.profile_type, u.verification_badge_id, u.experience_level,
    u.bio, u.birth_date, u.gender, u.sexual_orientation, u.looking_for,
    u.partner_birth_date, u.partner_gender, u.partner_sexual_orientation,
    u.avatar_path
  from users u
  where u.id = p_user_id
    and u.verification_badge_id is not null
    and is_verified(auth.uid());
$$;

grant execute on function get_verified_profile(uuid) to authenticated;

create or replace function get_timeline(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  author_name text,
  author_experience_level text,
  author_avatar_path text,
  type text,
  content text,
  created_at timestamptz,
  photo_id uuid,
  photo_category text,
  photo_storage_path text,
  can_view_photo boolean,
  event_id uuid,
  event_title text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    tp.id,
    tp.user_id,
    u.name as author_name,
    u.experience_level as author_experience_level,
    u.avatar_path as author_avatar_path,
    tp.type,
    tp.content,
    tp.created_at,
    tp.photo_id,
    pp.category as photo_category,
    pp.storage_path as photo_storage_path,
    case
      when pp.category = 'corpo' then true
      when pp.category = 'rosto' and tp.user_id = auth.uid() then true
      when pp.category = 'rosto' then exists (
        select 1 from photo_access_requests r
        where r.requester_id = auth.uid()
          and r.owner_id = tp.user_id
          and r.status = 'approved'
      )
      else null
    end as can_view_photo,
    tp.event_id,
    e.title as event_title
  from timeline_posts tp
  join users u on u.id = tp.user_id
  left join profile_photos pp on pp.id = tp.photo_id
  left join events e on e.id = tp.event_id
  where is_verified(auth.uid())
    and (
      tp.user_id = auth.uid()
      or (u.verification_badge_id is not null and u.discreet_mode = false)
    )
  order by tp.created_at desc
  limit p_limit;
$$;

grant execute on function get_timeline(int) to authenticated;
