-- CHAT DE GRUPO DO EVENTO: "quem do casal falou" obrigatório (parte 2/2).
--
-- RODAR SÓ DEPOIS QUE O APP NOVO ESTIVER NO AR. Esta migração passa a EXIGIR
-- sender_persona de quem é casal ao postar no grupo — o app antigo não manda
-- esse campo, então rodar antes do deploy travaria os casais no grupo. O app
-- novo já marca quem está falando no compositor.
--
-- Mesma regra do chat 1-a-1 (20261126180000): casal precisa dizer quem fala;
-- individual fica null. coalesce pra cadastro novo sem profile_type não travar.

begin;

drop policy if exists "event msgs insert members" on event_messages;
create policy "event msgs insert members"
  on event_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and is_event_member(event_id, auth.uid())
    and (
      coalesce((select profile_type from users where id = auth.uid()), '') <> 'casal'
      or sender_persona is not null
    )
  );

commit;

-- Prova: logado como CASAL, inserir em event_messages sem sender_persona tem
-- que falhar; com 'p1'/'p2', passa. (Ou só confirmar que a policy existe:)
-- select count(*) from pg_policies where policyname = 'event msgs insert members';  -- 1
