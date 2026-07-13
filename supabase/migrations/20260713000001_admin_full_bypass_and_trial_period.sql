-- Ajustes pedidos pelo fundador em 2026-07-13 (segunda rodada).

-- 1) ADM deixa de precisar de verificação em QUALQUER lugar do app (antes só
-- tinha o bypass específico de get_timeline, na migração anterior). is_verified()
-- é usada em Comunidade, álbum, avaliações, conexões, chat geral, avatar,
-- geolocalização, timeline — todos passam a valer pra admin automaticamente.
-- Perfil "ADM" também vira admin de verdade (is_admin = true, feito à parte
-- via script, não aqui — é estado de conta, não schema) para poder criar/
-- editar/excluir eventos.
create or replace function is_verified(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from users
    where id = p_user_id
      and (verification_badge_id is not null or is_admin)
  );
$$;

-- 2) Período de teste de 1 semana a partir da aprovação da verificação;
-- depois disso, só quem tem assinatura paga ativa (ou em carência de 2 dias,
-- mesma regra de src/lib/subscription.ts) mantém acesso a "contato direto"
-- (iniciar conversa nova / mandar mensagem nova). Comunidade, linha do tempo
-- e perfis continuam visíveis mesmo depois do teste — a restrição é só de
-- contato, por decisão explícita do fundador. Suporte (contact_admin e
-- conversas com quem tem is_support_channel) nunca é bloqueado — mesma
-- lógica que já deixa até não-verificados contatarem o suporte.
create or replace function has_contact_access(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce((select is_admin or is_support_channel from users where id = p_user_id), false)
    or exists (
      select 1 from verifications v
      where v.user_id = p_user_id
        and v.status = 'approved'
        and v.reviewed_at > now() - interval '7 days'
    )
    or exists (
      select 1 from subscriptions s
      where s.user_id = p_user_id
        and (
          s.status = 'active'
          or (s.status = 'overdue' and s.overdue_since is not null and now() < s.overdue_since + interval '2 days')
        )
    );
$$;

grant execute on function has_contact_access(uuid) to authenticated;

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
    raise exception 'Seu período de teste gratuito acabou — assine um plano para continuar entrando em contato com outros perfis.';
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
    raise exception 'Seu período de teste gratuito acabou — assine um plano para continuar entrando em contato com outros perfis.';
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

-- Enviar mensagem numa conversa já existente também exige contato ativo,
-- exceto se for uma conversa com o canal de suporte (nunca bloqueado).
drop policy if exists "messages insert participant" on messages;

create policy "messages insert participant" on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
    and (
      has_contact_access(auth.uid())
      or exists (
        select 1 from conversations c
        join users other_u on other_u.id = (
          case when c.user_a_id = auth.uid() then c.user_b_id else c.user_a_id end
        )
        where c.id = messages.conversation_id and other_u.is_support_channel = true
      )
    )
  );
