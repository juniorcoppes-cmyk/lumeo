-- Mensagem certa quando o contato está bloqueado (2026-07-16).
--
-- Decisão do fundador (opção B): o portão continua em dois estágios — padrinho
-- aceita e a pessoa NAVEGA; a ADM confirma e a pessoa CONVERSA. O problema era
-- a mensagem: quem estava `provisional` (acabou de entrar, esperando a
-- confirmação) lia "Seu período de teste gratuito acabou — assine um plano",
-- que é mentira: essa pessoa nunca teve teste e não precisa assinar nada,
-- precisa só da ADM confirmar. Achado com um tester real travado.
--
-- Centraliza o motivo numa função só, usada pelas RPCs e pelo app.

create or replace function contact_block_reason(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when has_contact_access(p_user_id) then null
    when (select membership_status from users where id = p_user_id) = 'provisional'
      then 'Seu cadastro está em análise final pela administração (até 48h). Assim que confirmarem, você já pode conversar — enquanto isso, aproveite pra completar seu perfil.'
    when (select membership_status from users where id = p_user_id) = 'pending_sponsor'
      then 'Seu acesso ainda depende do aceite de quem te convidou.'
    else 'Seu período de teste gratuito acabou — assine um plano para continuar entrando em contato com outros perfis.'
  end;
$$;

grant execute on function contact_block_reason(uuid) to authenticated;

-- Recria as duas RPCs de conversa usando o motivo certo (corpo idêntico ao da
-- 20260713000001, só troca a frase fixa).
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

  if not has_contact_access(auth.uid()) then
    raise exception '%', contact_block_reason(auth.uid());
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

  if not has_contact_access(auth.uid()) then
    raise exception '%', contact_block_reason(auth.uid());
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

grant execute on function start_conversation(uuid, uuid) to authenticated;
grant execute on function start_conversation_general(uuid) to authenticated;
