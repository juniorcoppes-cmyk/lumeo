-- Match por afinidade: "quem combina com vocês". Reaproveita exatamente as
-- regras de elegibilidade da busca (browse_verified_users): só perfis
-- verificados, não ocultos, não discretos, e o próprio usuário verificado.
-- Pontua pela afinidade social (interesses, ambiente, ritmo) + experiência.
-- Devolve também o "por que combinam" (interesses/ambientes em comum).

begin;

create or replace function affinity_matches(p_limit int default 30)
returns table (
  id uuid,
  name text,
  profile_type text,
  verification_badge_id text,
  experience_level text,
  avatar_path text,
  score int,
  shared_interests text[],
  shared_settings text[],
  same_pace boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select u.experience_level as exp, a.interests, a.pace, a.settings
    from users u
    left join profile_affinity a on a.user_id = u.id
    where u.id = auth.uid()
  ),
  scored as (
    select
      u.id, u.name, u.profile_type, u.verification_badge_id,
      u.experience_level, u.avatar_path,
      si.arr as shared_interests,
      ss.arr as shared_settings,
      (a.pace is not null and a.pace = (select pace from me)) as same_pace,
      (
        coalesce(cardinality(si.arr), 0) * 3
        + coalesce(cardinality(ss.arr), 0) * 2
        + case
            when a.pace is not null and a.pace = (select pace from me) then 2
            else 0
          end
        + case
            when u.experience_level is null or (select exp from me) is null then 0
            when u.experience_level = (select exp from me) then 2
            when (u.experience_level, (select exp from me)) in (
              ('iniciante','iniciado'),('iniciado','iniciante'),
              ('iniciado','experiente'),('experiente','iniciado')
            ) then 1
            else 0
          end
      ) as score
    from users u
    join profile_affinity a on a.user_id = u.id
    cross join lateral (
      select array(select unnest(a.interests) intersect select unnest((select interests from me))) as arr
    ) si
    cross join lateral (
      select array(select unnest(a.settings) intersect select unnest((select settings from me))) as arr
    ) ss
    where u.verification_badge_id is not null
      and u.discreet_mode = false
      and u.hidden = false
      and u.id <> auth.uid()
      and is_verified(auth.uid())
  )
  select id, name, profile_type, verification_badge_id, experience_level,
         avatar_path, score, shared_interests, shared_settings, same_pace
  from scored
  where score > 0
  order by score desc, name
  limit p_limit;
$$;

-- Função security definer roda por cima do RLS — só usuário logado pode chamar.
revoke execute on function affinity_matches(int) from public, anon;
grant execute on function affinity_matches(int) to authenticated;

commit;

-- Prova rápida (deve retornar 1):
-- select count(*) from pg_proc where proname = 'affinity_matches';
