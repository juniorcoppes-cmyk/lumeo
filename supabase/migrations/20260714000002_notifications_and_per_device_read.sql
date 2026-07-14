-- Notificações in-app de comentário em foto + leitura de mensagem por
-- aparelho pra perfil casal (pedido do fundador em 2026-07-14).

-- 1) Notificações --------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null check (type in ('photo_comment')),
  content text not null,
  related_photo_id uuid references profile_photos (id) on delete cascade,
  related_user_id uuid references users (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "notifications select own"
  on notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "notifications update own"
  on notifications for update to authenticated
  using (auth.uid() = user_id);

-- Sem policy de insert pra usuário comum de propósito — só o trigger
-- abaixo (security definer) cria notificação, nunca o próprio usuário.
create or replace function notify_photo_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_commenter_name text;
begin
  select user_id into v_owner_id from profile_photos where id = new.photo_id;

  if v_owner_id is not null and v_owner_id <> new.author_id then
    select name into v_commenter_name from users where id = new.author_id;
    insert into notifications (user_id, type, content, related_photo_id, related_user_id)
    values (
      v_owner_id,
      'photo_comment',
      v_commenter_name || ' comentou na sua foto',
      new.photo_id,
      new.author_id
    );
  end if;
  return new;
end;
$$;

create trigger notify_photo_comment_trigger
  after insert on photo_comments
  for each row execute function notify_photo_comment();

-- 2) Leitura de mensagem por aparelho -------------------------------------
-- Perfil casal usa o mesmo login em dois celulares — não tem como saber
-- "qual dos dois" leu pela sessão (é a mesma conta). Cada aparelho passa a
-- ter sua própria marcação de lido (device_id vem de um cookie, gerado no
-- middleware); pra casal, uma mensagem enviada só é considerada lida de
-- verdade quando 2 aparelhos distintos do destinatário já registraram
-- leitura — pra individual, basta 1. `messages.read_at` (coluna antiga)
-- fica sem uso a partir de agora, substituída por esta tabela.
create table message_reads (
  message_id uuid not null references messages (id) on delete cascade,
  device_id text not null,
  read_at timestamptz not null default now(),
  primary key (message_id, device_id)
);

alter table message_reads enable row level security;

create policy "message_reads select participant"
  on message_reads for select to authenticated
  using (
    exists (
      select 1 from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = message_reads.message_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

-- Só quem RECEBEU a mensagem pode marcar como lida — sem isso o próprio
-- remetente poderia inserir um device_id falso na própria mensagem enviada
-- e fingir que já foi lida.
create policy "message_reads insert participant"
  on message_reads for insert to authenticated
  with check (
    exists (
      select 1 from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = message_reads.message_id
        and m.sender_id <> auth.uid()
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );
