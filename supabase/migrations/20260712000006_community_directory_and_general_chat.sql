-- Aba "Comunidade": descoberta de usuários verificados da plataforma,
-- independente de estarem confirmados no mesmo evento (pedido do fundador,
-- para poder "puxar assunto" com quem está no site). Isso muda o modelo de
-- conversas, que até aqui só existiam por evento em comum (ver
-- 20260711000006_chat.sql) — precisa permitir conversa sem evento.

alter table conversations alter column event_id drop not null;

-- `unique (event_id, user_a_id, user_b_id)` não deduplica quando event_id é
-- null (Postgres trata cada NULL como distinto) — índice parcial cobre esse
-- caso especificamente para conversas gerais.
create unique index if not exists conversations_general_unique
  on conversations (user_a_id, user_b_id)
  where event_id is null;

-- Lista para a aba Comunidade: todo usuário verificado, exceto quem ativou
-- "modo de navegação discreta" (campo já existia, sem uso até agora) e o
-- próprio usuário. Security definer para não precisar abrir o RLS de
-- `users` de forma geral — e-mail continua privado, só os campos abaixo
-- saem da função.
create or replace function browse_verified_users()
returns table (id uuid, name text, profile_type text, verification_badge_id text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.name, u.profile_type, u.verification_badge_id
  from users u
  where u.verification_badge_id is not null
    and u.discreet_mode = false
    and u.id <> auth.uid()
    and is_verified(auth.uid());
$$;

grant execute on function browse_verified_users() to authenticated;

-- Perfil público básico de outro usuário verificado, usado por /perfil/[id]
-- (antes dependia do RLS "users select conversation partner", que só
-- cobria quem já tinha conversa em comum — não serve mais, já que a
-- Comunidade permite achar qualquer verificado antes de conversar).
create or replace function get_verified_profile(p_user_id uuid)
returns table (name text, profile_type text, verification_badge_id text)
language sql
security definer
set search_path = public
stable
as $$
  select u.name, u.profile_type, u.verification_badge_id
  from users u
  where u.id = p_user_id
    and u.verification_badge_id is not null
    and is_verified(auth.uid());
$$;

grant execute on function get_verified_profile(uuid) to authenticated;

-- Inicia (ou retorna) uma conversa geral entre dois verificados, sem
-- depender de estarem confirmados no mesmo evento — mesmo padrão de
-- start_conversation, só sem a checagem de event_registrations.
create or replace function start_conversation_general(p_other_user_id uuid)
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
  if auth.uid() = p_other_user_id then
    raise exception 'Não é possível conversar consigo mesmo';
  end if;

  if not is_verified(auth.uid()) then
    raise exception 'Você precisa estar verificado para iniciar conversas';
  end if;

  if not is_verified(p_other_user_id) then
    raise exception 'Esse usuário não está verificado';
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
  where event_id is null and user_a_id = v_user_a and user_b_id = v_user_b;

  if v_conversation_id is null then
    insert into conversations (event_id, user_a_id, user_b_id)
    values (null, v_user_a, v_user_b)
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

grant execute on function start_conversation_general(uuid) to authenticated;
