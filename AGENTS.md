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
`/login`), fluxo de cadastro (`/cadastro/*`), área logada sob o route group
`(logged)` (`/inicio`, `/eventos`, `/chat`, `/perfil`, `/assinatura`) e admin
(`/admin/*`). `(logged)/layout.tsx` e `admin/layout.tsx` redirecionam para
`/login` (ou `/inicio`, se não-admin) quando não há sessão válida.

## O que já está funcional (via Supabase real, precisa de projeto configurado)
- Cadastro (`/cadastro/dados` → signUp) e login (`/login` → signInWithPassword).
- Upload de documento/vídeo de verificação (`/cadastro/documento`,
  `/cadastro/video`) para o bucket privado `verifications`, criando a linha em
  `verifications` com status `pending`.
- Indicação de padrinho por selo (`/cadastro/padrinho`) e tela de status real
  (`/cadastro/aguardando`, lê `verifications.status`/`rejection_reason`).
- Listagem de eventos com vagas restantes via RPC `events_with_open_slots`
  (agrega `event_registrations` sem expandir o RLS existente) e inscrição
  (`/eventos/:id` cria registro `pending`, sem processador de pagamento).
- Perfil real (nome, selo, plano) e toggle de modo discreto persistido.
- Painel `/admin/*` ainda são placeholders sem lógica — falta implementar a
  fila de aprovação, criação/edição de eventos e gestão de usuários.
- Chat (`/chat`, `/chat/:id`) ainda é placeholder — falta criar `conversations`
  ao confirmar dois usuários no mesmo evento e a UI de mensagens.

## Pontos sensíveis
- `verifications.document_url` / `video_url` guardam paths no bucket privado
  `verifications` (RLS: insert só do próprio usuário; select só para
  `users.is_admin`). Falta política de retenção/exclusão automática (LGPD).
- "Chat só existe entre confirmados no mesmo evento" ainda não tem a criação
  automática de `conversations` implementada.
- `events_with_open_slots` é `security definer` — qualquer alteração nela deve
  manter o retorno restrito a contagens agregadas, nunca linhas individuais de
  `event_registrations`.

## Pendências (seção 8 da especificação)
1. Processador de pagamento brasileiro (assinatura + eventos) — ainda não escolhido.
2. Registro de `lumeo.com.br` e busca de marca no INPI.
3. Regra de tolerância para falha de pagamento recorrente.
4. Prazo de retenção/exclusão dos arquivos de verificação.
