-- Linha do tempo (pedido do fundador, 2026-07-12): posts de texto do
-- usuário + eventos automáticos (nova foto no álbum, confirmação de
-- presença em evento), visíveis para todo verificado não-discreto (mesma
-- regra de visibilidade da Comunidade — quem ativa discreet_mode também
-- some da linha do tempo dos outros, mas continua vendo a própria).
create table timeline_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null check (type in ('text', 'photo_corpo', 'photo_rosto', 'event_confirmed')),
  content text,
  photo_id uuid references profile_photos (id) on delete cascade,
  event_id uuid references events (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint text_requires_content check (type <> 'text' or content is not null),
  constraint photo_requires_photo_id
    check (type not in ('photo_corpo', 'photo_rosto') or photo_id is not null),
  constraint event_requires_event_id check (type <> 'event_confirmed' or event_id is not null)
);

alter table timeline_posts enable row level security;

-- Só posts de texto manuais passam por RLS de usuário comum; os
-- automáticos (foto/evento) são criados pelos triggers abaixo, que são
-- security definer e não dependem de policy de insert.
create policy "timeline_posts insert own text"
  on timeline_posts for insert to authenticated
  with check (auth.uid() = user_id and type = 'text');

create policy "timeline_posts delete own text"
  on timeline_posts for delete to authenticated
  using (auth.uid() = user_id and type = 'text');

-- Sem policy de select: a leitura da linha do tempo (de todo mundo) passa
-- pela RPC get_timeline() abaixo, que já decide o que cada usuário pode ver
-- num único lugar — evita reproduzir em RLS a mesma classe de bug de
-- indireção que apareceu nas policies de storage do álbum de fotos.

create or replace function timeline_post_on_photo_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into timeline_posts (user_id, type, photo_id)
  values (
    new.user_id,
    case when new.category = 'rosto' then 'photo_rosto' else 'photo_corpo' end,
    new.id
  );
  return new;
end;
$$;

create trigger on_profile_photo_created
  after insert on profile_photos
  for each row execute function timeline_post_on_photo_insert();

create or replace function timeline_post_on_registration_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    insert into timeline_posts (user_id, type, event_id)
    values (new.user_id, 'event_confirmed', new.event_id);
  end if;
  return new;
end;
$$;

create trigger on_registration_confirmed
  after update on event_registrations
  for each row execute function timeline_post_on_registration_confirmed();

-- Feed único: junta autor, foto (com um booleano "posso ver essa foto
-- agora", calculado aqui mesmo, sem depender de RLS aninhado) e evento.
create or replace function get_timeline(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  author_name text,
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
    tp.type,
    tp.content,
    tp.created_at,
    tp.photo_id,
    pp.category as photo_category,
    pp.storage_path as photo_storage_path,
    case
      when pp.category = 'corpo' then true
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
