-- TEMPO DE MEIO EM QUATRO DEGRAUS, com cor própria em cada um.
--
-- A escada antiga tinha três ('iniciante' até 3 meses, 'iniciado' até 1 ano,
-- 'experiente' mais de 1 ano) e não separava quem está há 2 anos de quem
-- está há 15. A nova tem quatro e, principalmente, NÃO TEM BURACO: quem está
-- com 8 meses tem onde se encaixar.
--
-- A cor de cada degrau vive no código (lib/experience-level.ts), não aqui:
-- é decisão de aparência, muda sem migração.
--
-- DE→PARA dos perfis que já existem. O critério foi nunca inventar
-- experiência que a pessoa não declarou:
--   iniciante  (até 3 meses)   → ate_6_meses     cabe inteiro no degrau novo
--   iniciado   (até 1 ano)     → ate_5_anos      esses perfis foram preenchidos
--                                                em jul/2026 e estão 4 meses
--                                                mais velhos; quem continuar
--                                                se achando no degrau de baixo
--                                                troca no próprio perfil
--   experiente (mais de 1 ano) → ate_5_anos      quem passou de 5 anos sobe
--                                                sozinho, no perfil

begin;

-- Solta a trava antes de reescrever os valores, senão o update bate nela.
alter table users drop constraint if exists users_experience_level_check;

-- No banco de produção, conferido em 26/11/2026, só existiam 'experiente'
-- (9) e 'iniciado' (3) — nenhum 'iniciante'. A linha dele fica aqui porque
-- esta migração também roda em ambiente novo, e lá ele pode existir.
update users set experience_level = 'ate_6_meses' where experience_level = 'iniciante';
update users set experience_level = 'ate_5_anos'  where experience_level in ('iniciado', 'experiente');

alter table users add constraint users_experience_level_check
  check (
    experience_level is null
    or experience_level in ('chegando', 'ate_6_meses', 'ate_5_anos', 'mais_de_5_anos')
  );

commit;
