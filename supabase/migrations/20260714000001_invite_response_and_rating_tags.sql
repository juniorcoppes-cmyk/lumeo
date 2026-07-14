-- Aceitar/recusar indicação de evento com cor (pedido do fundador em
-- 2026-07-14): pendente = amarelo, aceita = verde, recusada some da lista
-- — só se aplica à indicação direta por selo (convidarPorSelo), já que o
-- convite por link (accept_invite) já nasce "accepted" no clique.
alter table event_invites drop constraint event_invites_status_check;
alter table event_invites add constraint event_invites_status_check
  check (status in ('sent', 'accepted', 'declined'));

-- Não existia policy de UPDATE pra quem foi indicado (só o inviter podia
-- gerenciar via accept_invite, que é pro fluxo de link) — RPC controlada
-- em vez de policy direta, mesmo padrão de accept_invite/contact_admin.
create or replace function respond_invite(p_invite_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'Status inválido';
  end if;

  update event_invites
  set status = p_status
  where id = p_invite_id and invitee_id = auth.uid();

  if not found then
    raise exception 'Convite não encontrado';
  end if;
end;
$$;

grant execute on function respond_invite(uuid, text) to authenticated;

-- Avaliações de perfil: novo conjunto de tags (pedido do fundador em
-- 2026-07-14) e restrição a conexões sociais/íntimas — "amigos virtuais"
-- deixa de poder avaliar (a policy antiga não diferenciava o tipo de
-- conexão, só exigia "approved" de qualquer tipo).
alter table profile_ratings drop constraint profile_ratings_tags_check;
alter table profile_ratings add constraint profile_ratings_tags_check
  check (
    tags <@ array['bonito', 'bom_papo', 'inteligente', 'gostoso', 'engracado']::text[]
    and array_length(tags, 1) > 0
  );

drop policy "ratings insert own" on profile_ratings;
create policy "ratings insert own"
  on profile_ratings for insert to authenticated
  with check (
    auth.uid() = rater_id
    and exists (
      select 1 from user_connections c
      where c.status = 'approved'
        and c.connection_type in ('amigos_sociais', 'amigos_intimos')
        and (
          (c.requester_id = auth.uid() and c.target_id = profile_ratings.target_id)
          or (c.target_id = auth.uid() and c.requester_id = profile_ratings.target_id)
        )
    )
  );

create or replace function get_profile_rating_counts(p_user_id uuid, p_target_role text default 'self')
returns table (tag text, tag_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select all_tags.tag, count(pr.id) as tag_count
  from unnest(array['bonito', 'bom_papo', 'inteligente', 'gostoso', 'engracado']) as all_tags(tag)
  left join profile_ratings pr
    on pr.target_id = p_user_id
    and pr.target_role = p_target_role
    and all_tags.tag = any(pr.tags)
  where is_verified(auth.uid())
  group by all_tags.tag
  order by all_tags.tag;
$$;
