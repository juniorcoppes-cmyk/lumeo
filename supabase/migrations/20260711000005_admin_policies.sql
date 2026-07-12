-- Helper de RLS: security definer para não depender da política "users select own"
-- ao checar se o usuário chamador é admin (evita recursão se essa política mudar).
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from users where id = auth.uid()), false);
$$;

-- USERS: admin lê e atualiza qualquer linha (aprovação gera badge, promoção a admin, etc.)
create policy "users select admin" on users for select to authenticated using (is_admin());
create policy "users update admin" on users for update to authenticated using (is_admin());

-- VERIFICATIONS: admin lê e decide (aprova/reprova) qualquer verificação.
create policy "verifications select admin" on verifications for select to authenticated using (is_admin());
create policy "verifications update admin" on verifications for update to authenticated using (is_admin());

-- EVENTS: leitura já é pública para autenticados; escrita fica restrita a admin.
create policy "events insert admin" on events for insert to authenticated with check (is_admin());
create policy "events update admin" on events for update to authenticated using (is_admin());
create policy "events delete admin" on events for delete to authenticated using (is_admin());

-- EVENT_REGISTRATIONS: admin lê e atualiza (confirmar/cancelar) qualquer inscrição.
create policy "registrations select admin" on event_registrations for select to authenticated using (is_admin());
create policy "registrations update admin" on event_registrations for update to authenticated using (is_admin());
