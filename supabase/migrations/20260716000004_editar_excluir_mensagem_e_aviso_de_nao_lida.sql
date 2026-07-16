-- Editar/excluir mensagem própria + aviso de mensagem não lida (pedido do
-- fundador em 2026-07-16, décima oitava rodada).
--
-- Contexto: o fundador não ficou sabendo quando o primeiro testador real
-- mandou mensagem — não existia indicador de não-lida em lugar nenhum do
-- app (o negrito que já existia é recibo de leitura PRO REMETENTE, não
-- aviso pro destinatário).

-- Escrita pra poder rodar duas vezes sem quebrar (`if not exists` / `drop
-- policy if exists`): esta migração é aplicada à mão no SQL Editor, não por
-- CLI, então rodar de novo por engano é um risco real.

-- 1) Editar e excluir --------------------------------------------------
alter table messages add column if not exists edited_at timestamptz;
alter table messages add column if not exists deleted_at timestamptz;

-- Texto de mensagem excluída, preservado como prova pra denúncia
-- (`user_reports` aceita 'mensagem_ofensiva'/'assedio' mas só guarda um
-- texto livre — sem isto, quem assediasse podia apagar a prova antes de
-- ser denunciado). Só admin lê. Ninguém escreve direto: quem popula é o
-- trigger security definer abaixo, e a ausência de policy de insert já
-- nega qualquer tentativa via API.
create table if not exists deleted_message_contents (
  message_id uuid primary key references messages (id) on delete cascade,
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  content text not null,
  sent_at timestamptz not null,
  deleted_at timestamptz not null default now()
);

alter table deleted_message_contents enable row level security;

drop policy if exists "deleted message contents admin select" on deleted_message_contents;
create policy "deleted message contents admin select"
  on deleted_message_contents for select to authenticated
  using (is_admin());

-- O autor precisa poder atualizar a PRÓPRIA mensagem — a policy que já
-- existia ("messages update participant marks read") tem
-- `with check (sender_id <> auth.uid())`, ou seja, proíbe justamente o
-- autor. As duas policies convivem (RLS é OR): a antiga serve pro
-- destinatário marcar como lida, esta serve pro autor editar/excluir. O
-- controle de QUAIS colunas cada um pode mexer é do trigger abaixo, não
-- da policy — mesma lição da correção de segurança de 2026-07-12: `using`
-- restringe a LINHA, nunca a COLUNA.
drop policy if exists "messages update own author" on messages;
create policy "messages update own author"
  on messages for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Substitui a versão de 20260712000015, que bloqueava alteração de
-- `content` pra todo mundo. Abre uma porta estreita: só o autor, só na
-- própria mensagem, só no texto — e carimba a edição no banco, não no
-- cliente.
create or replace function protect_message_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_author boolean := auth.uid() = old.sender_id;
begin
  -- Nunca mudam, pra ninguém (nem autor, nem admin): reescrever autor,
  -- conversa ou horário descaracterizaria a mensagem.
  if new.sender_id is distinct from old.sender_id
    or new.conversation_id is distinct from old.conversation_id
    or new.sent_at is distinct from old.sent_at
  then
    raise exception 'Não é permitido alterar autor, conversa ou horário da mensagem';
  end if;

  -- Excluir: só o autor, só a própria, sem desfazer.
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

    -- Exclusão de verdade: o texto SAI da linha que o outro participante
    -- consegue ler pela API. Marcar só um flag e esconder na tela seria
    -- exclusão de fachada — bastaria abrir o devtools pra ler.
    insert into deleted_message_contents
      (message_id, conversation_id, sender_id, content, sent_at)
    values (old.id, old.conversation_id, old.sender_id, old.content, old.sent_at)
    on conflict (message_id) do nothing;

    new.content := '';
    new.deleted_at := now();
    return new;
  end if;

  -- Editar: só o autor, só a própria, e não em mensagem já excluída.
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
    -- Carimbo é do banco: se viesse do cliente, dava pra editar escondido
    -- mandando edited_at = null direto pela API.
    new.edited_at := now();
    return new;
  end if;

  -- Nenhuma mudança de texto/exclusão: sobrou marcar como lida. Ninguém
  -- forja o carimbo de edição sem editar.
  if new.edited_at is distinct from old.edited_at then
    raise exception 'edited_at é definido pelo banco, não pelo cliente';
  end if;

  return new;
end;
$$;

-- 2) Aviso de mensagem não lida ---------------------------------------
-- "Não lida" é POR APARELHO, não por conta: perfil casal usa o mesmo
-- login em dois celulares, então cada celular tem o seu próprio aviso —
-- reaproveita `message_reads`, a mesma fonte do negrito que já existe.
-- p_device_id nulo devolve 0 de propósito: sem cookie de aparelho não dá
-- pra saber o que já foi lido, e mostrar tudo como não-lido seria pior
-- que não mostrar nada.
create or replace function unread_message_count(p_device_id text)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(count(*), 0)::int
  from messages m
  join conversations c on c.id = m.conversation_id
  where p_device_id is not null
    and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    and m.sender_id <> auth.uid()
    and m.deleted_at is null
    and not exists (
      select 1 from message_reads r
      where r.message_id = m.id and r.device_id = p_device_id
    );
$$;

create or replace function unread_messages_by_conversation(p_device_id text)
returns table (conversation_id uuid, unread integer)
language sql
stable
security invoker
set search_path = public
as $$
  select m.conversation_id, count(*)::int as unread
  from messages m
  join conversations c on c.id = m.conversation_id
  where p_device_id is not null
    and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    and m.sender_id <> auth.uid()
    and m.deleted_at is null
    and not exists (
      select 1 from message_reads r
      where r.message_id = m.id and r.device_id = p_device_id
    )
  group by m.conversation_id;
$$;
