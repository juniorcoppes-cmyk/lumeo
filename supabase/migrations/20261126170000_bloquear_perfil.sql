-- BLOQUEAR PERFIL.
--
-- Com a porta de entrada mais seletiva (formulário -> aprovação), passou a
-- fazer falta poder bloquear alguém. O bloqueio é SIMÉTRICO no efeito: se
-- QUALQUER um dos dois bloqueou o outro, eles somem um do outro (comunidade,
-- match, feed, perfil) e não se falam (conversa nova E mensagem em conversa já
-- existente). Quem bloqueia não vira invisível pro mundo — só pra quem foi
-- bloqueado, e vice-versa.
--
-- O suporte (is_support_channel) nunca é afetado: continua sempre alcançável.
--
-- Uma regra só no banco, `ha_bloqueio(a, b)`, costura todas as telas — duas
-- regras pra mesma pergunta é como elas divergem (mesma lição do get_timeline
-- vs posso_ver_post).

begin;

create table if not exists user_blocks (
  blocker_id uuid not null references users (id) on delete cascade,
  blocked_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on user_blocks (blocked_id);

alter table user_blocks enable row level security;

-- Cada um enxerga e mexe só na PRÓPRIA lista. Ninguém descobre quem o
-- bloqueou: não há select de linhas onde você é o `blocked`.
drop policy if exists "user_blocks select own" on user_blocks;
create policy "user_blocks select own"
  on user_blocks for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "user_blocks insert own" on user_blocks;
create policy "user_blocks insert own"
  on user_blocks for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "user_blocks delete own" on user_blocks;
create policy "user_blocks delete own"
  on user_blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- true se A bloqueou B ou B bloqueou A. Base de todas as telas.
create or replace function ha_bloqueio(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

revoke execute on function public.ha_bloqueio(uuid, uuid) from public, anon;
grant execute on function public.ha_bloqueio(uuid, uuid) to authenticated, service_role;

-- Minha lista de bloqueados, com nome e foto, pra tela de desbloquear.
-- Security definer porque o RLS de `users` não expõe quem não é parceiro de
-- conversa — e um bloqueado normalmente não é.
create or replace function meus_bloqueados()
returns table (id uuid, name text, avatar_path text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.name, u.avatar_path, b.created_at
  from user_blocks b
  join users u on u.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

revoke execute on function public.meus_bloqueados() from public, anon;
grant execute on function public.meus_bloqueados() to authenticated, service_role;

-- ─── Foto de rosto: bloquear REVOGA o acesso já concedido ──────────────────
-- O rosto é o dado mais sensível, e bloquear é exatamente quando a pessoa quer
-- cortar esse acesso. Sem isto, um pedido de foto de rosto já aprovado
-- sobreviveria ao bloqueio (a regra de ver rosto só olha o pedido aprovado).
-- Gatilho apaga os pedidos entre os dois, nos DOIS sentidos; se um dia
-- desbloquearem, precisam pedir de novo.
create or replace function revoga_acesso_foto_ao_bloquear()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from photo_access_requests
  where (requester_id = new.blocker_id and owner_id = new.blocked_id)
     or (requester_id = new.blocked_id and owner_id = new.blocker_id);
  return new;
end;
$$;

revoke execute on function public.revoga_acesso_foto_ao_bloquear() from public, anon;

drop trigger if exists trg_revoga_acesso_foto on user_blocks;
create trigger trg_revoga_acesso_foto
  after insert on user_blocks
  for each row execute function revoga_acesso_foto_ao_bloquear();

-- E não dá pra pedir foto de rosto de quem você bloqueou (ou que te bloqueou).
-- Idêntica à de 20260712000003; entrou só `and not ha_bloqueio(...)`.
drop policy if exists "photo requests insert own" on photo_access_requests;
create policy "photo requests insert own"
  on photo_access_requests for insert to authenticated
  with check (
    auth.uid() = requester_id
    and exists (select 1 from users v where v.id = auth.uid() and v.verification_badge_id is not null)
    and not ha_bloqueio(auth.uid(), owner_id)
  );

-- ─── Conversa nova: as duas portas do chat passam por recusa_de_conversa ───
-- Idêntica à de 20261126150000; entrou só o bloco do bloqueio, logo após a
-- exceção do suporte (suporte vem primeiro, pra nunca ficar inalcançável).
create or replace function recusa_de_conversa(p_alvo uuid, p_no_evento boolean default false)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_porta text;
begin
  if coalesce((select is_support_channel from users where id = p_alvo), false) then
    return null;
  end if;

  if ha_bloqueio(auth.uid(), p_alvo) then
    return 'Não é possível iniciar uma conversa com este perfil.';
  end if;

  v_porta := porta_de_conversa(p_alvo);

  if v_porta = 'ninguem' then
    return case
      when p_no_evento
        then 'Esse perfil prefere dar o primeiro oi. Aproveitem o evento para se conhecerem pessoalmente.'
      else 'Esse perfil prefere dar o primeiro oi. Vocês podem se encontrar num evento — e aí a conversa começa por lá.'
    end;
  end if;

  if v_porta = 'casais'
     and not p_no_evento
     and coalesce((select profile_type from users where id = auth.uid()), '') <> 'casal'
  then
    return 'Esse perfil recebe mensagem de casais. Vocês podem se encontrar num evento — confirmando presença no mesmo, a conversa abre.';
  end if;

  return null;
end;
$$;

revoke execute on function public.recusa_de_conversa(uuid, boolean) from public, anon;
grant execute on function public.recusa_de_conversa(uuid, boolean) to authenticated, service_role;

-- ─── Conversa já existente: mensagem some nas duas direções ────────────────
-- Acrescenta ao insert de mensagens o impedimento de bloqueio. O suporte
-- continua liberado pelo ramo de is_support_channel já existente, e o
-- bloqueio não alcança o suporte (ninguém bloqueia o suporte pela UI).
drop policy if exists "messages insert participant" on messages;
create policy "messages insert participant" on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
    and not exists (
      select 1 from conversations c
      join users other_u on other_u.id = (
        case when c.user_a_id = auth.uid() then c.user_b_id else c.user_a_id end
      )
      where c.id = messages.conversation_id
        and other_u.is_support_channel = false
        and ha_bloqueio(auth.uid(), other_u.id)
    )
    and (
      has_contact_access(auth.uid())
      or exists (
        select 1 from conversations c
        join users other_u on other_u.id = (
          case when c.user_a_id = auth.uid() then c.user_b_id else c.user_a_id end
        )
        where c.id = messages.conversation_id and other_u.is_support_channel = true
      )
    )
  );

-- ─── Comunidade: bloqueado some da lista (soma-se a discreet/hidden) ────────
-- Idêntica à de 20260716000000; entrou só `and not ha_bloqueio(...)`.
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
      and not ha_bloqueio(auth.uid(), u.id)
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

revoke execute on function public.browse_verified_users(int, text, text, text) from public, anon;
grant execute on function public.browse_verified_users(int, text, text, text) to authenticated, service_role;

-- ─── Perfil por link: bloqueado não retorna nada ──────────────────────────
-- Idêntica à de 20260716000000; entrou só `and not ha_bloqueio(...)`. A tela
-- /perfil/[id] detecta à parte se fui EU que bloquei, pra mostrar o botão de
-- desbloquear em vez de "perfil não disponível".
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
    and is_verified(auth.uid())
    and not ha_bloqueio(auth.uid(), p_user_id);
$$;

revoke execute on function public.get_verified_profile(uuid) from public, anon;
grant execute on function public.get_verified_profile(uuid) to authenticated, service_role;

-- ─── Feed: posts de bloqueado somem (os meus continuam meus) ───────────────
-- Idêntica à de 20261126000000; entrou só `and not ha_bloqueio(...)` no ramo
-- dos posts de outros.
drop function if exists public.get_timeline(int);
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
  photo_path text,
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
    tp.photo_path,
    tp.event_id,
    e.title as event_title
  from timeline_posts tp
  join users u on u.id = tp.user_id
  left join profile_photos pp on pp.id = tp.photo_id
  left join events e on e.id = tp.event_id
  where is_verified(auth.uid())
    and (
      tp.user_id = auth.uid()
      or (
        u.verification_badge_id is not null
        and u.discreet_mode = false
        and u.hidden = false
        and not ha_bloqueio(auth.uid(), tp.user_id)
      )
    )
  order by tp.created_at desc
  limit p_limit;
$$;

revoke execute on function public.get_timeline(int) from public, anon;
grant execute on function public.get_timeline(int) to authenticated, service_role;

-- ─── Curtida/comentário do feed acompanham o post (mesma regra) ────────────
-- Idêntica à de 20261126160000; entrou só `and not ha_bloqueio(...)`.
create or replace function posso_ver_post(p_post uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_verified(auth.uid()) and exists (
    select 1
    from timeline_posts tp
    join users u on u.id = tp.user_id
    where tp.id = p_post
      and (
        tp.user_id = auth.uid()
        or (
          u.verification_badge_id is not null
          and u.discreet_mode = false
          and u.hidden = false
          and not ha_bloqueio(auth.uid(), tp.user_id)
        )
      )
  );
$$;

revoke execute on function public.posso_ver_post(uuid) from public, anon;
grant execute on function public.posso_ver_post(uuid) to authenticated, service_role;

-- ─── Match por afinidade: bloqueado não entra no ranking ───────────────────
-- Idêntica à de 20261125160000; entrou só `and not ha_bloqueio(...)`.
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
              ('chegando','ate_6_meses'),('ate_6_meses','chegando'),
              ('ate_6_meses','ate_5_anos'),('ate_5_anos','ate_6_meses'),
              ('ate_5_anos','mais_de_5_anos'),('mais_de_5_anos','ate_5_anos')
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
      and not ha_bloqueio(auth.uid(), u.id)
  )
  select id, name, profile_type, verification_badge_id, experience_level,
         avatar_path, score, shared_interests, shared_settings, same_pace
  from scored
  where score > 0
  order by score desc, name
  limit p_limit;
$$;

revoke execute on function public.affinity_matches(int) from public, anon;
grant execute on function public.affinity_matches(int) to authenticated, service_role;

commit;

-- Provas rápidas:
-- select count(*) as tabela from information_schema.tables where table_name='user_blocks';
-- select count(*) as funcoes from pg_proc where proname in ('ha_bloqueio','meus_bloqueados');
-- -- anon NÃO pode executar ha_bloqueio/meus_bloqueados (deve dar 0):
-- select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--   where n.nspname='public' and p.proname in ('ha_bloqueio','meus_bloqueados')
--     and has_function_privilege('anon', p.oid, 'EXECUTE');
