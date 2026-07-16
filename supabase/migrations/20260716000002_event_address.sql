-- Endereço do evento (pedido do fundador 2026-07-16): campo novo, separado do
-- "Local" (location). Opcional. Só admin escreve (policies de events já são
-- admin-only); qualquer autenticado lê (events já é legível).
alter table events add column address text;

-- events_with_open_slots (usada em /eventos) passa a retornar o address.
-- Precisa dropar antes: mudar o tipo de retorno não dá via create or replace.
drop function if exists events_with_open_slots();
create or replace function events_with_open_slots()
returns table (
  id uuid,
  title text,
  event_date timestamptz,
  location text,
  address text,
  capacity int,
  price numeric,
  plus_price numeric,
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
    e.address,
    e.capacity,
    e.price,
    e.plus_price,
    e.description,
    e.photo_landscape_path,
    count(r.id) filter (where r.status = 'confirmed') as confirmed_count
  from events e
  left join event_registrations r on r.event_id = e.id
  group by e.id
  order by e.event_date;
$$;

grant execute on function events_with_open_slots() to authenticated;
