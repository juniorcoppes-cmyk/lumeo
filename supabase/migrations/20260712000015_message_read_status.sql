-- Status de leitura de mensagens (pedido do fundador, 2026-07-12): mensagem
-- enviada aparece em negrito pro remetente até o destinatário abrir a
-- conversa; depois vira normal. `read_at` é preenchido pelo destinatário ao
-- abrir `/chat/[id]` (ver ChatConversaPage).
alter table messages add column read_at timestamptz;

create policy "messages update participant marks read"
  on messages for update to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  )
  with check (
    -- só o destinatário marca como lida a mensagem do outro; o remetente
    -- não pode usar esta policy pra mexer na própria mensagem.
    sender_id <> auth.uid()
  );

-- Reforço (mesma lógica da migração de segurança 20260712000014): a policy
-- acima só restringe QUEM pode atualizar a linha, não QUAIS colunas. Sem
-- isso, o destinatário poderia, via API direta, alterar content/sender_id
-- da mensagem do outro em vez de só marcar como lida.
create or replace function protect_message_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content is distinct from old.content
    or new.sender_id is distinct from old.sender_id
    or new.conversation_id is distinct from old.conversation_id
    or new.sent_at is distinct from old.sent_at
  then
    raise exception 'Só é permitido marcar mensagens como lidas';
  end if;
  return new;
end;
$$;

create trigger protect_message_content_trigger
  before update on messages
  for each row execute function protect_message_content();
