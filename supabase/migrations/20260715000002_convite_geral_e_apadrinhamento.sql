-- Reestruturação do cadastro (pedido do fundador em 2026-07-15): cadastro
-- direto sai do ar, só existe via convite geral de um usuário já validado.
-- Sem documento/vídeo — validação vira social, em duas etapas: (1) o
-- padrinho (quem convidou) aceita ou recusa apadrinhar o novo perfil, o que
-- já libera acesso completo na hora; (2) a ADM confirma em até 48h,
-- efetivando a associação ("membro efetivo") ou revogando.
--
-- A tabela `verifications` (documento/vídeo) e as páginas
-- /cadastro/documento, /cadastro/video, /cadastro/padrinho não são
-- apagadas — só deixam de ser usadas pelo fluxo de cadastro novo, pra não
-- perder histórico nem arriscar quebrar algo à toa. Reaproveitamos
-- `verification_badge_id` como o mesmo gate de acesso que já existe em
-- toda a aplicação (Comunidade, linha do tempo, eventos etc.) — só muda
-- QUANDO e COMO ele é concedido, nenhuma das ~10 páginas que já checam
-- `verification_badge_id` precisa mudar.

-- 1) Convites gerais de plataforma (distintos dos convites de evento em
-- `event_invites`, que continuam existindo pra esse fim específico).
create table platform_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references users (id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  used_by uuid references users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table platform_invites enable row level security;

create policy "platform_invites select own" on platform_invites
  for select to authenticated
  using (auth.uid() = inviter_id);

-- Só usuário já validado pode gerar convite -- é ele quem vira padrinho.
create policy "platform_invites insert own" on platform_invites
  for insert to authenticated
  with check (auth.uid() = inviter_id and is_verified(auth.uid()));

-- Preview público (chamado sem sessão, na página /cadastro/dados) --
-- confirma se o código é válido e ainda não foi usado, sem expor a linha
-- crua nem quem já usou.
create or replace function get_platform_invite_preview(p_code text)
returns table (inviter_id uuid, inviter_name text, valid boolean)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.name, (pi.used_by is null and is_verified(u.id))
  from platform_invites pi
  join users u on u.id = pi.inviter_id
  where pi.invite_code = p_code;
$$;

grant execute on function get_platform_invite_preview(text) to anon, authenticated;

-- 2) Estado de associação. `pending_sponsor` = esperando o padrinho decidir
-- (sem verification_badge_id, bloqueado pelos gates que já existem);
-- `provisional` = padrinho aceitou, badge concedido, acesso liberado,
-- esperando a ADM confirmar em até 48h (contadas a partir de
-- `sponsor_responded_at`); `member` = ADM confirmou, associação efetiva;
-- `rejected_by_sponsor`/`rejected_by_admin` = acesso negado (sem badge).
alter table users add column membership_status text not null default 'member'
  check (membership_status in (
    'pending_sponsor', 'provisional', 'member', 'rejected_by_sponsor', 'rejected_by_admin'
  ));
alter table users add column sponsor_responded_at timestamptz;
alter table users add column member_since timestamptz;
alter table users add column preferred_plan text references plans (id);

-- Backfill: quem já tinha selo antes desta mudança já é membro efetivo de
-- verdade -- member_since vira a data de criação da conta, já que não
-- temos um marco melhor pra essas contas antigas.
update users set member_since = created_at where verification_badge_id is not null;

-- 3) Colunas sensíveis novas (controlam acesso) -- entram no mesmo
-- guard-rail das outras, senão um usuário comum poderia se auto-promover
-- a "member" ou se auto-atribuir um padrinho via chamada direta à API.
-- Mesma classe de vulnerabilidade já corrigida antes, ver "Correção de
-- segurança crítica" no AGENTS.md.
create or replace function protect_sensitive_user_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() or auth.role() = 'service_role'
    or current_setting('lumeo.bypass_sensitive_guard', true) = 'true'
  then
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'Não é permitido alterar is_admin diretamente';
  end if;

  if new.verification_badge_id is distinct from old.verification_badge_id then
    raise exception 'Não é permitido alterar verification_badge_id diretamente';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Não é permitido alterar email diretamente';
  end if;

  if new.referred_by is distinct from old.referred_by then
    raise exception 'Não é permitido alterar referred_by diretamente';
  end if;

  if new.subscription_exempt is distinct from old.subscription_exempt then
    raise exception 'Não é permitido alterar subscription_exempt diretamente';
  end if;

  if new.subscription_exempt_until is distinct from old.subscription_exempt_until then
    raise exception 'Não é permitido alterar subscription_exempt_until diretamente';
  end if;

  if new.membership_status is distinct from old.membership_status then
    raise exception 'Não é permitido alterar membership_status diretamente';
  end if;

  if new.sponsor_responded_at is distinct from old.sponsor_responded_at then
    raise exception 'Não é permitido alterar sponsor_responded_at diretamente';
  end if;

  if new.member_since is distinct from old.member_since then
    raise exception 'Não é permitido alterar member_since diretamente';
  end if;

  return new;
end;
$$;

-- 4) Cadastro via convite: handle_new_user() passa a resolver o padrinho a
-- partir do código de convite (não mais de um `referred_by` cru vindo do
-- metadata, que nunca foi preenchido de verdade por nenhuma tela) e marcar
-- o convite como usado, tudo atomicamente na mesma trigger.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_code text;
  v_inviter_id uuid;
begin
  v_code := nullif(new.raw_user_meta_data ->> 'platform_invite_code', '');

  if v_code is not null then
    select inviter_id into v_inviter_id
    from platform_invites
    where invite_code = v_code and used_by is null;
  end if;

  insert into public.users (
    id, name, email, profile_type, experience_level, referred_by,
    pending_invite_code, membership_status, preferred_plan
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'profile_type', 'individual'),
    new.raw_user_meta_data ->> 'experience_level',
    v_inviter_id,
    nullif(new.raw_user_meta_data ->> 'invite_code', ''),
    -- Nega por padrão: sem convite válido, fica bloqueado (sem badge) do
    -- mesmo jeito que quem tem padrinho pendente. Contas administrativas
    -- criadas via script (service role) precisam setar membership_status
    -- = 'member' manualmente depois, mesmo padrão já usado hoje pra
    -- is_admin/is_support_channel -- ver AGENTS.md.
    'pending_sponsor',
    nullif(new.raw_user_meta_data ->> 'preferred_plan', '')
  );

  if v_inviter_id is not null then
    update platform_invites
    set used_by = new.id, used_at = now()
    where invite_code = v_code and used_by is null;
  end if;

  return new;
end;
$$;

-- 5) Padrinho aceita ou recusa apadrinhar -- só quem é o padrinho de fato
-- (referred_by = quem está chamando) pode decidir, e só enquanto ainda
-- está pendente (evita responder duas vezes ou responder por outro
-- padrinho). Aceitar concede o badge na hora (mesmo formato usado pela
-- ADM em approveVerification, `LUM-XXXXXXXX`), liberando acesso completo
-- via is_verified()/os gates que já existem em todo o app.
create or replace function respond_sponsorship(p_user_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_decision not in ('accept', 'reject') then
    raise exception 'Decisão inválida';
  end if;

  perform set_config('lumeo.bypass_sensitive_guard', 'true', true);

  if p_decision = 'accept' then
    update users
    set
      membership_status = 'provisional',
      verification_badge_id = 'LUM-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)),
      sponsor_responded_at = now()
    where id = p_user_id
      and referred_by = auth.uid()
      and membership_status = 'pending_sponsor';
  else
    update users
    set membership_status = 'rejected_by_sponsor', sponsor_responded_at = now()
    where id = p_user_id
      and referred_by = auth.uid()
      and membership_status = 'pending_sponsor';
  end if;

  if not found then
    raise exception 'Nada pendente pra responder (já respondido, ou você não é o padrinho deste perfil)';
  end if;
end;
$$;

grant execute on function respond_sponsorship(uuid, text) to authenticated;

-- 6) Confirmação definitiva da ADM (ou reprovação, revogando o acesso
-- provisório concedido pelo padrinho).
create or replace function admin_finalize_membership(p_user_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Só administradores podem confirmar associações';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception 'Decisão inválida';
  end if;

  perform set_config('lumeo.bypass_sensitive_guard', 'true', true);

  if p_decision = 'approve' then
    update users
    set membership_status = 'member', member_since = now()
    where id = p_user_id and membership_status = 'provisional';
  else
    update users
    set membership_status = 'rejected_by_admin', verification_badge_id = null
    where id = p_user_id and membership_status = 'provisional';
  end if;

  if not found then
    raise exception 'Nenhum perfil provisório encontrado com esse id';
  end if;
end;
$$;

grant execute on function admin_finalize_membership(uuid, text) to authenticated;

-- 7) Trial de 7 dias (has_contact_access) parava de fazer sentido ligado a
-- `verifications.reviewed_at`, já que o fluxo de cadastro novo nunca passa
-- por essa tabela -- passa a contar a partir de `member_since`.
create or replace function has_contact_access(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(
      (
        select
          is_admin
          or is_support_channel
          or (
            subscription_exempt
            and (subscription_exempt_until is null or subscription_exempt_until > now())
          )
          or (member_since is not null and member_since > now() - interval '7 days')
        from users where id = p_user_id
      ),
      false
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
