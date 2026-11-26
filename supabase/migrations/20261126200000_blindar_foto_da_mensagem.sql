-- BLINDAR OS DADOS DA FOTO DA MENSAGEM.
--
-- A policy "messages update participant marks read" (de 20260712000015) deixa
-- o DESTINATÁRIO dar update na mensagem do outro — ela existe pra marcar como
-- lida, e quem limita QUAIS colunas ele pode mexer é o gatilho
-- protect_message_content, não a policy. O gatilho já travava autor, conversa,
-- horário, texto, exclusão e "quem falou"; faltavam as colunas de foto.
--
-- Sem isto, por API direta o destinatário poderia: zerar o "já vista" e rever
-- uma foto de visualização única, esticar a validade de uma temporária, ou
-- virar uma única em fixa. Esta migração fecha isso.
--
-- As ÚNICAS transições legítimas das colunas de foto:
--   - marcar única como vista: photo_viewed_at null -> agora, pela função
--     marcar_foto_unica_vista (null -> timestamp é permitido);
--   - limpar o arquivo: photo_path -> null, feito pelo cron, que roda sem
--     usuário (auth.uid() nulo).
-- Qualquer outra mudança nessas colunas é recusada.

begin;

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

  -- Dados da foto: imutáveis, salvo as duas transições legítimas acima.
  if new.photo_mode is distinct from old.photo_mode
    or new.photo_expires_at is distinct from old.photo_expires_at
    or (old.photo_viewed_at is not null and new.photo_viewed_at is distinct from old.photo_viewed_at)
    or (new.photo_path is distinct from old.photo_path and auth.uid() is not null)
  then
    raise exception 'Não é permitido alterar os dados da foto da mensagem';
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

-- Prova: tente, logado como DESTINATÁRIO, zerar o "já vista" de uma foto única
-- do outro — tem que dar erro de "dados da foto". (Sem foto única ainda, dá pra
-- só confirmar que a função foi recriada:)
-- select 1 from pg_proc where proname = 'protect_message_content';
