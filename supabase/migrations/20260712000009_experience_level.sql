-- Selo de experiência no meio liberal (pedido do fundador, 2026-07-12):
-- preenchido no cadastro, editável depois em /perfil. Nullable porque
-- usuários já existentes não têm valor — só passa a ser exigido no
-- formulário de cadastro daqui pra frente, não via constraint no banco.
alter table users add column experience_level text
  check (experience_level in ('iniciante', 'iniciado', 'experiente'));

-- handle_new_user precisa copiar o novo campo do metadata do signup.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, profile_type, experience_level, referred_by)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'profile_type', 'individual'),
    new.raw_user_meta_data ->> 'experience_level',
    nullif(new.raw_user_meta_data ->> 'referred_by', '')::uuid
  );
  return new;
end;
$$;

-- As RPCs que já expõem nome/perfil/selo de verificação de outro usuário
-- passam a expor também o selo de experiência, pro ícone aparecer em
-- qualquer lugar que já mostra identificação (Comunidade, perfil, linha do
-- tempo).
create or replace function browse_verified_users()
returns table (
  id uuid,
  name text,
  profile_type text,
  verification_badge_id text,
  experience_level text
)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.name, u.profile_type, u.verification_badge_id, u.experience_level
  from users u
  where u.verification_badge_id is not null
    and u.discreet_mode = false
    and u.id <> auth.uid()
    and is_verified(auth.uid());
$$;

grant execute on function browse_verified_users() to authenticated;

create or replace function get_verified_profile(p_user_id uuid)
returns table (
  name text,
  profile_type text,
  verification_badge_id text,
  experience_level text
)
language sql
security definer
set search_path = public
stable
as $$
  select u.name, u.profile_type, u.verification_badge_id, u.experience_level
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
