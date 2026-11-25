-- Check-in no dia do evento + chat de grupo por evento.
--
-- LISTA DE PRESENÇA: cada convidado faz check-in no dia do evento (self
-- check-in), e o organizador vê a lista completa de quem chegou.
-- CHAT DE GRUPO: uma conversa por evento, aberta a todos os convidados
-- (quem se inscreveu, mesmo sem confirmar, ou quem foi indicado por selo),
-- pra começarem a interagir antes de se encontrarem.

begin;

-- ---------------------------------------------------------------------------
-- 1) CHECK-IN: marca de presença na inscrição
-- ---------------------------------------------------------------------------
alter table event_registrations
  add column if not exists checked_in_at timestamptz;

-- Quem está inscrito (não cancelado) faz o próprio check-in. Usuário não pode
-- dar UPDATE na tabela (só admin), então o check-in passa por esta função, que
-- ainda garante que só rola no dia do evento.
create or replace function check_in_event(p_event_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_date timestamptz;
  v_checked_in timestamptz;
begin
  select event_date into v_event_date from events where id = p_event_id;
  if v_event_date is null then
    raise exception 'Evento não encontrado';
  end if;

  -- Janela de check-in: de 12h antes do início até 8h depois. Cobre "o dia do
  -- evento" sem depender de fuso horário exato.
  if now() < v_event_date - interval '12 hours'
     or now() > v_event_date + interval '8 hours' then
    raise exception 'O check-in só fica disponível no dia do evento';
  end if;

  update event_registrations
     set checked_in_at = coalesce(checked_in_at, now())
   where event_id = p_event_id
     and user_id = auth.uid()
     and status <> 'cancelled'
   returning checked_in_at into v_checked_in;

  if v_checked_in is null then
    raise exception 'Você precisa estar inscrito no evento para fazer check-in';
  end if;

  return v_checked_in;
end;
$$;

-- Lista de presença completa — só o organizador (admin) enxerga.
create or replace function event_presence_list(p_event_id uuid)
returns table (
  user_id uuid,
  name text,
  verification_badge_id text,
  status text,
  checked_in_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.user_id, u.name, u.verification_badge_id, r.status, r.checked_in_at
    from event_registrations r
    join users u on u.id = r.user_id
   where r.event_id = p_event_id
     and r.status <> 'cancelled'
     and is_admin()
   order by (r.checked_in_at is null), r.checked_in_at desc, u.name;
$$;

-- ---------------------------------------------------------------------------
-- 2) CHAT DE GRUPO DO EVENTO
-- ---------------------------------------------------------------------------

-- "Convidado"/membro do grupo: quem está inscrito (qualquer status menos
-- cancelado) OU foi indicado por selo (event_invites.invitee_id).
create or replace function is_event_member(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from event_registrations r
     where r.event_id = p_event_id
       and r.user_id = p_user_id
       and r.status <> 'cancelled'
  ) or exists (
    select 1 from event_invites i
     where i.event_id = p_event_id
       and i.invitee_id = p_user_id
  );
$$;

create table if not exists event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists event_messages_event_idx
  on event_messages (event_id, created_at);

alter table event_messages enable row level security;

-- Ler: só membros do evento. Escrever: só membro, e só em nome próprio.
-- Editar/excluir: só a própria mensagem.
-- (drop antes do create pra migração poder rodar de novo sem falhar.)
drop policy if exists "event msgs select members" on event_messages;
drop policy if exists "event msgs insert members" on event_messages;
drop policy if exists "event msgs update own" on event_messages;

create policy "event msgs select members"
  on event_messages for select to authenticated
  using (is_event_member(event_id, auth.uid()));

create policy "event msgs insert members"
  on event_messages for insert to authenticated
  with check (sender_id = auth.uid() and is_event_member(event_id, auth.uid()));

create policy "event msgs update own"
  on event_messages for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Mensagens do grupo com o nome de quem enviou. Security definer pra montar o
-- nome sem esbarrar no RLS da tabela users; só devolve algo pra membro do
-- evento.
create or replace function event_group_messages(p_event_id uuid)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  content text,
  created_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select m.id, m.sender_id, u.name, m.content, m.created_at, m.edited_at, m.deleted_at
    from event_messages m
    join users u on u.id = m.sender_id
   where m.event_id = p_event_id
     and is_event_member(p_event_id, auth.uid())
   order by m.created_at asc;
$$;

commit;

-- Provas rápidas (devem retornar linhas):
-- select count(*) as col_checkin from information_schema.columns
--   where table_name='event_registrations' and column_name='checked_in_at';
-- select count(*) as tabela from information_schema.tables where table_name='event_messages';
-- select count(*) as funcoes from pg_proc
--   where proname in ('check_in_event','event_presence_list','is_event_member','event_group_messages');
