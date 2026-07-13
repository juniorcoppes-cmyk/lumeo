-- Canal direto com a administração (pedido do fundador, 2026-07-12): conta
-- fixa "ADM" que qualquer usuário consegue contatar. Diferente da
-- Comunidade/chat geral (que exige os dois verificados), aqui só é exigido
-- estar autenticado — inclui, de propósito, quem ainda não foi verificado
-- (ex.: dúvida sobre verificação reprovada).
alter table users add column is_support_channel boolean not null default false;

create or replace function contact_admin()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_conversation_id uuid;
begin
  select id into v_admin_id from users where is_support_channel = true limit 1;

  if v_admin_id is null then
    raise exception 'Canal de suporte não configurado';
  end if;

  if auth.uid() = v_admin_id then
    raise exception 'Não é possível contatar a si mesmo';
  end if;

  if auth.uid() < v_admin_id then
    v_user_a := auth.uid();
    v_user_b := v_admin_id;
  else
    v_user_a := v_admin_id;
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

grant execute on function contact_admin() to authenticated;
