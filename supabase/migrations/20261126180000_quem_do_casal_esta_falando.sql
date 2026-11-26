-- QUEM DO CASAL ESTÁ FALANDO.
--
-- Uma conta de CASAL é um login só, duas pessoas. Até aqui, uma mensagem que
-- saía de um casal não dizia qual dos dois estava escrevendo — e isso importa:
-- quem recebe quer saber se é ele ou ela falando. Passa a ser REGRA, não
-- opção: todo casal marca quem fala antes de enviar.
--
-- Guardamos 'p1' / 'p2' (pessoa 1 / pessoa 2 do perfil, as mesmas "Pessoa 1"/
-- "Pessoa 2" que já aparecem na tela do perfil), não o rótulo. O rótulo
-- visível (Ele/Ela) é derivado na tela a partir do gênero de cada um, e cai
-- pra "Pessoa 1"/"Pessoa 2" quando os dois têm o mesmo gênero — assim nunca
-- aparecem dois rótulos iguais. Conta individual não usa: fica null.

begin;

alter table messages add column if not exists sender_persona text
  check (sender_persona in ('p1', 'p2'));

-- Regra no banco: casal é OBRIGADO a marcar quem fala; individual nunca marca.
-- Reescreve o insert de mensagens de 20261126170000 acrescentando só a
-- exigência do persona — o resto (participante, bloqueio isentando o suporte,
-- contato ativo) é idêntico.
drop policy if exists "messages insert participant" on messages;
create policy "messages insert participant" on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
    and not exists (
      select 1 from conversations c
      join users other_u on other_u.id = (
        case when c.user_a_id = auth.uid() then c.user_b_id else c.user_a_id end
      )
      where c.id = messages.conversation_id
        and other_u.is_support_channel = false
        and ha_bloqueio(auth.uid(), other_u.id)
    )
    and (
      coalesce((select profile_type from users where id = auth.uid()), '') <> 'casal'
      or sender_persona is not null
    )
    and (
      has_contact_access(auth.uid())
      or exists (
        select 1 from conversations c
        join users other_u on other_u.id = (
          case when c.user_a_id = auth.uid() then c.user_b_id else c.user_a_id end
        )
        where c.id = messages.conversation_id and other_u.is_support_channel = true
      )
    )
  );

-- Depois de enviada, quem falou NÃO muda — como já vale pra autor, conversa e
-- horário. Sem isto, uma chamada direta na API podia reescrever o persona e
-- jogar pro outro uma fala que não foi dele. Reescreve protect_message_content
-- de 20260716000004 acrescentando só essa trava.
create or replace function protect_message_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_author boolean := auth.uid() = old.sender_id;
begin
  if new.sender_id is distinct from old.sender_id
    or new.conversation_id is distinct from old.conversation_id
    or new.sent_at is distinct from old.sent_at
    or new.sender_persona is distinct from old.sender_persona
  then
    raise exception 'Não é permitido alterar autor, conversa, horário ou quem falou na mensagem';
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if not v_is_author then
      raise exception 'Só o autor pode excluir a própria mensagem';
    end if;
    if old.deleted_at is not null then
      raise exception 'Mensagem já excluída';
    end if;
    if new.deleted_at is null then
      raise exception 'Não é permitido desfazer a exclusão';
    end if;

    insert into deleted_message_contents
      (message_id, conversation_id, sender_id, content, sent_at)
    values (old.id, old.conversation_id, old.sender_id, old.content, old.sent_at)
    on conflict (message_id) do nothing;

    new.content := '';
    new.deleted_at := now();
    return new;
  end if;

  if new.content is distinct from old.content then
    if not v_is_author then
      raise exception 'Só o autor pode editar a própria mensagem';
    end if;
    if old.deleted_at is not null then
      raise exception 'Não é permitido editar mensagem excluída';
    end if;
    if length(trim(new.content)) = 0 then
      raise exception 'Mensagem não pode ficar vazia — use excluir';
    end if;
    new.edited_at := now();
    return new;
  end if;

  if new.edited_at is distinct from old.edited_at then
    raise exception 'edited_at é definido pelo banco, não pelo cliente';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_message_content() from public, anon;

commit;

-- Provas rápidas:
-- select count(*) as col_persona from information_schema.columns
--   where table_name='messages' and column_name='sender_persona';
-- -- deve recusar (0 linhas): casal sem persona. Rode logado como um casal, numa
-- -- conversa sua, trocando <CONV> pelo id — tem que dar erro de política:
-- -- insert into messages (conversation_id, sender_id, content) values ('<CONV>', auth.uid(), 'teste');
