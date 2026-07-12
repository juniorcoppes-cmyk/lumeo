-- RPC que expõe apenas a contagem agregada de confirmados por evento.
-- Evita ampliar o RLS de event_registrations (que hoje só permite a cada
-- usuário ver as próprias inscrições) só para calcular vagas restantes.

create or replace function events_with_open_slots()
returns table (
  id uuid,
  title text,
  event_date timestamptz,
  location text,
  capacity int,
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
    count(r.id) filter (where r.status = 'confirmed') as confirmed_count
  from events e
  left join event_registrations r on r.event_id = e.id
  group by e.id
  order by e.event_date;
$$;

grant execute on function events_with_open_slots() to authenticated;
