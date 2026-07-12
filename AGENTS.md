<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lumeo

Plataforma de eventos presenciais e curadoria/verificação para o público
liberal/lifestyle brasileiro. Ver `docs/especificacao-mvp.md` para a
especificação completa (visão de produto, sitemap, fluxos, modelo de dados).

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + Storage), cliente em `src/lib/supabase/`
- Sessão renovada via `middleware.ts` (usa `src/lib/supabase/middleware.ts`)
- Migração inicial do banco em `supabase/migrations/20260711000000_init.sql`

## Estrutura de rotas (`src/app`)
Segue o sitemap da especificação: público (`/`, `/como-funciona`, `/planos`,
`/login`), fluxo de cadastro (`/cadastro/*`), área logada (`/inicio`,
`/eventos`, `/chat`, `/perfil`, `/assinatura`) e admin (`/admin/*`). Todas as
páginas hoje são placeholders — implementação real é trabalho futuro.

## Pontos sensíveis
- `verifications.document_url` / `video_url` guardam dados sensíveis (LGPD).
  Devem ficar em bucket Supabase Storage separado com RLS restrita a papel de
  aprovação — ainda não configurado (política de storage.objects pendente).
- Regras de negócio como "chat só existe entre confirmados no mesmo evento" e
  "reprovação exige motivo" estão parcialmente no schema (constraints) mas
  precisam de validação também na camada de aplicação.

## Pendências (seção 8 da especificação)
1. Processador de pagamento brasileiro (assinatura + eventos) — ainda não escolhido.
2. Registro de `lumeo.com.br` e busca de marca no INPI.
3. Regra de tolerância para falha de pagamento recorrente.
4. Prazo de retenção/exclusão dos arquivos de verificação.
