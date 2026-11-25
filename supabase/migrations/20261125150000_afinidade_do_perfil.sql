-- Camada de afinidade "social e leve" do Secret: interesses/vibe, ritmo e
-- ambiente preferido. Alimenta o match por compatibilidade. Adiciona SÓ o que
-- o perfil ainda não tem — "quem você procura" (users.looking_for), nível de
-- experiência e orientação já existem e o match reaproveita. Um conjunto de
-- respostas por perfil. Dados sociais, não sensíveis.

begin;

create table if not exists profile_affinity (
  user_id uuid primary key references users (id) on delete cascade,
  interests text[] not null default '{}',
  pace text,
  settings text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table profile_affinity enable row level security;

-- O dono escreve e lê a própria afinidade.
drop policy if exists "affinity insert own" on profile_affinity;
drop policy if exists "affinity update own" on profile_affinity;
drop policy if exists "affinity select all" on profile_affinity;

create policy "affinity insert own"
  on profile_affinity for insert to authenticated
  with check (user_id = auth.uid());

create policy "affinity update own"
  on profile_affinity for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Qualquer usuário logado lê a afinidade dos outros — são dados sociais
-- (interesses, o que busca), feitos pra aparecer no perfil e no match. Quem
-- aparece na busca já é filtrado pelas regras de verificação/visibilidade.
create policy "affinity select all"
  on profile_affinity for select to authenticated
  using (true);

commit;

-- Prova rápida (deve voltar 1):
-- select count(*) from information_schema.tables where table_name = 'profile_affinity';
