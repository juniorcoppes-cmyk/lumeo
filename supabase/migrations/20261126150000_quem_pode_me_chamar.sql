-- QUEM PODE ME CHAMAR.
--
-- A dor número um do público do Secret — casal iniciante, mulher, gente
-- tímida — é receber mensagem de quem não foi chamado. Mas a resposta não é
-- sim ou não: são TRÊS portas, e tratar isso como interruptor foi o erro da
-- primeira versão desta migração (que nem chegou a rodar).
--
--   'todos'    qualquer pessoa verificada pode puxar conversa
--   'casais'   só casais podem; solteiro não aborda  ← padrão de quem é casal
--   'ninguem'  ninguém abre conversa; o primeiro oi é sempre meu
--
-- POR QUE TRÊS. Com dois valores, "casal protegido por padrão" impedia casal
-- de chamar casal — os dois lados exigindo ser o primeiro, ninguém começa
-- nunca, e some o uso principal do app. A saída óbvia (liberar quando os
-- DOIS têm a trava) abre um buraco pior: bastaria o solteiro ligar a própria
-- trava para passar a abordar casais, e a proteção viraria um botão na mão
-- de quem a gente quer barrar. Com três portas nada disso acontece, porque o
-- que libera é SER casal, não ter ligado uma chave.
--
-- A coluna nasce nula e nulo não é 'todos': quer dizer "nunca mexi nisso", e
-- aí vale o padrão do tipo de perfil. Todo casal que entrar amanhã já chega
-- protegido, sem gatilho no cadastro; quem escolher manda no próprio perfil.

begin;

alter table users add column if not exists quem_pode_me_chamar text
  check (quem_pode_me_chamar in ('todos', 'casais', 'ninguem'));

comment on column users.quem_pode_me_chamar is
  'todos | casais | ninguem. Null = não escolheu: vale o padrão do tipo de perfil (casal -> casais).';

create or replace function porta_de_conversa(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select coalesce(
       u.quem_pode_me_chamar,
       case when u.profile_type = 'casal' then 'casais' else 'todos' end)
     from users u where u.id = p_user_id),
    'todos'
  );
$$;

revoke execute on function public.porta_de_conversa(uuid) from public, anon;
grant execute on function public.porta_de_conversa(uuid) to authenticated, service_role;

-- Barra quem está tentando abrir conversa com p_alvo, ou null se pode.
-- Fica numa função só para as duas portas do chat não divergirem.
--
-- `p_no_evento` é o que diferencia as duas portas, e a diferença é de
-- sentido, não de código:
--
--   'casais'  é proteção contra a ABORDAGEM FRIA — alguém que a pessoa nunca
--             viu, saído da lista da comunidade. Estar os dois confirmados no
--             mesmo evento não é frio: é o encontro que a própria mensagem
--             sugere, e as duas pessoas escolheram estar lá. Então o evento
--             libera.
--   'ninguem' é silêncio por decisão. Quem escolheu isso não pediu exceção
--             nenhuma, e o evento NÃO libera — senão a opção mais forte
--             seria a mais fácil de furar.
--
-- Liberar tudo dentro do evento seria mais simples e estaria errado: num
-- evento gratuito bastaria clicar em "vou" para furar a regra, e a proteção
-- viraria formalidade.
create or replace function recusa_de_conversa(p_alvo uuid, p_no_evento boolean default false)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_porta text;
begin
  -- O canal de suporte é sempre alcançável: ele é um perfil de casal e
  -- cairia na regra por acidente, deixando sem ninguém para chamar
  -- justamente quem precisa de ajuda.
  if coalesce((select is_support_channel from users where id = p_alvo), false) then
    return null;
  end if;

  v_porta := porta_de_conversa(p_alvo);

  if v_porta = 'ninguem' then
    return case
      when p_no_evento
        then 'Esse perfil prefere dar o primeiro oi. Aproveitem o evento para se conhecerem pessoalmente.'
      else 'Esse perfil prefere dar o primeiro oi. Vocês podem se encontrar num evento — e aí a conversa começa por lá.'
    end;
  end if;

  if v_porta = 'casais'
     and not p_no_evento
     and coalesce((select profile_type from users where id = auth.uid()), '') <> 'casal'
  then
    return 'Esse perfil recebe mensagem de casais. Vocês podem se encontrar num evento — confirmando presença no mesmo, a conversa abre.';
  end if;

  return null;
end;
$$;

revoke execute on function public.recusa_de_conversa(uuid, boolean) from public, anon;
grant execute on function public.recusa_de_conversa(uuid, boolean) to authenticated, service_role;

-- ─── As duas portas de entrada do chat ────────────────────────────────────
-- Idênticas às versões de 20260716000003; entrou só o bloco da recusa, e só
-- quando a conversa ainda NÃO existe: se o outro lado já abriu, a função
-- devolve a conversa de sempre e ninguém fica preso.

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
  v_recusa text;
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
    v_recusa := recusa_de_conversa(p_other_user_id);
    if v_recusa is not null then
      raise exception '%', v_recusa;
    end if;

    insert into conversations (event_id, user_a_id, user_b_id)
    values (null, v_user_a, v_user_b)
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

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
  v_recusa text;
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
    v_recusa := recusa_de_conversa(p_other_user_id, true);
    if v_recusa is not null then
      raise exception '%', v_recusa;
    end if;

    insert into conversations (event_id, user_a_id, user_b_id)
    values (p_event_id, v_user_a, v_user_b)
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

grant execute on function start_conversation(uuid, uuid) to authenticated;
grant execute on function start_conversation_general(uuid) to authenticated;

commit;
