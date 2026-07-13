-- Desconto Plus e "lista VIP" pra evento lotado (pedido do fundador em
-- 2026-07-13, terceira rodada). Decisão: desconto é definido por evento
-- (não um percentual fixo global) — o admin escolhe se um evento tem preço
-- especial pra Plus e qual o valor, ao criar/editar. "Lista VIP" não é uma
-- fila automática separada: o app já funciona com o admin confirmando
-- manualmente cada inscrição (não há auto-confirmação por capacidade), então
-- "furar fila" significa mostrar o plano de quem se inscreveu e ordenar
-- Plus primeiro na lista de pendentes — o admin já é quem decide quem entra
-- quando abre uma vaga.

alter table events add column plus_price numeric;

-- Sem policy de admin pra ler assinatura alheia até agora (só "select own").
-- Necessário pra /admin/eventos mostrar o plano de cada inscrito.
create policy "subscriptions select admin" on subscriptions for select to authenticated using (is_admin());

-- events_with_open_slots e o select direto em /eventos/[id] passam a expor
-- plus_price também (mesmo padrão de description/photo_landscape_path).
drop function if exists events_with_open_slots();

create or replace function events_with_open_slots()
returns table (
  id uuid,
  title text,
  event_date timestamptz,
  location text,
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
