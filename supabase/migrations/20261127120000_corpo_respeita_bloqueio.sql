-- FOTO DE CORPO PASSA A RESPEITAR O BLOQUEIO (fecha a "brecha 2" do bloqueio).
--
-- Quando A bloqueia B, o perfil some e as mensagens param, e o acesso ao
-- álbum de ROSTO já cai junto (o gatilho revoga_acesso_foto_ao_bloquear apaga
-- os photo_access_requests, e as policies de rosto dependem de um pedido
-- aprovado). Faltava o álbum de CORPO: ele é liberado a qualquer par de
-- verificados, SEM pedido — então, depois do bloqueio, quem tivesse guardado
-- a URL assinada de uma foto de corpo ainda conseguia reabrir pelo link velho,
-- e as linhas do álbum ainda apareceriam se o perfil renderizasse.
--
-- Costura a MESMA regra de bloqueio (ha_bloqueio, security definer, já criada
-- em 20261126170000) nas duas policies de corpo — a da tabela profile_photos
-- (a lista de fotos) e a do storage.objects (o arquivo em si). Idempotente:
-- recria as duas do zero.
--
-- IMPORTANTE: a versão viva no banco (20260716000001) já tem a proteção do
-- perfil OCULTO — `not is_hidden(dono)` — nas duas regras. Mantemos as duas
-- linhas aqui; sem elas, quem ocultou o perfil voltaria a expor as fotos de
-- corpo a qualquer verificado (o oposto do que a pessoa escolheu). Também
-- usamos is_verified(dono) no storage em vez do exists antigo: é o checo
-- correto do dono e padroniza com a regra da tabela.

begin;

-- 1) Lista de fotos (linhas do álbum). Verificados dos dois lados, dono não
--    oculto e sem bloqueio entre os dois.
drop policy if exists "profile_photos select verified corpo" on profile_photos;

create policy "profile_photos select verified corpo"
  on profile_photos for select to authenticated
  using (
    category = 'corpo'
    and is_verified(auth.uid())
    and exists (select 1 from users o where o.id = profile_photos.user_id and o.verification_badge_id is not null)
    and not is_hidden(profile_photos.user_id)
    and not ha_bloqueio(auth.uid(), profile_photos.user_id)
  );

-- 2) Arquivo no storage (o que a URL assinada entrega). Mesma checagem,
--    usando o dono extraído do caminho {user_id}/corpo/arquivo. É AQUI que
--    o link velho deixa de funcionar.
drop policy if exists "profile photos bucket select verified corpo" on storage.objects;

create policy "profile photos bucket select verified corpo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[2] = 'corpo'
    and is_verified(auth.uid())
    and is_verified((storage.foldername(name))[1]::uuid)
    and not is_hidden((storage.foldername(name))[1]::uuid)
    and not ha_bloqueio(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

commit;

-- Prova: logado como A (que bloqueou B), gerar signed URL de uma foto de corpo
-- de B tem que falhar ("Object not found"); de um verificado NÃO bloqueado,
-- tem que continuar abrindo. E a contagem das duas policies recriadas:
-- select count(*) from pg_policies
--   where policyname in (
--     'profile_photos select verified corpo',
--     'profile photos bucket select verified corpo'
--   );  -- espera 2
