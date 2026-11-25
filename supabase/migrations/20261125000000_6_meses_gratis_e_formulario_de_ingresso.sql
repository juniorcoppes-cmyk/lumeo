-- Duas mudanças pedidas pelo fundador em 2026-11-25:
-- (1) Fase de lançamento: 6 meses grátis por perfil (antes era teste de 7
--     dias). Depois dos 6 meses, o portão de assinatura entra como já funciona.
-- (2) Porta de entrada por FORMULÁRIO pra quem chega sem convite — a pessoa
--     deixa o contato dela e a administração procura. Não expõe o WhatsApp
--     do dono.
--
-- Idempotente (create or replace / if not exists / drop policy if exists):
-- é aplicada à mão no SQL Editor, rodar duas vezes por engano não pode quebrar.

-- (1) 6 MESES GRÁTIS -----------------------------------------------------
-- Mesma função de 20260715000002, trocando só o período do teste grátis de
-- '7 days' para '6 months'. Todo o resto (admin, suporte, isenção, assinatura
-- ativa/overdue) fica idêntico — é o portão de acesso, não mexer no resto.
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
          or (member_since is not null and member_since > now() - interval '6 months')
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

-- (2) FORMULÁRIO DE INGRESSO --------------------------------------------
-- Pedidos de quem quer entrar sem convite. Preenchido por gente SEM conta,
-- então o insert não passa por uma sessão de usuário — ver nota de RLS abaixo.
create table if not exists access_requests (
  id uuid primary key default gen_random_uuid(),
  apelido text not null,
  contact_type text not null check (contact_type in ('whatsapp', 'email')),
  contact_value text not null,
  cidade text,
  profile_type text not null check (profile_type in ('individual', 'casal')),
  reason text,
  status text not null default 'novo' check (status in ('novo', 'conversando', 'aprovado', 'recusado')),
  admin_notes text,
  created_at timestamptz not null default now()
);

alter table access_requests enable row level security;

-- Só admin lê, atualiza e apaga os pedidos.
drop policy if exists "access_requests admin select" on access_requests;
create policy "access_requests admin select"
  on access_requests for select to authenticated using (is_admin());

drop policy if exists "access_requests admin update" on access_requests;
create policy "access_requests admin update"
  on access_requests for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "access_requests admin delete" on access_requests;
create policy "access_requests admin delete"
  on access_requests for delete to authenticated using (is_admin());

-- NÃO existe policy de INSERT de propósito. O envio público do formulário
-- passa por uma server action validada que usa o service_role (bypassa RLS).
-- Assim a tabela não fica gravável direto pela API por qualquer um — a única
-- porta de escrita é a nossa action, que valida os campos antes.
