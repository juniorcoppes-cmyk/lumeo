-- Filtros de busca na Comunidade (pedido do fundador em 2026-07-13): além
-- da distância que já existia, filtrar por tipo de perfil (casais/homens/
-- mulheres) e por selo de experiência (iniciante/iniciado/experiente).
-- "Homens"/"mulheres" só se aplica a perfil individual — perfil casal é
-- sempre "casais" independente do gênero de cada parceiro.
-- Precisa dropar a versão de 1 parâmetro antes: adicionar parâmetros novos
-- via CREATE OR REPLACE cria uma sobrecarga (overload) nova em vez de
-- substituir, já que a assinatura muda — mesma lição de "dropar antes de
-- recriar" já documentada no AGENTS.md.
drop function if exists browse_verified_users(int);

create or replace function browse_verified_users(
  p_max_distance_km int default null,
  p_profile_filter text default null,
  p_experience_level text default null
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
    and (p_experience_level is null or experience_level = p_experience_level);
$$;

grant execute on function browse_verified_users(int, text, text) to authenticated;
