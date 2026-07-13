-- Campos de perfil (pedido do fundador, 2026-07-12): descrição, idade
-- (via data de nascimento), sexo, orientação sexual e "o que busca" para
-- todo usuário; perfil casal também guarda os mesmos dados do segundo
-- parceiro (partner_*), já que hoje um "casal" é uma única conta/linha em
-- `users`, não duas. Nada disso é exigido no cadastro (que já tem 4 etapas
-- + termos) — preenchido/editado depois em /perfil, igual ao selo de
-- experiência.
alter table users
  add column bio text,
  add column birth_date date,
  add column gender text check (gender in ('homem', 'mulher')),
  add column sexual_orientation text
    check (sexual_orientation in ('hetero', 'bissexual', 'bissexual_iniciando')),
  add column looking_for text[]
    check (looking_for <@ array['casais', 'solteiros', 'solteiras']::text[]),
  add column partner_birth_date date,
  add column partner_gender text check (partner_gender in ('homem', 'mulher')),
  add column partner_sexual_orientation text
    check (partner_sexual_orientation in ('hetero', 'bissexual', 'bissexual_iniciando'));

-- get_verified_profile passa a expor tudo isso pro /perfil/[id] (mesma
-- lógica de sempre: só quem está verificado vê o perfil de outro
-- verificado; e-mail continua fora).
create or replace function get_verified_profile(p_user_id uuid)
returns table (
  name text,
  profile_type text,
  verification_badge_id text,
  experience_level text,
  bio text,
  birth_date date,
  gender text,
  sexual_orientation text,
  looking_for text[],
  partner_birth_date date,
  partner_gender text,
  partner_sexual_orientation text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.name, u.profile_type, u.verification_badge_id, u.experience_level,
    u.bio, u.birth_date, u.gender, u.sexual_orientation, u.looking_for,
    u.partner_birth_date, u.partner_gender, u.partner_sexual_orientation
  from users u
  where u.id = p_user_id
    and u.verification_badge_id is not null
    and is_verified(auth.uid());
$$;

grant execute on function get_verified_profile(uuid) to authenticated;
