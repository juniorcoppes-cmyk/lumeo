-- Cria a linha em public.users automaticamente após o signup em auth.users,
-- usando os metadados (name, profile_type) passados em supabase.auth.signUp().

create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, profile_type, referred_by)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'profile_type', 'individual'),
    nullif(new.raw_user_meta_data ->> 'referred_by', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
