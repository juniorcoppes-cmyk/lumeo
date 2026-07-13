-- Avaliações entre perfis conectados (pedido do fundador, 2026-07-12): só
-- quem tem uma conexão aprovada com o dono do perfil pode avaliar, com uma
-- ou mais das 5 tags. Perfil casal recebe avaliação separada para "o homem"
-- e "a mulher" (target_role); perfil individual usa target_role = 'self'.
-- Decisão de privacidade (discutida no chat): resultado é contagem
-- agregada pública (ex.: "Gostoso: 5"), nunca expõe quem avaliou o quê —
-- por isso a leitura é só via RPC, sem policy de select na tabela.
create table profile_ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references users (id) on delete cascade,
  target_id uuid not null references users (id) on delete cascade,
  target_role text not null default 'self' check (target_role in ('self', 'man', 'woman')),
  tags text[] not null
    check (
      tags <@ array['bonito', 'bom_papo', 'gostoso', 'sensual', 'interessante']::text[]
      and array_length(tags, 1) > 0
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rater_id <> target_id),
  unique (rater_id, target_id, target_role)
);

alter table profile_ratings enable row level security;

-- Só o próprio avaliador vê/edita a própria avaliação (pra mostrar "sua
-- avaliação" editável em /perfil/[id]) — o agregado público vem da RPC.
create policy "ratings select own"
  on profile_ratings for select to authenticated
  using (auth.uid() = rater_id);

create policy "ratings insert own"
  on profile_ratings for insert to authenticated
  with check (
    auth.uid() = rater_id
    and exists (
      select 1 from user_connections c
      where c.status = 'approved'
        and (
          (c.requester_id = auth.uid() and c.target_id = profile_ratings.target_id)
          or (c.target_id = auth.uid() and c.requester_id = profile_ratings.target_id)
        )
    )
  );

create policy "ratings update own"
  on profile_ratings for update to authenticated
  using (auth.uid() = rater_id);

create policy "ratings delete own"
  on profile_ratings for delete to authenticated
  using (auth.uid() = rater_id);

-- Contagem agregada por tag, sempre com as 5 opções presentes (0 se
-- ninguém marcou ainda), sem expor quem avaliou.
create or replace function get_profile_rating_counts(p_user_id uuid, p_target_role text default 'self')
returns table (tag text, tag_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select all_tags.tag, count(pr.id) as tag_count
  from unnest(array['bonito', 'bom_papo', 'gostoso', 'sensual', 'interessante']) as all_tags(tag)
  left join profile_ratings pr
    on pr.target_id = p_user_id
    and pr.target_role = p_target_role
    and all_tags.tag = any(pr.tags)
  where is_verified(auth.uid())
  group by all_tags.tag
  order by all_tags.tag;
$$;

grant execute on function get_profile_rating_counts(uuid, text) to authenticated;
