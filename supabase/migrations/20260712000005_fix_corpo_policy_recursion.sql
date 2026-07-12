-- A recriação anterior (20260712000004) corrigiu a policy de "rosto
-- aprovado" mas não a de "corpo": testado ao vivo, a checagem do dono
-- ainda falhava ("Object not found" na signed URL) mesmo com o dono e o
-- viewer verificados e visíveis um ao outro via select direto em `users`.
--
-- Diferença estrutural entre as duas policies: a de rosto só precisa ver a
-- PRÓPRIA linha do solicitante em `photo_access_requests` (trivialmente
-- permitido por "own"); a de corpo precisa ver a linha de OUTRO usuário
-- (o dono) em `users`, o que depende da policy "users select conversation
-- partner" — que por sua vez consulta `conversations`. Um terceiro nível de
-- indireção de RLS dentro de uma policy de storage.objects, que os testes
-- ao vivo mostraram não resolver de forma confiável.
--
-- Mesma solução que o projeto já usa em outros lugares (is_admin(),
-- confirmed_attendees_for_event) para não depender do RLS de `users` na
-- hora de checar uma propriedade de outro usuário: uma função security
-- definer que bypassa esse RLS.

create or replace function is_verified(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from users where id = p_user_id and verification_badge_id is not null
  );
$$;

grant execute on function is_verified(uuid) to authenticated;

drop policy if exists "profile photos bucket select verified corpo" on storage.objects;

create policy "profile photos bucket select verified corpo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'corpo'
    and is_verified(auth.uid())
    and is_verified((storage.foldername(name))[1]::uuid)
  );
