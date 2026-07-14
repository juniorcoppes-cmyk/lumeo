-- Planos editáveis pelo admin + isenção de assinatura por usuário (pedido
-- do fundador em 2026-07-14). Preço deixa de ser hardcoded no código
-- (`PLAN_PRICES`/`src/lib/plans.ts`, risco de desalinhar já documentado) —
-- passa a ser lido de uma tabela, com um único lugar de verdade tanto pra
-- exibir quanto pra cobrar de fato no Asaas.

create table plans (
  id text primary key check (id in ('essencial', 'plus')),
  name text not null,
  price numeric not null check (price > 0),
  features text[] not null default '{}'
);

alter table plans enable row level security;

-- /planos é página pública (sem login) — preço/nome/features não são dado
-- sensível, select liberado geral.
create policy "plans select all" on plans for select using (true);

create policy "plans update admin" on plans for update to authenticated using (is_admin());

insert into plans (id, name, price, features) values
  ('essencial', 'Essencial', 29.90, array[
    'Acesso completo ao app: Comunidade, linha do tempo, chat e eventos',
    'Verificação de identidade e selo de confiança'
  ]),
  ('plus', 'Plus', 49.90, array[
    'Tudo do Essencial',
    'Descontos especiais nos eventos',
    'Lista VIP de prioridade quando um evento atinge lotação máxima'
  ]);

-- Isenção de assinatura por perfil, a critério do admin (ex.: parceiro,
-- convidado especial) — mesmo efeito de ter assinatura ativa pra fins de
-- has_contact_access(), sem precisar pagar.
alter table users add column subscription_exempt boolean not null default false;

-- Coluna sensível nova: precisa entrar no mesmo guard-rail das outras
-- (is_admin, verification_badge_id, email, referred_by) — sem isso,
-- qualquer usuário comum poderia se auto-isentar via chamada direta à API,
-- mesma classe de vulnerabilidade já corrigida antes (ver "Correção de
-- segurança crítica" no AGENTS.md).
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

  return new;
end;
$$;

create or replace function has_contact_access(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(
      (select is_admin or is_support_channel or subscription_exempt from users where id = p_user_id),
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
