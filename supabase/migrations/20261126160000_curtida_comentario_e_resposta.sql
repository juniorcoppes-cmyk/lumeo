-- CURTIDA, COMENTÁRIO E RESPOSTA — e o conserto de um defeito do feed.
--
-- 1. DEFEITO: publicar FOTO no feed não funciona em produção.
--    A única policy de insert de timeline_posts, escrita em julho, exige
--    `type = 'text'`. O feed de hoje grava `type = 'photo'`, então a RLS
--    recusa, o app apaga o arquivo que acabou de subir e devolve "não
--    consegui publicar". Texto sempre funcionou; foto nunca funcionou.
--    Mesma coisa no delete. As duas policies passam a aceitar 'photo'.
--    Os outros tipos continuam de fora de propósito: 'photo_corpo',
--    'photo_rosto' e 'event_confirmed' são gerados pelo sistema, não
--    escritos pela pessoa.
--
-- 2. Curtida e comentário no post do feed (o álbum do perfil já tinha).
--
-- 3. Resposta: o comentário pode ser respondido, e a conversa é só entre
--    DUAS pessoas — quem comentou e o dono da foto. Terceiro não entra numa
--    resposta. É o que evita que a foto de alguém vire palco de discussão
--    entre estranhos, que é exatamente o que afasta o público daqui.

begin;

-- ─── 1. O conserto ────────────────────────────────────────────────────────

drop policy if exists "timeline_posts insert own text" on timeline_posts;
create policy "timeline_posts insert own"
  on timeline_posts for insert to authenticated
  with check (auth.uid() = user_id and type in ('text', 'photo'));

drop policy if exists "timeline_posts delete own text" on timeline_posts;
create policy "timeline_posts delete own"
  on timeline_posts for delete to authenticated
  using (auth.uid() = user_id and type in ('text', 'photo'));

-- ─── 2. Quem enxerga o post enxerga as interações dele ───────────────────
--
-- Sem isto, curtida e comentário ficariam legíveis para qualquer verificado,
-- enquanto o POST some do feed de quem está em modo discreto ou oculto. A
-- pessoa sumiria da linha do tempo e deixaria rastro nos comentários — num
-- app em que a discrição é o produto, é o pior tipo de vazamento.
--
-- A regra é a MESMA do get_timeline, de propósito: duas regras para a mesma
-- pergunta é como elas divergem.
create or replace function posso_ver_post(p_post uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_verified(auth.uid()) and exists (
    select 1
    from timeline_posts tp
    join users u on u.id = tp.user_id
    where tp.id = p_post
      and (
        tp.user_id = auth.uid()
        or (u.verification_badge_id is not null and u.discreet_mode = false and u.hidden = false)
      )
  );
$$;

revoke execute on function public.posso_ver_post(uuid) from public, anon;
grant execute on function public.posso_ver_post(uuid) to authenticated, service_role;

-- ─── 3. Curtida no post ───────────────────────────────────────────────────

create table if not exists post_likes (
  post_id uuid not null references timeline_posts (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table post_likes enable row level security;

drop policy if exists "post_likes select verified" on post_likes;
create policy "post_likes select verified"
  on post_likes for select to authenticated using (posso_ver_post(post_id));

drop policy if exists "post_likes insert own" on post_likes;
create policy "post_likes insert own"
  on post_likes for insert to authenticated
  with check (user_id = auth.uid() and posso_ver_post(post_id));

drop policy if exists "post_likes delete own" on post_likes;
create policy "post_likes delete own"
  on post_likes for delete to authenticated using (user_id = auth.uid());

-- ─── 4. Comentário e resposta no post ─────────────────────────────────────

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references timeline_posts (id) on delete cascade,
  author_id uuid not null references users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  /// Resposta a outro comentário. Null = comentário de primeiro nível.
  reply_to uuid references post_comments (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_do_post on post_comments (post_id, created_at);

alter table post_comments enable row level security;

/// Quem pode responder ESTE comentário: o dono do post e quem escreveu o
/// comentário respondido. Mais ninguém. Security definer porque precisa ler
/// o dono do post, e timeline_posts nem select policy tem — a leitura do
/// feed inteiro passa pelo get_timeline.
/// `p_post` não é decoração: sem ele dava para gravar no post A uma resposta
/// apontando para um comentário do post B. A linha some das duas telas (o
/// pai não está na lista) e vira comentário invisível no banco.
create or replace function pode_responder_comentario(p_comentario uuid, p_post uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from post_comments c
    join timeline_posts p on p.id = c.post_id
    where c.id = p_comentario
      and c.post_id = p_post
      and (p.user_id = auth.uid() or c.author_id = auth.uid())
  );
$$;

revoke execute on function public.pode_responder_comentario(uuid, uuid) from public, anon;
grant execute on function public.pode_responder_comentario(uuid, uuid) to authenticated, service_role;

drop policy if exists "post_comments select verified" on post_comments;
create policy "post_comments select verified"
  on post_comments for select to authenticated using (posso_ver_post(post_id));

drop policy if exists "post_comments insert own" on post_comments;
create policy "post_comments insert own"
  on post_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and posso_ver_post(post_id)
    and (reply_to is null or pode_responder_comentario(reply_to, post_id))
  );

/// Apaga o próprio comentário — e o dono do post apaga qualquer um no post
/// dele. Sem isso, quem publica não tem como tirar da própria foto um
/// comentário que não quer ver.
create or replace function sou_dono_do_post_do_comentario(p_comentario uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from post_comments c
    join timeline_posts p on p.id = c.post_id
    where c.id = p_comentario and p.user_id = auth.uid()
  );
$$;

revoke execute on function public.sou_dono_do_post_do_comentario(uuid) from public, anon;
grant execute on function public.sou_dono_do_post_do_comentario(uuid) to authenticated, service_role;

drop policy if exists "post_comments delete own or owner" on post_comments;
create policy "post_comments delete own or owner"
  on post_comments for delete to authenticated
  using (author_id = auth.uid() or sou_dono_do_post_do_comentario(id));

-- ─── 5. Resposta também no álbum do perfil ────────────────────────────────
-- O álbum já tinha curtida e comentário desde julho; só faltava responder.

alter table photo_comments add column if not exists reply_to uuid
  references photo_comments (id) on delete cascade;

create or replace function pode_responder_comentario_de_foto(p_comentario uuid, p_foto uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from photo_comments c
    join profile_photos f on f.id = c.photo_id
    where c.id = p_comentario
      and c.photo_id = p_foto
      and (f.user_id = auth.uid() or c.author_id = auth.uid())
  );
$$;

revoke execute on function public.pode_responder_comentario_de_foto(uuid, uuid) from public, anon;
grant execute on function public.pode_responder_comentario_de_foto(uuid, uuid) to authenticated, service_role;

-- A policy de insert do álbum (de julho) não conhece o reply_to: sem este
-- acréscimo, qualquer um poderia responder a conversa de outros dois. Vai
-- junto da regra de quem pode comentar a foto, que fica como estava.
drop policy if exists "photo_comments insert viewable" on photo_comments;
create policy "photo_comments insert viewable"
  on photo_comments for insert to authenticated
  with check (
    auth.uid() = author_id
    and (reply_to is null or pode_responder_comentario_de_foto(reply_to, photo_id))
    and exists (
      select 1 from profile_photos pp
      where pp.id = photo_comments.photo_id
        and (
          (pp.category = 'corpo' and is_verified(auth.uid()) and is_verified(pp.user_id))
          or (
            pp.category = 'rosto'
            and (
              pp.user_id = auth.uid()
              or exists (
                select 1 from photo_access_requests r
                where r.requester_id = auth.uid()
                  and r.owner_id = pp.user_id
                  and r.status = 'approved'
              )
            )
          )
        )
    )
  );

commit;
