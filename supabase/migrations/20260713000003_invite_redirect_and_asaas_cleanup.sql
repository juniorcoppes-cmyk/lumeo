-- Convite pendente pra quem cria conta a partir de um link de convite sem
-- ainda ter cadastro (pedido do fundador em 2026-07-13, quarta rodada):
-- guarda o código até a verificação ser aprovada, aí a próxima página
-- logada que a pessoa abrir já redireciona pro evento automaticamente
-- (checado em `(logged)/layout.tsx`, não aqui).
alter table users add column pending_invite_code text;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, profile_type, experience_level, referred_by, pending_invite_code)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'profile_type', 'individual'),
    new.raw_user_meta_data ->> 'experience_level',
    nullif(new.raw_user_meta_data ->> 'referred_by', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'invite_code', '')
  );
  return new;
end;
$$;
