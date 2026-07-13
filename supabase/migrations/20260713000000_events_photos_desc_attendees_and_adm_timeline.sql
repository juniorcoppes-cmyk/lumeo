-- Ajustes pedidos pelo fundador em 2026-07-13.

-- 1) ADM (canal de suporte) travado na linha do tempo por não ser
-- verificado (by design — nunca passa pelo fluxo de verificação).
-- get_timeline() filtra por is_verified(caller), a mesma função usada em
-- Comunidade/álbum/avaliações/conexões — não deve mudar globalmente só
-- para o ADM (viraria "verificado" em todo lugar). Libera especificamente
-- aqui para admin/suporte, sem tocar is_verified().
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
  where (
    is_verified(auth.uid())
    or exists (
      select 1 from users v
      where v.id = auth.uid() and (v.is_admin or v.is_support_channel)
    )
  )
  and (
    tp.user_id = auth.uid()
    or (u.verification_badge_id is not null and u.discreet_mode = false)
  )
  order by tp.created_at desc
  limit p_limit;
$$;

grant execute on function get_timeline(int) to authenticated;

-- 2) Eventos: descrição + até 2 fotos (story para celular, paisagem para
-- desktop). Criação/edição já é admin-only (ver "events insert/update
-- admin" em 20260711000005_admin_policies.sql) — não precisa de policy nova
-- na tabela `events`, só no bucket de storage novo.
alter table events add column description text;
alter table events add column photo_story_path text;
alter table events add column photo_landscape_path text;

-- Bucket separado do de perfil: não é conteúdo por usuário, é material do
-- evento em si. Privado (como todo o resto do app) mas com select liberado
-- pra qualquer autenticado, já que /eventos é navegável por qualquer
-- logado (só a inscrição exige selo de verificação, não a listagem).
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', false)
on conflict (id) do nothing;

create policy "event photos bucket admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-photos' and is_admin());

-- upsert (substituir foto de um evento já criado) precisa de update além
-- de insert — mesma lição de storage+upsert já documentada no AGENTS.md.
create policy "event photos bucket admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'event-photos' and is_admin())
  with check (bucket_id = 'event-photos' and is_admin());

create policy "event photos bucket admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and is_admin());

create policy "event photos bucket select any authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'event-photos');

-- events_with_open_slots precisa expor description/foto agora que a
-- listagem passa a mostrar uma prévia. Postgres não deixa mudar o tipo de
-- retorno via CREATE OR REPLACE (erro 42P13) — precisa dropar antes.
drop function if exists events_with_open_slots();

create or replace function events_with_open_slots()
returns table (
  id uuid,
  title text,
  event_date timestamptz,
  location text,
  capacity int,
  price numeric,
  description text,
  photo_landscape_path text,
  confirmed_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.title,
    e.event_date,
    e.location,
    e.capacity,
    e.price,
    e.description,
    e.photo_landscape_path,
    count(r.id) filter (where r.status = 'confirmed') as confirmed_count
  from events e
  left join event_registrations r on r.event_id = e.id
  group by e.id
  order by e.event_date;
$$;

grant execute on function events_with_open_slots() to authenticated;

-- 3) Lista de presença no evento: reaproveita confirmed_attendees_for_event,
-- que já restringe a leitura a quem também está confirmado no mesmo evento
-- (não expõe a lista pra quem só está navegando/não confirmou) — só
-- adiciona avatar/selo de experiência pra ficar consistente com o resto do
-- app (Comunidade, chat, linha do tempo já mostram isso).
drop function if exists confirmed_attendees_for_event(uuid);

create or replace function confirmed_attendees_for_event(p_event_id uuid)
returns table (
  id uuid,
  name text,
  verification_badge_id text,
  experience_level text,
  avatar_path text
)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.name, u.verification_badge_id, u.experience_level, u.avatar_path
  from event_registrations self
  join event_registrations other
    on other.event_id = self.event_id and other.status = 'confirmed'
  join users u on u.id = other.user_id
  where self.event_id = p_event_id
    and self.user_id = auth.uid()
    and self.status = 'confirmed'
    and other.user_id <> auth.uid();
$$;

grant execute on function confirmed_attendees_for_event(uuid) to authenticated;
