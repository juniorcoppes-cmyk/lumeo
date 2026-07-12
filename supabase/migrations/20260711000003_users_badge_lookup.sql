-- Permite que qualquer usuário autenticado localize um padrinho pelo selo de
-- verificação (apenas usuários já aprovados têm verification_badge_id preenchido).
-- Sem isso, a política "users select own" bloquearia a busca no fluxo de cadastro/padrinho.

create policy "users select by badge"
  on users for select to authenticated
  using (verification_badge_id is not null);
