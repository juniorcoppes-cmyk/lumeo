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
  aprovado); linkado a partir de `/chat` e de `/comunidade`. Path no storage:
  `{user_id}/{rosto|corpo}/{arquivo}` — o segundo segmento do path é usado
  nas policies de storage para diferenciar a categoria.
- Comunidade (`/comunidade`, pedido do fundador em 2026-07-12): lista todo
  usuário verificado da plataforma via RPC `browse_verified_users()`
  (security definer), excluindo quem ativou `discreet_mode` (campo que já
  existia, sem uso, até esta feature) e o próprio usuário. Permite iniciar
  conversa com qualquer verificado, não só com quem está confirmado no
  mesmo evento — `conversations.event_id` agora aceita `null` para esse
  caso ("conversa geral"), com índice único parcial
  (`conversations_general_unique`) garantindo uma única conversa geral por
  par de usuários. RPC `start_conversation_general` cria/retorna essa
  conversa; `/chat` já lista as duas modalidades (mostra o nome do evento
  só quando existe). `/perfil/[id]` passou a usar a RPC
  `get_verified_profile` (em vez de select direto em `users`) para
  funcionar com qualquer verificado, não só com quem já tinha conversa em
  comum — e-mail nunca é exposto por nenhuma dessas RPCs. `discreet_mode`
  só tira alguém da listagem de descoberta; não bloqueia acesso a
  `/perfil/[id]` de quem já tem o link (ex.: via conversa existente).
- Linha do tempo (`/linha-do-tempo`, pedido do fundador em 2026-07-12):
  posts de texto do próprio usuário + posts automáticos via trigger —
  `on_profile_photo_created` (nova foto no álbum) e
  `on_registration_confirmed` (`event_registrations.status` vira
  `confirmed`) inserem em `timeline_posts` como `security definer`, então
  disparam independente de quem fez a alteração (app ou admin). `discreet_mode`
  também some da linha do tempo dos outros (mesma regra da Comunidade),
  exceto a própria — sempre visível para o próprio usuário. Leitura
  centralizada na RPC `get_timeline()` (nenhuma policy de select em
  `timeline_posts`, de propósito — evita reproduzir a classe de bug de RLS
  aninhada do álbum de fotos): calcula `can_view_photo` ali mesmo (`corpo`
  sempre true, `rosto` true se for o próprio dono OU se houver
  `photo_access_requests` aprovado; **bug encontrado e corrigido em teste
  ao vivo**: a primeira versão não cobria "é o próprio dono", fazendo a
  pessoa ver a própria foto de rosto como bloqueada — corrigido em
  `20260712000008_fix_own_rosto_timeline_visibility.sql`). Página só busca
  signed URL quando `can_view_photo` é true; senão mostra um card com
  ícone/aviso e link para `/perfil/[id]` pedir acesso.
- Selo de experiência (`users.experience_level`, pedido do fundador em
  2026-07-12): `iniciante`/`iniciado`/`experiente`, preenchido no cadastro
  (`/cadastro/dados`) e editável em `/perfil`. Exposto por
  `browse_verified_users`, `get_verified_profile` e `get_timeline` (nunca
  via select direto em `users`), renderizado pelo componente
  `ExperienceBadge` (`src/components/ExperienceBadge.tsx`) em Comunidade,
  `/perfil/[id]` e linha do tempo.
- Geolocalização (`users.latitude`/`longitude`/`location_updated_at`,
  pedido do fundador em 2026-07-12): **decisão consciente de segurança**
  (discutida no chat) — nunca guardar/expor coordenada exata nem distância
  precisa entre dois usuários, só faixas arredondadas ("menos de 5 km",
  "5–25 km", "25–100 km", "mais de 100 km"), calculadas dentro de
  `browse_verified_users(p_max_distance_km)` via fórmula de haversine.
  Coordenada em si já é arredondada em 2 casas decimais (~1.1km de ruído)
  no momento da escrita (`updateLocation`,
  `src/app/(logged)/perfil/actions.ts`), defesa adicional caso o banco vaze.
  Compartilhamento é opt-in via botão em `/perfil`
  (`LocationShareButton.tsx`, único client component do projeto até agora —
  usa `navigator.geolocation`, precisa de permissão do navegador) e pode ser
  removido a qualquer momento. Comunidade tem um filtro opcional de raio
  (`?max_distance_km=5|25|100`); quem não compartilhou localização (própria
  ou do outro) aparece sem faixa de distância e fica de fora se um filtro
  de raio for aplicado (não dá pra confirmar que está dentro).
- Detalhes de perfil (`bio`, `birth_date`, `gender`, `sexual_orientation`,
  `looking_for`, e os equivalentes `partner_*` para perfil casal — pedido do
  fundador em 2026-07-12): editáveis em `/perfil`, não exigidos no
  cadastro. Perfil casal é uma única conta (não duas), por isso guarda os
  dados dos dois parceiros em colunas paralelas (`partner_birth_date` etc.)
  em vez de duas linhas. Idade é sempre calculada a partir de `birth_date`
  (`calculateAge`, `src/lib/profile-options.ts`), nunca armazenada.
  `get_verified_profile` expõe tudo pro `/perfil/[id]`.
- Conexões entre perfis (`user_connections`, pedido do fundador em
  2026-07-12): "amigos sociais/íntimos/virtuais" — mesmo padrão de
  pedido/aprovação de `photo_access_requests`, reaproveitado de propósito.
  **Decisão de privacidade**: a conexão aprovada só aparece pros dois
  envolvidos (nunca publicamente), verificado em `/perfil/[id]`.
- Avaliações entre perfis (`profile_ratings`, pedido do fundador em
  2026-07-12): só quem tem conexão aprovada com o dono do perfil pode
  avaliar (checado na própria RLS de insert, via `user_connections`), com
  1+ das 5 tags (bonito/bom papo/gostoso/sensual/interessante). Perfil
  casal recebe avaliação **separada** pro homem e pra mulher
  (`target_role`), testado e confirmado que não se misturam. **Decisão de
  privacidade**: resultado é contagem agregada pública no perfil (ex.:
  "Gostoso: 5"), nunca expõe quem avaliou — por isso `profile_ratings` não
  tem policy de select geral, só "select own" (pra mostrar "sua avaliação"
  editável); a leitura agregada é só via RPC
  `get_profile_rating_counts(uuid, text)`.
- Login simultâneo de casal em aparelhos diferentes (pedido do fundador em
  2026-07-12): **já funciona sem nenhuma mudança de código** — Supabase Auth
  não invalida sessões anteriores ao logar de novo com o mesmo e-mail/senha.
  Confirmado via script (2 clients simultâneos, ambos continuam válidos).
- Fotos em tela cheia + comentários (`PhotoGallery`,
  `src/components/PhotoGallery.tsx`, pedido do fundador em 2026-07-12):
  clicar numa miniatura abre um lightbox com a foto grande e os
  comentários. Reaproveitado em `/perfil` (álbum próprio, com botão de
  remover foto) e `/perfil/[id]` (álbum de outro). **Achado durante a
  implementação**: passar uma função de renderização (render-prop) de um
  Server Component pra esse Client Component quebra ("functions cannot be
  passed directly to Client Components") — corrigido passando a própria
  server action (`deletePhotoAction`) como prop em vez de uma função que
  retorna JSX. `photo_comments`: quem já pode ver a foto (mesma regra do
  álbum) pode comentar; dono da foto apaga qualquer comentário nela, autor
  apaga o próprio — RLS direto na tabela (nested `exists` em
  `profile_photos`/`photo_access_requests`, mesmo padrão comprovado em
  `profile_ratings`, não o de storage.objects que já deu problema antes).
- Status de leitura de mensagens (`messages.read_at`, pedido do fundador em
  2026-07-12): mensagem enviada aparece em negrito pro remetente até o
  destinatário abrir `/chat/[id]` (que marca como lida ao carregar);
  timestamp (`sent_at`) exibido em toda mensagem, enviada ou recebida.
- Canal direto com a administração (`contact_admin()`, `users.
  is_support_channel`, pedido do fundador em 2026-07-12): botão "Falar com
  o suporte (ADM)" em `/chat`, disponível mesmo pra quem ainda não foi
  verificado (de propósito — ex.: dúvida sobre verificação reprovada; é o
  único fluxo de chat que não exige `is_verified` dos dois lados). Conta
  real ainda precisa ser criada pelo cadastro normal e marcada com
  `node scripts/mark-support-account.mjs <email>` — sem isso, `contact_admin`
  falha com "Canal de suporte não configurado".

## Correção de segurança crítica (2026-07-12)
Durante a implementação do status de leitura de mensagens, percebi que
`create policy "users update own" on users for update using (auth.uid() =
id)` — sem `with check` — só restringe QUAL LINHA pode ser atualizada, não
QUAIS COLUNAS. **Confirmado ao vivo**: um usuário comum conseguia, via
chamada direta à API (contornando toda a UI), rodar
`update users set is_admin = true where id = auth.uid()` — auto-promoção a
admin — e o mesmo para `verification_badge_id` — auto-emissão de selo de
verificação sem nenhuma aprovação real. Revertido manualmente antes da
correção. Auditoria rápida achou o mesmo padrão com impacto real em mais 3
lugares: `subscriptions` (dava pra se auto-ativar um plano pago sem pagar),
`profile_ratings` e `user_connections` (dava pra redirecionar uma linha já
existente pra um alvo diferente do validado no insert). Corrigido via
triggers `before update` (`protect_sensitive_user_columns`,
`protect_subscription_status`, `protect_rating_target`,
`protect_connection_pair`, `protect_message_content` — ver
`20260712000014_fix_self_promotion_vulnerability.sql` e
`20260712000015_message_read_status.sql`), não via RLS declarativo (que
teria o mesmo risco de subquery autorreferente já visto no bug de storage
do álbum de fotos). Todos os triggers liberam admin de verdade e
service_role (scripts, webhook, cron) — só bloqueiam usuário comum.
**Vale reler `for update`/`for insert` de qualquer tabela nova a partir de
agora perguntando "quais colunas essa policy deixa mudar, e isso devia ser
permitido?"** — não é óbvio à primeira vista, e não tem constraint do
Postgres que avise sozinho.

## Testado ponta a ponta contra um projeto Supabase real
Cadastro → verificação (documento/vídeo) → aprovação admin (selo gerado) →
criação de evento (admin) → inscrição → confirmação (admin) → assinatura de
plano → geração e aceite de link de convite → upload de fotos (rosto/corpo)
em `/perfil`. Tudo validado no navegador, não só por leitura de código.
**Atualização (2026-07-12):** chat e acesso ao álbum de rosto/corpo entre
dois usuários reais foram testados ao vivo (2 contas de teste seedadas via
service role, confirmadas no mesmo evento, sessões reais via anon key — não
service role, então RLS valendo de verdade). Chat: mensagem enviada por um
usuário e lida/respondida pelo outro, funcionou ponta a ponta.

**Dois bugs encontrados e corrigidos** na visualização cross-user de fotos
(`createSignedUrl` retornava "Object not found" mesmo com selo/aprovação
em ordem):
1. As duas policies de `storage.objects` ("select verified corpo" e
   "select rosto approved") aparentemente divergiam do que estava no
   arquivo de migração (aplicação sempre foi manual, via SQL Editor, nunca
   por CLI) — recriadas do zero em
   `20260712000004_fix_profile_photos_storage_policies.sql`, o que sozinho
   já corrigiu "rosto".
2. "Corpo" continuou falhando mesmo depois disso — causa raiz: a policy
   precisa checar o selo do DONO (outro usuário) em `users`, o que dependia
   da policy "users select conversation partner" (que por sua vez consulta
   `conversations`) — um terceiro nível de indireção de RLS dentro de uma
   policy de storage que não resolve de forma confiável. "Rosto" não sofria
   disso porque só precisa ver a própria linha do solicitante em
   `photo_access_requests`. Corrigido em
   `20260712000005_fix_corpo_policy_recursion.sql` com uma função
   `is_verified(uuid)` security definer (mesmo padrão de `is_admin()`),
   evitando depender do RLS de `users` dentro da policy de storage.

Ambos confirmados funcionando ao vivo após a correção (fotos renderizando
de fato em `/perfil/[id]` com sessão real de outro usuário).

Achado à parte, sem relação: **não existe botão de logout na UI** — só
descobri o gap ao precisar trocar de usuário de teste no navegador.

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
  colunas viram `null`, `purged_at` registra quando. Reprovações recentes
  continuam retidas (usuário ainda pode reenviar); reprovações abandonadas há
  mais de 30 dias são purgadas pelo cron `/api/cron/purge-verifications` (ver
  pendência 4 abaixo).
- Toda escrita "de admin" (aprovar verificação, criar evento, confirmar
  inscrição, promover usuário) depende de `users.is_admin = true` verificado
  via função `is_admin()` (security definer) nas policies — ver
  `supabase/migrations/20260711000005_admin_policies.sql`. Não há UI para o
  primeiro admin se promover (a UI de `/admin/usuarios` já exige ser admin
  para acessar) — usar `npm run promote-admin -- email@exemplo.com`
  (`scripts/promote-admin.mjs`, usa a service role key de `.env.local` para
  fazer `update users set is_admin = true`). Script, não UI web, de propósito:
  evita expor um caminho de escalação de privilégio no app implantado.
- `events_with_open_slots`, `confirmed_attendees_for_event`,
  `start_conversation` e `is_verified` são `security definer` — qualquer
  alteração nelas deve manter o retorno restrito ao estritamente necessário
  (contagens agregadas, participantes já confirmados, ou um booleano de
  selo), nunca expor linhas arbitrárias de `event_registrations`/`users`.
  `is_verified(uuid)` existe especificamente para policies de
  `storage.objects` não precisarem depender do RLS de `users` para checar o
  selo de OUTRO usuário — ver "Testado ponta a ponta" acima (bug de
  recursão de RLS no álbum de fotos).
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
   (sandbox + produção). Pesquisa feita (resumo, já que o histórico do chat
   não é uma fonte durável): Stripe proíbe explicitamente conteúdo
   adulto/exige due diligence extra para "namoro online"; Mercado Pago,
   PagSeguro e Iugu proíbem "conteúdo adulto" nos termos, mas há relatos de
   plataformas do nicho (ex. CRS, referência de mercado da spec) usando
   PagSeguro na prática; SyncPay se anuncia como especialista em nichos de
   alto risco mas tem reclamações de "propaganda enganosa" no Reclame Aqui —
   não totalmente confiável sem mais due diligence. Nenhum processador BR
   aceita esse nicho "por escrito"; Asaas foi a escolha pragmática (declarar
   a atividade de forma genérica, aceitar o risco de bloqueio se descoberto).
2. Registro de `lumeo.com.br` e busca de marca no INPI.
3. ~~Regra de tolerância para falha de pagamento recorrente~~ — 2 dias de
   carência (`overdue_since` + `effectiveSubscriptionStatus` em
   `src/lib/subscription.ts`; ver `src/app/api/webhooks/asaas/route.ts`).
4. ~~Prazo de retenção/exclusão dos arquivos de verificação~~ — descarte
   automático na aprovação (ver "Postura de compliance" acima) e, agora,
   reprovações abandonadas: `GET /api/cron/purge-verifications`
   (`src/app/api/cron/purge-verifications/route.ts`), agendado diariamente
   às 6h via Vercel Cron (`vercel.json`), apaga documento/vídeo de
   verificações reprovadas há mais de 30 dias sem reenvio (checa se a linha
   reprovada ainda é a mais recente do usuário antes de mexer no Storage,
   já que o path é fixo por usuário e pode ter sido sobrescrito por um
   reenvio). Protegido por `CRON_SECRET` (`.env.example`) — Vercel injeta
   esse token automaticamente no header `Authorization` das chamadas de cron.
