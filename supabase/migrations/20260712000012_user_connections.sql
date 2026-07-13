-- Conexões entre perfis (pedido do fundador, 2026-07-12): quando um perfil
-- "conhece" outro, pode propor um nível de conexão (amigos sociais,
-- íntimos ou virtuais); só passa a valer quando o outro lado aprova —
-- mesmo padrão de photo_access_requests, reaproveitado de propósito.
-- Decisão de privacidade (discutida no chat): a conexão aprovada só é
-- visível pros dois envolvidos, nunca publicamente.
create table user_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users (id) on delete cascade,
  target_id uuid not null references users (id) on delete cascade,
  connection_type text not null
    check (connection_type in ('amigos_sociais', 'amigos_intimos', 'amigos_virtuais')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> target_id),
  unique (requester_id, target_id)
);

alter table user_connections enable row level security;

create policy "connections select own"
  on user_connections for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = target_id);

create policy "connections insert own"
  on user_connections for insert to authenticated
  with check (
    auth.uid() = requester_id
    and is_verified(auth.uid())
    and is_verified(target_id)
  );

create policy "connections update target"
  on user_connections for update to authenticated
  using (auth.uid() = target_id);
