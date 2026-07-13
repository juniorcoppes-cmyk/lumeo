-- Comentários em fotos do álbum (pedido do fundador, 2026-07-12): quem
-- consegue ver a foto (mesma regra de sempre — corpo: qualquer verificado;
-- rosto: dono ou pedido de acesso aprovado) consegue comentar. O dono da
-- foto pode apagar qualquer comentário nela a qualquer momento (pedido
-- explícito); o próprio autor do comentário também pode apagar o que
-- escreveu — consistente com o resto do app (sempre dá pra apagar o que é
-- seu).
create table photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references profile_photos (id) on delete cascade,
  author_id uuid not null references users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table photo_comments enable row level security;

create policy "photo_comments select viewable"
  on photo_comments for select to authenticated
  using (
    exists (
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

create policy "photo_comments insert viewable"
  on photo_comments for insert to authenticated
  with check (
    auth.uid() = author_id
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

create policy "photo_comments delete author or photo owner"
  on photo_comments for delete to authenticated
  using (
    auth.uid() = author_id
    or auth.uid() = (select user_id from profile_photos where id = photo_comments.photo_id)
  );
