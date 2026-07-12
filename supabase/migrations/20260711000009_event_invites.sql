-- "Indicar evento para outra pessoa" (seção 2, funcionalidade 2): suporta
-- tanto indicar um usuário já cadastrado (invitee_id) quanto gerar um link
-- de convite compartilhável (invite_code), aceito depois por quem for.
create table event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  inviter_id uuid not null references users (id) on delete cascade,
  invitee_id uuid references users (id) on delete set null,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  status text not null default 'sent' check (status in ('sent', 'accepted')),
  created_at timestamptz not null default now()
);

alter table event_invites enable row level security;

create policy "invites insert own"
  on event_invites for insert to authenticated
  with check (auth.uid() = inviter_id);

create policy "invites select own"
  on event_invites for select to authenticated
  using (auth.uid() = inviter_id or auth.uid() = invitee_id);

-- Preview público (usado pela página /convite/[code], antes do login/cadastro):
-- expõe só o essencial do evento e o nome de quem indicou, nunca a linha crua.
create or replace function get_invite_preview(p_code text)
returns table (
  event_id uuid,
  event_title text,
  event_date timestamptz,
  location text,
  inviter_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select e.id, e.title, e.event_date, e.location, u.name
  from event_invites i
  join events e on e.id = i.event_id
  join users u on u.id = i.inviter_id
  where i.invite_code = p_code;
$$;

grant execute on function get_invite_preview(text) to anon, authenticated;

-- Vincula o convite a quem aceitou (se ainda não tinha invitee_id definido)
-- e marca como aceito. Retorna o event_id para redirecionar ao evento.
create or replace function accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  update event_invites
  set invitee_id = coalesce(invitee_id, auth.uid()), status = 'accepted'
  where invite_code = p_code
  returning event_id into v_event_id;

  if v_event_id is null then
    raise exception 'Convite inválido';
  end if;

  return v_event_id;
end;
$$;

grant execute on function accept_invite(text) to authenticated;
