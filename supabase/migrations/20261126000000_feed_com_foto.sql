-- FEED: publicação com foto, além do texto que já existia.
--
-- A foto do feed é diferente da foto do álbum (profile_photos): ela não tem
-- categoria rosto/corpo nem pedido de acesso, porque o rosto JÁ SOBE BORRADO
-- — o borrão é queimado na imagem dentro do navegador (ver PhotoEditor), e o
-- original sem borrão nunca sai do aparelho. Logo não há o que proteger com
-- permissão: quem pode ver o feed pode ver a foto.
--
-- Por isso um caminho próprio no mesmo bucket (<uid>/feed/<arquivo>) em vez
-- de reaproveitar profile_photos, que arrastaria junto todo o sistema de
-- aprovação — e jogaria foto de feed dentro da galeria do perfil, que é
-- outra coisa.

begin;

-- 1. O post passa a poder carregar uma foto própria.
alter table timeline_posts add column if not exists photo_path text;

alter table timeline_posts drop constraint if exists timeline_posts_type_check;
alter table timeline_posts add constraint timeline_posts_type_check
  check (type in ('text', 'photo', 'photo_corpo', 'photo_rosto', 'event_confirmed'));

-- Post de foto precisa da foto; e, ao contrário do texto, a legenda é
-- opcional — foto sozinha é publicação legítima.
alter table timeline_posts drop constraint if exists photo_requires_path;
alter table timeline_posts add constraint photo_requires_path
  check (type <> 'photo' or photo_path is not null);

-- 2. Quem pode ver o arquivo no storage. Espelha a regra da foto de corpo
-- (20260712000005): verificado vê verificado, sem depender do RLS de `users`
-- dentro de uma policy de storage.
drop policy if exists "profile photos bucket select verified feed" on storage.objects;
create policy "profile photos bucket select verified feed"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'feed'
    and is_verified(auth.uid())
    and is_verified((storage.foldername(name))[1]::uuid)
    -- Mesmo padrão das outras policies do bucket (20260716000001): quem
    -- ocultou o perfil some também no nível do ARQUIVO. Sem isto, o
    -- get_timeline esconderia o post mas a foto seguiria acessível a
    -- qualquer verificado que tivesse o caminho guardado.
    and not is_hidden((storage.foldername(name))[1]::uuid)
  );

-- Apagar o próprio arquivo. Quem remove é o app, junto com o post (ver
-- apagarDoFeed): sem esta policy o post sumia e o arquivo ficava órfão,
-- invisível e ocupando espaço.
drop policy if exists "profile photos bucket delete own" on storage.objects;
create policy "profile photos bucket delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. A timeline passa a devolver a foto do post. Precisa DERRUBAR antes: o
-- retorno ganhou uma coluna, e `create or replace` recusa mudar o formato de
-- retorno ("cannot change return type of existing function").
drop function if exists public.get_timeline(int);

-- O resto é idêntico à versão de 20260716000000 — só entrou a coluna
-- photo_path na saída e no select.
create or replace function get_timeline(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  author_name text,
  author_experience_level text,
  author_avatar_path text,
  type text,
  content text,
  created_at timestamptz,
  photo_id uuid,
  photo_category text,
  photo_storage_path text,
  can_view_photo boolean,
  photo_path text,
  event_id uuid,
  event_title text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    tp.id,
    tp.user_id,
    u.name as author_name,
    u.experience_level as author_experience_level,
    u.avatar_path as author_avatar_path,
    tp.type,
    tp.content,
    tp.created_at,
    tp.photo_id,
    pp.category as photo_category,
    pp.storage_path as photo_storage_path,
    case
      when pp.category = 'corpo' then true
      when pp.category = 'rosto' and tp.user_id = auth.uid() then true
      when pp.category = 'rosto' then exists (
        select 1 from photo_access_requests r
        where r.requester_id = auth.uid()
          and r.owner_id = tp.user_id
          and r.status = 'approved'
      )
      else null
    end as can_view_photo,
    tp.photo_path,
    tp.event_id,
    e.title as event_title
  from timeline_posts tp
  join users u on u.id = tp.user_id
  left join profile_photos pp on pp.id = tp.photo_id
  left join events e on e.id = tp.event_id
  where is_verified(auth.uid())
    and (
      tp.user_id = auth.uid()
      or (u.verification_badge_id is not null and u.discreet_mode = false and u.hidden = false)
    )
  order by tp.created_at desc
  limit p_limit;
$$;

-- Função recriada NASCE executável por PUBLIC (padrão do Postgres), o que
-- desfaria o endurecimento feito em 25/11 — conferido hoje: chamada sem
-- login responde 42501, e tem de continuar respondendo.
revoke execute on function public.get_timeline(int) from public, anon;
grant execute on function public.get_timeline(int) to authenticated, service_role;

commit;
