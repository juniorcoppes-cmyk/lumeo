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
- Admin: `/admin/verificacoes` aprova (gera `verification_badge_id`) ou
  reprova (exige motivo) via URL assinada do Storage; `/admin/eventos` cria
  eventos e confirma/cancela inscrições; `/admin/usuarios` lista usuários e
  promove/remove admin.
- Chat: `/chat` lista conversas existentes e, para cada evento em que o
  usuário está confirmado, permite iniciar conversa com outros confirmados
  (via RPC `confirmed_attendees_for_event` + `start_conversation`);
  `/chat/:id` lista e envia mensagens reais.
- Assinatura e pagamento (Asaas): `/assinatura` cria/reaproveita um customer
  no Asaas (`billing_profiles`, tabela separada de `users` por causa das
  policies de leitura ampla — ver "Pontos sensíveis") e uma subscription real;
  `/eventos/:id` cobra o preço do evento (campo `events.price`, definido pelo
  admin) via cobrança avulsa. Webhook em `src/app/api/webhooks/asaas/route.ts`
  (valida header `asaas-access-token`, idempotente via `payment_webhook_events`)
  atualiza `subscriptions.status`/`event_registrations.payment_status` quando
  o Asaas confirma/vence/cancela um pagamento. Preços de plano estão
  hardcoded em `PLAN_PRICES` (`assinatura/actions.ts`) e duplicados no
  array `PLANS` da página — mudar um exige lembrar do outro.
- Indicar evento: `/eventos/:id` permite indicar por selo (usuário já
  verificado) ou gerar link de convite (`event_invites` + `invite_code`);
  `/convite/[code]` é a página pública de destino (usa `get_invite_preview`
  e `accept_invite`, ambas security definer); `/inicio` lista próximos
  eventos e indicações recebidas. `login` aceita `?next=` para retomar o
  convite após autenticar.
- Álbum de fotos: `/perfil` gerencia as próprias fotos em duas categorias
  (`rosto`/`corpo`, tabela `profile_photos`, bucket `profile-photos`).
  "Corpo" é visível a qualquer usuário verificado; "rosto" exige um pedido
  de acesso (`photo_access_requests`) que o dono aprova/nega em `/perfil`.
  `/perfil/[id]` mostra o álbum de outro usuário (corpo sempre, rosto só se
  aprovado); linkado a partir de `/chat`. Path no storage:
  `{user_id}/{rosto|corpo}/{arquivo}` — o segundo segmento do path é usado
  nas policies de storage para diferenciar a categoria.

## Testado ponta a ponta contra um projeto Supabase real
Cadastro → verificação (documento/vídeo) → aprovação admin (selo gerado) →
criação de evento (admin) → inscrição → confirmação (admin) → assinatura de
plano → geração e aceite de link de convite → upload de fotos (rosto/corpo)
em `/perfil`. Tudo validado no navegador, não só por leitura de código.
**Não testado ao vivo** (aceito como risco residual, coberto por revisão de
código): chat entre dois usuários confirmados; o fluxo cruzado de pedido/
aprovação de acesso ao álbum de rosto entre dois usuários reais (precisa de
um segundo usuário verificado para testar de verdade — só validei upload e
os casos de borda de `/perfil/[id]` com um usuário só).

## Testado ponta a ponta contra Asaas sandbox
Assinatura de plano (cria customer + subscription, link de pagamento,
confirmação via `POST /v3/sandbox/payment/{id}/confirm`, webhook atualiza
`subscriptions.status` para `active`) e cobrança de evento pago (cria
payment avulso, mesmo fluxo de confirmação, webhook marca
`event_registrations.payment_status = paid`) — ambos validados de ponta a
ponta com um túnel cloudflared temporário apontando o webhook para o
localhost. **Para produção**: registrar o webhook de novo (a URL do túnel
não existe mais) apontando para o domínio real, via
`POST https://api.asaas.com/v3/webhooks` com a API key de produção — ver
payload usado em `docs/asaas-webhook-setup` (não versionado; refazer com
os campos de `src/app/api/webhooks/asaas/route.ts`: `authToken` igual ao
`ASAAS_WEBHOOK_TOKEN` de produção, `events` = PAYMENT_CONFIRMED,
PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DELETED, PAYMENT_REFUNDED).
Bug encontrado e corrigido nesse teste: a action de assinatura/inscrição
exigia CPF do formulário mesmo quando `billing_profiles` já tinha o
customer — quebrava a segunda compra de qualquer usuário.

### Lição sobre RLS + upload de arquivo (upsert)
`{ upsert: true }` no upload vira `INSERT ... ON CONFLICT (name, bucket_id)
DO UPDATE` no Postgres. Isso exige (a) uma policy de UPDATE em
`storage.objects` — não só INSERT — e (b) uma policy de SELECT visível ao
próprio usuário, mesmo que a linha ainda não exista: o Postgres precisa
conseguir checar se há conflito, e sem nenhum SELECT permitido a checagem
falha com "new row violates row-level security policy" (mensagem idêntica à
de falha de INSERT, o que torna o diagnóstico enganoso). Isso custou uma
sessão inteira de depuração — ver migrações `..._storage_update.sql` e
`..._storage_select_own.sql`. Se qualquer bucket novo usar `upsert: true`,
lembrar de criar as três policies (insert/select/update) desde o início.

## Postura de compliance (decisão do produto, não só técnica)
Tratamos o Lumeo como sujeito às regras de "conteúdo adulto" da Lei
15.211/2025 (ECA Digital) **por garantia**, mesmo sem confirmação jurídica
definitiva — decisão consciente de errar para o lado mais restritivo em vez
de assumir que a plataforma está fora do escopo da lei. Na prática, hoje isso
significa: documento/vídeo de verificação são apagados do Storage assim que
aprovados (ver abaixo), nunca reutilizados para outra finalidade além da
verificação em si. Ainda não implementado e digno de revisão se a postura
mudar: verificação "a cada acesso" (a lei sugere isso para conteúdo adulto;
o Lumeo verifica uma vez, na aprovação — mudar isso é uma decisão de UX
grande, não fazer sem alinhar antes).

## Pontos sensíveis
- `verifications.document_url` / `video_url` guardam paths no bucket privado
  `verifications` (RLS: insert/select/update do próprio usuário na própria
  pasta; select completo e delete só para `users.is_admin`). **Apagados do
  Storage automaticamente quando a verificação é aprovada** (dentro da mesma
  `approveVerification`, ver `src/app/admin/verificacoes/actions.ts`) —
  colunas viram `null`, `purged_at` registra quando. Reprovações continuam
  retidas (usuário ainda vai reenviar); não há limpeza automática para
  reprovações abandonadas (usuário nunca reenvia) — considerar se isso virar
  um problema de volume.
- Toda escrita "de admin" (aprovar verificação, criar evento, confirmar
  inscrição, promover usuário) depende de `users.is_admin = true` verificado
  via função `is_admin()` (security definer) nas policies — ver
  `supabase/migrations/20260711000005_admin_policies.sql`. Não há ainda UI
  para o primeiro admin se promover; isso precisa ser feito manualmente no
  banco (`update users set is_admin = true where email = '...'`).
- `events_with_open_slots`, `confirmed_attendees_for_event` e
  `start_conversation` são `security definer` — qualquer alteração nelas deve
  manter o retorno restrito ao estritamente necessário (contagens agregadas
  ou participantes já confirmados), nunca expor linhas arbitrárias de
  `event_registrations`.
- Inscrição em evento exige `users.verification_badge_id` preenchido (RLS em
  `event_registrations insert own`, ver `..._require_verification_to_register.sql`).
  Usuário não verificado vê mensagem explicando o motivo em `/eventos/:id`
  em vez do botão de inscrição.

- `billing_profiles` (cpf_cnpj, asaas_customer_id) é separada de `users` de
  propósito — RLS ali só permite o próprio dono ver, nunca admin/badge/
  conversa. `src/lib/supabase/service.ts` (service_role, bypassa RLS) só deve
  ser usado no webhook do Asaas, nunca em código que atende requisição de
  usuário comum.
- Antes de integrar de fato: ver a pesquisa sobre Lei 15.211/2025 ("ECA
  Digital", em vigor desde 17/03/2026) discutida no chat — exige verificação
  de idade não-autodeclarada para "conteúdo adulto" e restringe o uso dos
  dados de verificação só a essa finalidade. Não está confirmado
  juridicamente se o Lumeo se enquadra; validar com advogado antes do
  lançamento público, isso pode exigir mudar o fluxo de verificação.

## Produção
- Deploy: [lumeo-alpha.vercel.app](https://lumeo-alpha.vercel.app) (Vercel,
  conectado a `github.com/juniorcoppes-cmyk/lumeo`, branch `master`, deploy
  automático a cada push).
- Webhook do Asaas de produção já registrado apontando para
  `https://lumeo-alpha.vercel.app/api/webhooks/asaas` (nome "Lumeo -
  Pagamentos" no painel do Asaas), mesmos 5 eventos do sandbox.
- **Nunca testado com pagamento real** — só verificado que o deploy sobe sem
  erro e as rotas renderizam. Antes de aceitar o primeiro pagamento de
  verdade, validar o fluxo completo (talvez com um valor simbólico).
- Armadilha real encontrada no primeiro deploy: variáveis de ambiente somem
  se a página da Vercel for recarregada/trocada de projeto no meio do
  preenchimento — sempre confirmar as 6 variáveis existem de fato (não só
  "parece que salvei") antes de rodar o deploy. Mudar env vars não rebuilda
  sozinho — precisa de um redeploy manual depois.
- Erro visto: `MIDDLEWARE_INVOCATION_FAILED` / "Your project's URL and Key
  are required to create a Supabase client" — sintoma direto de
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` ausentes no
  ambiente de Production no momento do build (não é erro de código).

## Pendências (seção 8 da especificação)
1. ~~Processador de pagamento brasileiro~~ — Asaas escolhido e integrado
   (sandbox). Nenhum processador brasileiro aceita o nicho "por escrito";
   Asaas foi a escolha pragmática, ver pesquisa no histórico do chat.
2. Registro de `lumeo.com.br` e busca de marca no INPI.
3. ~~Regra de tolerância para falha de pagamento recorrente~~ — 2 dias de
   carência (`overdue_since` + `effectiveSubscriptionStatus` em
   `src/lib/subscription.ts`; ver `src/app/api/webhooks/asaas/route.ts`).
4. ~~Prazo de retenção/exclusão dos arquivos de verificação~~ — descarte
   automático na aprovação (ver "Postura de compliance" acima). Reprovações
   sem reenvio ainda não têm limpeza automática.
