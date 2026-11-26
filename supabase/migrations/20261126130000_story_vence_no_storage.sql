-- O ARQUIVO DO STORY VENCE JUNTO COM O STORY.
--
-- Até aqui as 24 horas viviam só no get_stories: passado o prazo o story
-- sumia da tela, mas o arquivo continuava servível para qualquer verificado
-- que tivesse o caminho guardado (cache do app, link copiado). Quem publica
-- um story espera que ele acabe — e neste app essa expectativa vale mais do
-- que numa rede comum.
--
-- ATENÇÃO À ARMADILHA DE RLS: a checagem NÃO pode ser um `exists (select 1
-- from stories ...)` escrito direto na policy. Policy de storage.objects roda
-- como o usuário que consulta, e `stories` só deixa o DONO ler as próprias
-- linhas ("stories select own") — o exists acharia o story de quem publicou
-- e não acharia o de mais ninguém, então cada um veria só o próprio story e
-- ninguém entenderia por quê. Mesmo erro que derrubou a policy de foto de
-- corpo em 20260712000005, e a saída é a mesma: função security definer.

begin;

create or replace function story_vigente(p_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from stories
    where photo_path = p_path
      and created_at > now() - interval '24 hours'
  );
$$;

revoke execute on function public.story_vigente(text) from public, anon;
grant execute on function public.story_vigente(text) to authenticated, service_role;

drop policy if exists "profile photos bucket select verified story" on storage.objects;
create policy "profile photos bucket select verified story"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'story'
    and is_verified(auth.uid())
    and is_verified((storage.foldername(name))[1]::uuid)
    and not is_hidden((storage.foldername(name))[1]::uuid)
    and story_vigente(name)
  );

commit;
