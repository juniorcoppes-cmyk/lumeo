-- A migração inicial só previa leitura da própria assinatura; faltava
-- permissão de escrita para o usuário escolher/trocar de plano.
create policy "subscriptions insert own"
  on subscriptions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "subscriptions update own"
  on subscriptions for update to authenticated
  using (auth.uid() = user_id);
