-- Achado em teste ao vivo: o próprio dono de uma foto de rosto via seu post
-- na linha do tempo aparecer bloqueado ("postou uma foto... solicite
-- acesso"), porque can_view_photo checava photo_access_requests, que nunca
-- tem uma linha de alguém pedindo acesso à própria foto (aliás, a tabela
-- proíbe isso via check (requester_id <> owner_id)). Dono sempre pode ver a
-- própria foto de rosto, sem precisar de pedido/aprovação.
create or replace function get_timeline(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  author_name text,
  type text,
  content text,
  created_at timestamptz,
  photo_id uuid,
  photo_category text,
  photo_storage_path text,
  can_view_photo boolean,
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
    tp.event_id,
    e.title as event_title
  from timeline_posts tp
  join users u on u.id = tp.user_id
  left join profile_photos pp on pp.id = tp.photo_id
  left join events e on e.id = tp.event_id
  where is_verified(auth.uid())
    and (
      tp.user_id = auth.uid()
      or (u.verification_badge_id is not null and u.discreet_mode = false)
    )
  order by tp.created_at desc
  limit p_limit;
$$;

grant execute on function get_timeline(int) to authenticated;
