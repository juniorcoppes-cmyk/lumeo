-- Busca por proximidade na Comunidade (pedido do fundador, 2026-07-12).
-- Decisão consciente de segurança/discrição (ver discussão no chat): nunca
-- expor coordenadas exatas nem distância precisa entre dois usuários — só
-- faixas arredondadas, calculadas aqui dentro, nunca no cliente. Coordenada
-- também é arredondada em 2 casas decimais na escrita (~1.1km de ruído),
-- defesa adicional caso o banco vaze algum dia.
alter table users
  add column latitude numeric(5, 2),
  add column longitude numeric(5, 2),
  add column location_updated_at timestamptz;

-- Substitui browse_verified_users: agora calcula uma faixa de distância
-- (nunca km exato) em relação a quem está chamando, e aceita um filtro
-- opcional de raio máximo. Quem não compartilhou localização (própria ou do
-- outro) aparece com distance_bucket = null e não é afetado pelo filtro
-- (fica de fora só se um filtro de raio for aplicado, já que não dá pra
-- confirmar que está dentro).
-- Precisa dropar a versão sem parâmetro (criada na migração anterior) antes
-- de criar esta com parâmetro — senão as duas coexistem como overloads e
-- uma chamada sem argumento vira ambígua entre as duas.
drop function if exists browse_verified_users();

create or replace function browse_verified_users(p_max_distance_km int default null)
returns table (
  id uuid,
  name text,
  profile_type text,
  verification_badge_id text,
  experience_level text,
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
