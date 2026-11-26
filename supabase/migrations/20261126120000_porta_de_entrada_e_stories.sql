-- DUAS COISAS, num bloco só.
--
-- 1. PORTA DE ENTRADA que libera de verdade. O formulário de /participar já
--    existia e o admin já via o pedido em /admin/solicitacoes — mas aprovar
--    só mudava um texto na tela: liberar o acesso continuava sendo trabalho
--    manual por fora do app. Agora aprovar GERA o convite, e o pedido guarda
--    qual convite foi gerado.
--
-- 2. STORIES: publicação que vive 24 horas. Mesma regra de rosto do feed (o
--    borrão é queimado no navegador, o original nunca sobe), mesma regra de
--    quem enxerga quem do get_timeline.

begin;

-- ─── 1. Porta de entrada ──────────────────────────────────────────────────

alter table access_requests
  add column if not exists invite_id uuid references platform_invites (id) on delete set null;

-- ─── 2. Stories ───────────────────────────────────────────────────────────

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  photo_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists stories_recentes on stories (created_at desc);

alter table stories enable row level security;

-- Escrever e apagar é só o dono. LER passa pela função abaixo (security
-- definer), e não por policy de select: a regra de visibilidade é a mesma do
-- feed e fica num lugar só.
drop policy if exists "stories insert own" on stories;
create policy "stories insert own"
  on stories for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "stories select own" on stories;
create policy "stories select own"
  on stories for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "stories delete own" on stories;
create policy "stories delete own"
  on stories for delete to authenticated
  using (user_id = auth.uid());

-- Quem some da comunidade some do story: verificado vê verificado, oculto
-- não aparece, discreto não aparece. Mesmo critério do get_timeline.
create or replace function get_stories()
returns table (
  id uuid,
  user_id uuid,
  author_name text,
  author_avatar_path text,
  photo_path text,
  caption text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id,
    s.user_id,
    u.name as author_name,
    u.avatar_path as author_avatar_path,
    s.photo_path,
    s.caption,
    s.created_at
  from stories s
  join users u on u.id = s.user_id
  where is_verified(auth.uid())
    and s.created_at > now() - interval '24 hours'
    and (
      s.user_id = auth.uid()
      or (u.verification_badge_id is not null and u.discreet_mode = false and u.hidden = false)
    )
  order by s.created_at asc;
$$;

-- Função nova nasce aberta ao PUBLIC: fechar na hora, como o get_timeline.
revoke execute on function public.get_stories() from public, anon;
grant execute on function public.get_stories() to authenticated, service_role;

-- Arquivo do story no storage: <uid>/story/<arquivo>. Mesma regra das
-- outras pastas do bucket, inclusive o "não aparece se o perfil está oculto".
drop policy if exists "profile photos bucket select verified story" on storage.objects;
create policy "profile photos bucket select verified story"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'story'
    and is_verified(auth.uid())
    and is_verified((storage.foldername(name))[1]::uuid)
    and not is_hidden((storage.foldername(name))[1]::uuid)
  );

commit;
