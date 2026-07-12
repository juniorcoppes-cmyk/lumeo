-- Integração de pagamento (Asaas). CPF e o id do customer no Asaas ficam numa
-- tabela separada de `users` — de propósito: `users` já tem policies mais
-- amplas (busca por selo, participante de conversa) que dão visibilidade de
-- LINHA a outros usuários, e RLS no Postgres é por linha, não por coluna.
-- Colocar dado sensível de cobrança ali vazaria CPF para quem só deveria ver
-- nome/selo. `billing_profiles` só é visível ao próprio dono.
create table billing_profiles (
  user_id uuid primary key references users (id) on delete cascade,
  cpf_cnpj text not null,
  asaas_customer_id text unique,
  created_at timestamptz not null default now()
);

alter table billing_profiles enable row level security;

create policy "billing select own"
  on billing_profiles for select to authenticated
  using (auth.uid() = user_id);

create policy "billing insert own"
  on billing_profiles for insert to authenticated
  with check (auth.uid() = user_id);

create policy "billing update own"
  on billing_profiles for update to authenticated
  using (auth.uid() = user_id);

-- Preço do evento (a especificação original não previa, mas "vender
-- inscrição" exige saber quanto cobrar).
alter table events add column if not exists price numeric(10, 2) not null default 0 check (price >= 0);

-- Vínculo com a cobrança recorrente/avulsa no Asaas. payment_url é salvo na
-- criação (cobrança avulsa de evento não muda de link, ao contrário da
-- assinatura, cujo link é buscado sob demanda pois muda a cada ciclo).
alter table subscriptions add column if not exists asaas_subscription_id text unique;
alter table event_registrations add column if not exists asaas_payment_id text unique;
alter table event_registrations add column if not exists payment_url text;

-- Idempotência de webhook: Asaas garante "at least once", não "exactly once".
create table payment_webhook_events (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table payment_webhook_events enable row level security;
-- Sem policies: só a service role (usada exclusivamente pelo endpoint de
-- webhook, nunca por um client autenticado comum) escreve/lê aqui.

-- events_with_open_slots (migração 000004) precisa passar a incluir o preço.
-- Postgres não permite mudar o tipo de retorno via CREATE OR REPLACE
-- (erro 42P13) — precisa dropar a função antes de recriá-la.
drop function if exists events_with_open_slots();

create or replace function events_with_open_slots()
returns table (
  id uuid,
  title text,
  event_date timestamptz,
  location text,
  capacity int,
  price numeric,
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
    count(r.id) filter (where r.status = 'confirmed') as confirmed_count
  from events e
  left join event_registrations r on r.event_id = e.id
  group by e.id
  order by e.event_date;
$$;
