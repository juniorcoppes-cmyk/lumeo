-- Denúncia de usuário (pedido do fundador em 2026-07-14): botão no perfil
-- de outra pessoa, vai pra uma fila que só admin vê, pra decidir e agir.
create table user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users (id) on delete cascade,
  reported_id uuid not null references users (id) on delete cascade,
  reason text not null check (
    reason in ('spam', 'mensagem_ofensiva', 'conteudo_inadequado', 'assedio', 'perfil_falso', 'outro')
  ),
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reporter_id <> reported_id)
);

alter table user_reports enable row level security;

create policy "reports insert own"
  on user_reports for insert to authenticated
  with check (auth.uid() = reporter_id);

-- Quem denunciou só vê a própria denúncia (não é obrigatório, mas
-- consistente com o resto do app); admin vê tudo.
create policy "reports select own or admin"
  on user_reports for select to authenticated
  using (auth.uid() = reporter_id or is_admin());

create policy "reports update admin"
  on user_reports for update to authenticated
  using (is_admin());
