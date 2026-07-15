-- Isenção de assinatura com prazo opcional (pedido do fundador em
-- 2026-07-15): "30 dias" ou "até revogar". subscription_exempt continua
-- sendo o toggle mestre; subscription_exempt_until, quando preenchido, faz
-- a isenção expirar sozinha dentro de has_contact_access() sem o admin
-- precisar lembrar de desligar manualmente. NULL = isenção sem prazo (até
-- o admin revogar).

alter table users add column subscription_exempt_until timestamptz null;

-- Coluna sensível nova (controla acesso sem pagar) -- precisa entrar no
-- mesmo guard-rail das outras (is_admin, verification_badge_id, email,
-- referred_by, subscription_exempt), senão um usuário comum poderia se
-- auto-isentar com um prazo bem longo via chamada direta à API. Mesma
-- classe de vulnerabilidade já corrigida antes, ver "Correção de
-- segurança crítica" no AGENTS.md.
create or replace function protect_sensitive_user_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() or auth.role() = 'service_role' then
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

  return new;
end;
$$;

-- has_contact_access: isenção só conta enquanto subscription_exempt = true
-- E (sem prazo definido OU o prazo ainda não passou).
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
        from users where id = p_user_id
      ),
      false
    )
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
