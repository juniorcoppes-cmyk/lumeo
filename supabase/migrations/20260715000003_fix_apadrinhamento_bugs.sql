-- Dois bugs reais encontrados testando 20260715000002 contra o banco de
-- verdade (script descartável, não a lógica de negócio em si):
--
-- 1) gen_random_bytes() não é encontrado dentro de respond_sponsorship()
--    porque a função roda com `search_path = public` (de propósito, é o
--    padrão de segurança usado em toda função do projeto) e o pgcrypto
--    fica instalado no schema `extensions` no Supabase -- funciona no
--    DEFAULT de uma coluna (resolvido com o search_path da sessão do SQL
--    Editor, mais permissivo) mas não dentro de uma função com
--    search_path restrito. Precisa qualificar o schema explicitamente.
--
-- 2) respond_sponsorship() e admin_finalize_membership() são SECURITY
--    DEFINER, mas isso não muda o que auth.role()/is_admin() enxergam
--    dentro da trigger protect_sensitive_user_columns() -- ela olha o JWT
--    de quem chamou, não o dono da função. Resultado: as duas RPCs
--    ficavam travadas pelo próprio guard-rail que a migração anterior
--    adicionou (confirmado ao vivo: "Não é permitido alterar
--    membership_status diretamente" ao tentar aceitar/recusar). Corrigido
--    com uma flag de sessão (set_config, local à transação) que só essas
--    duas funções ligam, depois de já terem validado autorização própria
--    (referred_by = auth.uid() / is_admin()) -- não abre brecha nova,
--    só deixa quem já passou por essas checagens escrever nas colunas
--    sensíveis que a checagem existe pra proteger.

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
