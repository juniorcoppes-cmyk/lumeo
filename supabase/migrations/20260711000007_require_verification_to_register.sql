-- Só usuários com verificação aprovada (selo emitido) podem se inscrever em
-- eventos. A política anterior só checava "é o próprio usuário".
drop policy "registrations insert own" on event_registrations;

create policy "registrations insert own"
  on event_registrations for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from users u
      where u.id = auth.uid() and u.verification_badge_id is not null
    )
  );
