-- Descobre outros confirmados no mesmo evento (sem ampliar o RLS de
-- event_registrations, que hoje só expõe as inscrições do próprio usuário).
create or replace function confirmed_attendees_for_event(p_event_id uuid)
returns table (id uuid, name text, verification_badge_id text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.name, u.verification_badge_id
  from event_registrations self
  join event_registrations other
    on other.event_id = self.event_id and other.status = 'confirmed'
  join users u on u.id = other.user_id
  where self.event_id = p_event_id
    and self.user_id = auth.uid()
    and self.status = 'confirmed'
    and other.user_id <> auth.uid();
$$;

grant execute on function confirmed_attendees_for_event(uuid) to authenticated;

-- Cria (ou retorna, se já existir) a conversa entre dois confirmados no mesmo
-- evento. Só existe como consequência de ambos estarem confirmados (seção 4.3).
create or replace function start_conversation(p_event_id uuid, p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
begin
  if not exists (
    select 1 from event_registrations
    where event_id = p_event_id and user_id = auth.uid() and status = 'confirmed'
  ) then
    raise exception 'Você não está confirmado neste evento';
  end if;

  if not exists (
    select 1 from event_registrations
    where event_id = p_event_id and user_id = p_other_user_id and status = 'confirmed'
  ) then
    raise exception 'O outro usuário não está confirmado neste evento';
  end if;

  if auth.uid() < p_other_user_id then
    v_user_a := auth.uid();
    v_user_b := p_other_user_id;
  else
    v_user_a := p_other_user_id;
    v_user_b := auth.uid();
  end if;

  select id into v_conversation_id
  from conversations
  where event_id = p_event_id and user_a_id = v_user_a and user_b_id = v_user_b;

  if v_conversation_id is null then
    insert into conversations (event_id, user_a_id, user_b_id)
    values (p_event_id, v_user_a, v_user_b)
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

grant execute on function start_conversation(uuid, uuid) to authenticated;

-- Permite exibir o nome de quem está do outro lado de uma conversa já existente
-- (sem isso, "users select own" bloquearia a listagem de /chat).
create policy "users select conversation partner"
  on users for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where (c.user_a_id = auth.uid() and c.user_b_id = users.id)
         or (c.user_b_id = auth.uid() and c.user_a_id = users.id)
    )
  );
