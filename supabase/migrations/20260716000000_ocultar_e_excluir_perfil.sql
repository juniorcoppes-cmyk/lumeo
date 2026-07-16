-- Ocultar / excluir perfil (pedido do fundador em 2026-07-16).
--
-- "Ocultar" = desativação REVERSÍVEL: o usuário some de toda parte visível a
-- outros (Comunidade, linha do tempo e perfil por link), como se tivesse
-- excluído — mas pode reativar quando quiser. É preferência do próprio dono
-- (mesmo padrão de discreet_mode), então NÃO entra no guard
-- protect_sensitive_user_columns: o usuário pode alternar o próprio `hidden`.
--
-- "Excluir" definitivo é feito no app via service role (apaga a conta em
-- auth.users, que cascateia public.users e todos os dados) — não precisa de
-- schema novo, só desta coluna pra opção reversível.

alter table users add column hidden boolean not null default false;

-- 1) Comunidade: não lista quem está oculto (soma-se ao filtro de discreet).
create or replace function browse_verified_users(
  p_max_distance_km int default null,
  p_profile_filter text default null,
  p_experience_level text default null,
  p_name_query text default null
)
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
      u.gender,
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
      and u.hidden = false
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
  where (p_max_distance_km is null or (distance_km is not null and distance_km <= p_max_distance_km))
    and (
      p_profile_filter is null
      or (p_profile_filter = 'casais' and profile_type = 'casal')
      or (p_profile_filter = 'homens' and profile_type = 'individual' and gender = 'homem')
      or (p_profile_filter = 'mulheres' and profile_type = 'individual' and gender = 'mulher')
    )
    and (p_experience_level is null or experience_level = p_experience_level)
    and (p_name_query is null or name ilike '%' || p_name_query || '%');
$$;

-- 2) Perfil por link (/perfil/[id]): não retorna nada se o dono está oculto.
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
    and u.hidden = false
    and is_verified(auth.uid());
$$;

-- 3) Linha do tempo: esconde posts de quem está oculto (o próprio dono
-- continua vendo os seus).
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
      or (u.verification_badge_id is not null and u.discreet_mode = false and u.hidden = false)
    )
  order by tp.created_at desc
  limit p_limit;
$$;

-- 4) Exclusão definitiva da própria conta: apaga a linha em auth.users, que
-- cascateia public.users e todos os dados do usuário (todas as tabelas usam
-- `on delete cascade` referenciando users). security definer pra ter direito
-- no schema auth; `where id = auth.uid()` garante que só apaga a conta de
-- quem chama, nunca a de outro.
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function delete_own_account() to authenticated;
