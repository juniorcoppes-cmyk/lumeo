-- Casal que só usa um aparelho pra entrar no Lumeo (pedido do fundador em
-- 2026-07-14): sem essa opção, a mensagem nunca "des-negritaria" pra eles,
-- já que o requisito de 2 aparelhos distintos nunca seria atingido. Toggle
-- em /perfil, só relevante pra profile_type = 'casal'.
alter table users add column couple_single_device boolean not null default false;

-- Curtida de foto do álbum (pedido do fundador em 2026-07-14), ícone de
-- diabinho (😈). Mesma regra de visibilidade de photo_comments (quem pode
-- ver a foto pode curtir). Contagem agregada pública, sem expor quem
-- curtiu — mesmo padrão de profile_ratings (decisão de privacidade já
-- estabelecida no app).
create table photo_likes (
  photo_id uuid not null references profile_photos (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

alter table photo_likes enable row level security;

create policy "photo_likes select own"
  on photo_likes for select to authenticated
  using (auth.uid() = user_id);

create policy "photo_likes insert viewable"
  on photo_likes for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from profile_photos pp
      where pp.id = photo_likes.photo_id
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

create policy "photo_likes delete own"
  on photo_likes for delete to authenticated
  using (auth.uid() = user_id);

create or replace function get_photo_like_counts(p_photo_ids uuid[])
returns table (photo_id uuid, like_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select photo_id, count(*) as like_count
  from photo_likes
  where photo_id = any(p_photo_ids)
  group by photo_id;
$$;

grant execute on function get_photo_like_counts(uuid[]) to authenticated;
