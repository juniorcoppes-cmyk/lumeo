-- Lumeo MVP v1 — schema inicial (ver seção 5 do documento de especificação)

create extension if not exists "pgcrypto";

-- USERS -----------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid() references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  profile_type text not null check (profile_type in ('individual', 'casal')),
  verification_badge_id text unique,
  discreet_mode boolean not null default false,
  referred_by uuid references users (id),
  created_at timestamptz not null default now()
);

-- VERIFICATIONS -----------------------------------------------------------
-- document_url e video_url são dados sensíveis: bucket separado + RLS (seção 7).
create table verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  document_url text not null,
  video_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint rejection_reason_required check (
    status <> 'rejected' or rejection_reason is not null
  )
);

-- EVENTS ------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date timestamptz not null,
  location text not null,
  capacity int not null check (capacity > 0),
  created_at timestamptz not null default now()
);

-- EVENT_REGISTRATIONS ------------------------------------------------------
create table event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- CONVERSATIONS -------------------------------------------------------------
-- Só deve existir quando ambos os usuários estão confirmados no mesmo evento (regra aplicada na camada de aplicação).
create table conversations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_a_id uuid not null references users (id) on delete cascade,
  user_b_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a_id <> user_b_id),
  unique (event_id, user_a_id, user_b_id)
);

-- MESSAGES ------------------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now()
);

-- SUBSCRIPTIONS ---------------------------------------------------------------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users (id) on delete cascade,
  plan text not null check (plan in ('essencial', 'plus')),
  status text not null default 'active',
  renewed_at timestamptz
);

-- ROW LEVEL SECURITY ------------------------------------------------------

alter table users enable row level security;
alter table verifications enable row level security;
alter table events enable row level security;
alter table event_registrations enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table subscriptions enable row level security;

-- users: cada um lê/edita o próprio perfil
create policy "users select own" on users for select using (auth.uid() = id);
create policy "users update own" on users for update using (auth.uid() = id);

-- verifications: usuário só vê/insere as próprias; aprovação é feita via service role (admin) fora do RLS de usuário comum
create policy "verifications select own" on verifications for select using (auth.uid() = user_id);
create policy "verifications insert own" on verifications for insert with check (auth.uid() = user_id);

-- events: leitura pública para usuários autenticados
create policy "events select authenticated" on events for select using (auth.role() = 'authenticated');

-- event_registrations: usuário só vê/gerencia as próprias inscrições
create policy "registrations select own" on event_registrations for select using (auth.uid() = user_id);
create policy "registrations insert own" on event_registrations for insert with check (auth.uid() = user_id);

-- conversations: apenas os dois participantes enxergam a conversa
create policy "conversations select participant" on conversations for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- messages: apenas participantes da conversa leem/enviam
create policy "messages select participant" on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );
create policy "messages insert participant" on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

-- subscriptions: usuário só vê a própria assinatura
create policy "subscriptions select own" on subscriptions for select using (auth.uid() = user_id);
