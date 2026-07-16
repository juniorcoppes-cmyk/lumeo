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
  falha com "Canal de suporte não configurado". **Feito em 2026-07-12**:
  conta real criada diretamente via service role (cadastro normal esbarrou
  em "email rate limit exceeded" do serviço de e-mail padrão do Supabase —
  ver pendências), e-mail `admloumeo@gmail.com`, `is_support_channel = true`,
  `discreet_mode = true` (não aparece em Comunidade/linha do tempo).
- Foto de perfil (`users.avatar_path`, pedido do fundador em 2026-07-12):
  uma foto única e canônica por usuário — diferente do álbum (corpo/rosto),
  substituída (não acumulada) a cada upload, `upsert: true` num nome fixo
  (`{user_id}/avatar/foto.{ext}`; se a extensão mudar entre uploads, o
  arquivo antigo é apagado manualmente na action antes do novo upload, já
  que o upsert não pega nomes diferentes). Mesma regra de visibilidade do
  "corpo": qualquer usuário verificado vê, em qualquer lugar que já mostra
  identidade (Comunidade, `/perfil/[id]`, linha do tempo) — policy de
  storage nova escrita direto com `is_verified()` (não a subquery aninhada
  em `users` que causou o bug de recursão do "corpo" original). Exposta
  pelas mesmas 3 RPCs que já carregam nome/selo de outros usuários
  (`browse_verified_users`, `get_verified_profile`, `get_timeline`).
- Recuperação de senha (pedido do fundador em 2026-07-13): `/login` tem link
  "Esqueci minha senha" → `/recuperar-senha` (pede e-mail, chama
  `resetPasswordForEmail`; mensagem de sucesso é sempre a mesma, exista ou
  não a conta, pra não permitir enumeração — Supabase já não erra nesse caso
  por padrão). `/auth/confirm/route.ts` recebe `token_hash`+`type` (não
  `code`/PKCE) e chama `verifyOtp`, estabelecendo uma sessão de recuperação
  antes de redirecionar pra `/redefinir-senha` (guard: sem sessão, volta pra
  `/recuperar-senha` com aviso de link expirado). **Passo manual pendente no
  painel do Supabase**: o template de e-mail "Reset Password" (Authentication
  → Email Templates) ainda usa o `{{ .ConfirmationURL }}` padrão, que passa
  pelo endpoint hospedado do Supabase em vez de ir direto pro nosso
  `/auth/confirm` — precisa trocar o link do template para
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`
  antes do fluxo funcionar ponta a ponta com e-mail real (só o `resetPasswordForEmail`
  em si foi testado ao vivo, sem erro; o clique no e-mail e a troca de senha
  não, por depender desse ajuste no painel). Mesma ressalva do rate limit de
  e-mail padrão do Supabase (ver "Produção") se aplica aqui.
  **Atualização (2026-07-13)**: SMTP customizado (Resend, `smtp.resend.com`,
  remetente `onboarding@resend.dev` — domínio de teste do Resend, trocar
  quando um domínio for registrado, ver pendência 2) configurado pelo
  fundador, o que desbloqueou a edição do template "Reset Password" no
  painel; o link já foi trocado para o formato acima. `resetPasswordForEmail`
  testado ao vivo em produção com e-mail real via Resend (demora ~15-20s, é
  uma chamada síncrona de SMTP dentro da server action) — o clique no e-mail
  em si ainda não foi confirmado ponta a ponta.
  **Atualização (2026-07-15)**: domínio `lumeo.app.br` verificado no Resend
  e sender trocado pra `noreply@lumeo.app.br` — ver "Correção crítica:
  cadastro travado" abaixo, mesmo ajuste que desbloqueou o signup também
  vale pra esse fluxo (o remetente de teste `onboarding@resend.dev` só
  entrega pro dono da conta Resend, afetava os dois).
- Conta ADM — duas idas e voltas de e-mail em 2026-07-13, resolvidas: a
  primeira tentativa (`admloumeo@gmail.com`, com "ou" a mais) foi corrigida
  para `amdlumeo@gmail.com` a pedido do fundador — só que essa também
  estava errada (letras 2/3 trocadas por engano na hora de me passar a
  correção). Nesse meio tempo descobri que **já existia uma segunda conta**,
  criada de verdade pelo fundador via cadastro normal em `admlumeo@gmail.com`
  (grafia natural "adm"+"lumeo") no dia da implementação do canal de
  suporte — só que ficou com `email_confirmed_at` nulo porque o cadastro
  esbarrou no rate limit de e-mail do Supabase (a mesma razão que me levou a
  criar uma conta alternativa via service role naquela hora, sem saber que a
  original já existia). Consolidado: a conta real (`admlumeo@gmail.com`)
  foi confirmada via `email_confirm: true`, teve a senha definida pelo
  fundador e recebeu o flag `is_support_channel`/`discreet_mode`; a
  duplicata (`amdlumeo@gmail.com`)
  foi apagada (checado antes: 0 posts/conversas/mensagens vinculadas, sem
  perda de dados). Login e `get_timeline()` confirmados via script
  (`signInWithPassword` com anon key, mesma chamada que a UI faz) depois da
  consolidação. **Se um cadastro novo "sumir" (parece não ter sido criado)
  no futuro, checar `auth.users` antes de recriar** — pode ser rate limit de
  e-mail deixando uma conta órfã não confirmada, não ausência real.
  **Atualização (2026-07-16) — a conta `admlumeo` NÃO EXISTE MAIS.** O
  fundador consolidou tudo numa conta só: a `junior.coppes@gmail.com`
  (perfil "Casalrssp", `profile_type = casal`, dele e da esposa) passou a
  ser **admin E canal de suporte** (`is_support_channel = true`), e a
  `admlumeo` foi apagada. Motivo direto: **a senha dela estava em texto
  puro aqui neste arquivo, num repositório público** — ou seja, qualquer
  um podia entrar como admin. Apagar a conta anulou a exposição (a senha
  foi removida deste arquivo, mas **continua no histórico do git**; o que
  resolveu de fato foi a conta deixar de existir). **Lição: nunca
  documentar senha/segredo aqui — este repositório é público.** Nota:
  `contact_admin()` usa `where is_support_channel = true limit 1`, então
  precisa existir **exatamente um** canal de suporte.
- Acesso do ADM à linha do tempo (2026-07-13): primeira tentativa foi um
  bypass específico dentro de `get_timeline()` (`20260713000000_...sql`),
  pra não mudar `is_verified()` globalmente. **Superado ainda no mesmo dia**:
  o fundador pediu explicitamente que o perfil ADM não precise de
  verificação em lugar nenhum do app, não só na linha do tempo — ver item
  abaixo, `is_verified()` agora inclui admin diretamente.
- Eventos — descrição, fotos e lista de presença (pedido do fundador em
  2026-07-13): `events` ganhou `description`, `photo_story_path` (vertical,
  pensado pra celular) e `photo_landscape_path` (horizontal, pensado pra
  desktop) — upload em `/admin/eventos` (na criação ou depois, via mini-form
  por evento; `upsert: true` num nome fixo por slot, mesma lição de
  storage+upsert já documentada abaixo). Bucket novo `event-photos`,
  privado, mas com select liberado a qualquer autenticado (não só
  verificado) — `/eventos` já era navegável por qualquer logado antes disso,
  só a inscrição exigia selo; só admin escreve (`is_admin()`, já existente).
  `/eventos/[id]` mostra a foto story em telas pequenas e a paisagem em
  telas médias/grandes (`md:hidden`/`hidden md:block`, puramente CSS
  responsivo — não depende de user-agent). Criação de evento já era
  admin-only (`events insert admin`, `20260711000005_admin_policies.sql`) —
  nenhuma mudança necessária aí. Listagem (`/eventos` e `events_with_open_slots`)
  já ordenava por `event_date` desde a migração original — também nenhuma
  mudança necessária. Lista de presença: reaproveita
  `confirmed_attendees_for_event`, que já restringe a leitura a quem também
  está confirmado no mesmo evento (não expõe presença pra quem só está
  navegando/não confirmou) — só ganhou `experience_level`/`avatar_path` pra
  ficar visualmente consistente com o resto do app.
- Início e Linha do tempo viraram uma aba só (pedido do fundador em
  2026-07-13): `/linha-do-tempo` foi removida; seu conteúdo (feed +
  composer de post de texto) passou a viver dentro de `/inicio`, abaixo dos
  blocos que já existiam ali ("Próximos eventos", "Indicações recebidas") —
  nenhum desses dois foi removido, só deixaram de ter uma aba própria pro
  feed ao lado. Mantive `/inicio` como rota canônica (não `/linha-do-tempo`)
  porque é o destino padrão de vários redirects já existentes (login sem
  `next`, guard de admin não-admin, pós-redefinição de senha) — trocar isso
  teria mais blast radius que só mover o feed.
- ADM vira admin de verdade, sem verificação em lugar nenhum (pedido do
  fundador em 2026-07-13, segunda rodada): `is_verified(p_user_id)` agora
  retorna `true` também quando `is_admin`, não só quando há
  `verification_badge_id` — como essa função é usada em praticamente tudo
  (Comunidade, álbum de fotos, avaliações, conexões, chat geral, avatar,
  geolocalização, timeline), o bypass passou a valer em todo o app de uma
  vez, substituindo o ajuste pontual de `get_timeline()` do item anterior.
  A conta ADM (`admlumeo@gmail.com`) recebeu `is_admin = true` via script
  (estado de conta, não schema) — com isso ela já acessa `/admin/eventos`
  pelo guard existente em `admin/layout.tsx`, sem policy nova. `/admin/eventos`
  ganhou edição (`updateEvent`, formulário dentro de um `<details>` por
  evento) e exclusão (`deleteEvent`, apaga as fotos do storage antes e
  depois a linha — FKs em cascade cuidam de inscrições/convites/conversas/
  posts `event_confirmed` na timeline).
- Período de teste de 1 semana + assinatura paga (pedido do fundador em
  2026-07-13): a partir da aprovação da verificação (`verifications.reviewed_at`
  da linha `status = 'approved'`), todo usuário tem 7 dias de acesso completo;
  depois disso, só quem tem assinatura ativa (`subscriptions.status = 'active'`,
  ou `'overdue'` ainda dentro da carência de 2 dias — mesma regra de
  `src/lib/subscription.ts`) continua com acesso completo. **Escopo da
  restrição, decisão explícita do fundador**: só afeta "contato direto"
  (iniciar conversa nova e mandar mensagem nova) — Comunidade, linha do
  tempo e perfis de outros continuam visíveis mesmo pra quem já passou do
  teste sem assinar. Implementado em `has_contact_access(uuid)`, checado em
  `start_conversation`, `start_conversation_general` e na policy de insert
  de `messages`. `contact_admin()` e qualquer conversa com quem tem
  `is_support_channel = true` **nunca são bloqueados** (mesma lógica que já
  deixa não-verificados contatarem o suporte) — a policy de `messages`
  insert tem esse escape explícito. `chat/[id]/actions.ts` agora captura
  erro do insert em `messages` e mostra uma mensagem amigável (a RLS de
  INSERT não tem como propagar o texto do `raise exception`, diferente das
  RPCs `start_conversation*`, que propagam normalmente via `error.message`).
  Ver `20260713000001_admin_full_bypass_and_trial_period.sql`.
- UX mobile e conveniências (pedido do fundador em 2026-07-13):
  - Mostrar/ocultar senha: `PasswordInput` (`src/components/PasswordInput.tsx`,
    client component) usado em login, cadastro e redefinição de senha.
  - Data de nascimento: trocado `<input type="date">` (obriga rolar ano a
    ano no celular) por texto livre "DD/MM/AAAA" com teclado numérico —
    `parseBirthDateInput`/`formatBirthDateForInput` em
    `src/lib/profile-options.ts` convertem pra/do formato `date` do Postgres.
  - Nav (`(logged)/layout.tsx` e `admin/layout.tsx`): virou scroll
    horizontal (`overflow-x-auto whitespace-nowrap`) em vez de quebrar/
    estourar em telas estreitas.
  - Planos: `src/lib/plans.ts` centraliza nome/preço/features (antes
    duplicado entre `/planos` e `/assinatura`, risco já documentado —
    continua sendo um array separado de `PLAN_PRICES` em
    `assinatura/actions.ts`, que é o valor cobrado de verdade no Asaas).
    Essencial = acesso completo ao app; Plus = descontos em eventos + lista
    VIP quando lota (**só descrito na página por enquanto** — o desconto de
    fato no preço do evento e a lista VIP de espera ainda não têm mecânica
    implementada, é um próximo passo se o fundador confirmar que quer isso
    de verdade).
  - PWA instalável + PIN de acesso rápido: `public/manifest.json` +
    `public/icon-192.png`/`icon-512.png`/`apple-touch-icon.png` (gerados de
    um SVG com `sharp`, só a letra "L" em fundo preto, script descartado
    depois de rodar) + metadata em `src/app/layout.tsx` (`manifest`,
    `icons`, `appleWebApp`). O "ícone na tela inicial" em si é o navegador
    quem oferece (Chrome Android mostra prompt de instalar; iOS Safari via
    "Adicionar à Tela de Início" no menu de compartilhar) — não tem como
    instalar sozinho sem o usuário confirmar, é limitação de toda PWA, não
    só do Lumeo. **PIN de 4 dígitos, decisão explícita do fundador**: é um
    cadeado de privacidade local (evita abrir o app sem querer se alguém
    pegar o celular destrancado), não autenticação de verdade — fica só em
    `localStorage` (hash SHA-256, nunca em texto puro, nunca no servidor),
    só ativa quando `display-mode: standalone` (instalado, não no navegador
    normal) e só se o usuário configurou um em `/perfil` (`PinSettings.tsx`).
    `PinLockGate.tsx` envolve `(logged)/layout.tsx` e `admin/layout.tsx` —
    sem PIN configurado ou fora do modo standalone, não faz nada. Esquecer o
    PIN não tem recuperação (é local); a saída é fechar/reabrir o app
    normalmente pelo navegador com login de verdade, ou fica sempre visível
    o link do site além do ícone.
  - Texto de posicionamento "Comece por aqui" no topo de `/inicio` (pedido
    do fundador em 2026-07-13): explica a proposta do Lumeo — social sem a
    pressão de que interação íntima precise acontecer, diferenciando de
    baladas liberais/apps de relacionamento comuns. Adaptado do texto que o
    fundador já usa pra divulgar o evento presencial mensal ("Secret 285
    Lounge"), removendo os detalhes específicos do espaço físico (não tem
    área de interação íntima etc.) pra falar da plataforma como um todo, já
    que o app hospeda vários eventos e a comunidade inteira, não só aquele
    encontro. Fica dentro de um `<details>` fechado por padrão (decisão do
    fundador: fixo/sempre visível ficaria repetitivo pra quem já usa o app
    com frequência) — sem JS, mesmo padrão já usado no formulário de editar
    evento em `/admin/eventos`.
- Desconto Plus e "lista VIP" (pedido do fundador em 2026-07-13, terceira
  rodada): **decisão explícita** — desconto não é um percentual fixo
  global, é por evento (`events.plus_price`, opcional, definido pelo admin
  ao criar/editar em `/admin/eventos`; página `/planos` continua sem citar
  valor, só "descontos especiais", de propósito). `inscrever()`
  (`eventos/[id]/actions.ts`) cobra `plus_price` em vez de `price` quando o
  usuário tem assinatura Plus `active` ou `overdue` dentro da carência
  (mesma `effectiveSubscriptionStatus` de `src/lib/subscription.ts`).
  "Lista VIP" **também é decisão explícita**: não é uma fila automática
  separada — o app já funciona com o admin confirmando manualmente cada
  inscrição (não existe auto-confirmação por capacidade), então "furar
  fila" significa mostrar o plano de cada inscrito e ordenar Plus primeiro
  entre os pendentes em `/admin/eventos` (nova policy `subscriptions select
  admin`, não existia leitura de assinatura alheia até agora). Em
  `/eventos/[id]`, quando `confirmed_count >= capacity`, o botão vira
  "Entrar na lista de espera" com uma mensagem diferente pra Plus
  (prioridade) vs quem não é. Nenhuma automação de promoção da fila —
  continua sendo o admin quem decide quem confirma quando abre vaga, só que
  agora vendo quem é Plus primeiro na lista. Ver
  `20260713000002_plus_discount_and_vip_waitlist.sql`.
- Quarta rodada (2026-07-13): link de admin sumido, convite sem retorno pro
  evento, e troca de plano quebrada:
  - **Bug real encontrado**: `(logged)/layout.tsx` nunca teve link pra
    `/admin/*` — só `admin/layout.tsx` tem esse nav, então quem loga e cai
    em `/inicio` (todo mundo, inclusive admin) não tinha como chegar em
    `/admin/eventos` sem digitar a URL. Isso explica os pedidos de "botão
    pra criar/editar/excluir evento" — os botões já existiam desde a
    rodada anterior, só não tinha como navegar até eles. Corrigido: link
    "Admin" condicional (`profile.is_admin`) no nav de `(logged)/layout.tsx`.
  - Link de convite: `CopyLinkButton.tsx` (client, `navigator.clipboard`)
    adicionado ao lado de cada link gerado em `/eventos/[id]`. Pra quem
    ainda não tem conta: "Cadastre-se" no convite agora passa
    `?invite={code}` pra `/cadastro/dados`, que guarda em
    `users.pending_invite_code` (via metadata do `signUp()`, mesmo padrão
    de `experience_level`/`referred_by` em `handle_new_user()`). Verificação
    aprova só depois de dias, então não dá pra redirecionar na hora — o
    hook fica em `(logged)/layout.tsx`: primeira página logada que a pessoa
    abrir depois de aprovada (login normal, sem precisar do link de novo)
    já redireciona pra `/convite/{code}` e limpa o campo (só dispara uma
    vez). Ver `20260713000003_invite_redirect_and_asaas_cleanup.sql`.
  - Teste grátis: não é um botão de "ativar" (já é automático desde a
    terceira rodada, a partir da aprovação da verificação) — o que faltava
    era visibilidade. `/assinatura` agora mostra quantos dias restam do
    teste (ou que acabou) quando não há assinatura ainda.
  - **Bug real encontrado e corrigido**: `choosePlan()` sempre criava uma
    assinatura NOVA no Asaas sem cancelar a antiga — reproduzido com o
    Asaas sandbox de verdade (script descartável): trocar de plano deixava
    duas assinaturas `ACTIVE` ao mesmo tempo pro mesmo cliente, cobrando as
    duas. Corrigido chamando `cancelSubscription()` (novo em `lib/asaas.ts`,
    `DELETE /subscriptions/{id}`) antes de criar a nova, sempre que já
    existe `asaas_subscription_id`. De quebra, o botão "Trocar/atualizar"
    aparecia no card do plano que a pessoa JÁ tinha (não no outro, que é o
    que faria sentido clicar pra trocar) — trocado por um selo "Seu plano
    atual" (sem botão) no plano vigente e "Trocar para {nome}" nos outros.
- Quinta rodada (2026-07-13): dois achados ao vivo pelo fundador testando
  como ADM no celular:
  - **Nav escondendo links sem indicação visual**: o ajuste "mobile" da
    quarta rodada (`overflow-x-auto whitespace-nowrap`) empurrava o link
    "Admin" (e qualquer outro que não coubesse) pra fora da tela, exigindo
    arrastar o dedo bem naquela faixa estreita sem nenhum sinal visual de
    que isso era possível — o fundador reportou "não aparece botão de criar
    evento" quando na real só estava fora da vista. Trocado por
    `flex-wrap`: tudo sempre visível, só ocupa mais altura.
  - **Bypass do ADM incompleto**: `is_verified()` (migração
    20260713000001) só se aplicava onde o código já chamava essa função.
    Comunidade, perfil de outro usuário e inscrição em evento tinham gates
    próprios checando `verification_badge_id` **do chamador** direto na
    coluna, sem passar por `is_verified()` — mesmo problema achado antes em
    `get_timeline()`, só que dessa vez em mais lugares e a nível de RLS, não
    só de página. Corrigido em duas frentes: as páginas (`comunidade`,
    `perfil/[id]`, `eventos/[id]`) passaram a checar
    `is_admin`/`is_support_channel` também, e as policies de RLS que
    faziam a mesma checagem crua do lado do chamador (`registrations insert
    own`, `photo requests insert own`, `profile_photos select verified
    corpo/rosto approved` e as duas policies equivalentes de
    `storage.objects`) foram recriadas usando `is_verified(auth.uid())` em
    vez da coluna direta — ver `20260713000004_admin_bypass_remaining_gates.sql`.
    **Checagens sobre quem está sendo visto/acessado (o dono da foto, do
    perfil) continuam olhando a coluna direto, de propósito** — o bypass é
    só pro ADM não precisar de selo próprio, não pra ele ver gente que
    também não é verificada.
- Filtros de busca na Comunidade (pedido do fundador em 2026-07-13):
  `browse_verified_users` ganhou `p_profile_filter` ('casais'/'homens'/
  'mulheres') e `p_experience_level`, além da distância que já existia.
  "Homens"/"mulheres" só filtra perfil individual (`profile_type` +
  `gender`); perfil casal sempre cai em "casais" independente do gênero de
  cada parceiro. Precisou dropar a função de 1 parâmetro antes de recriar
  com 3 — adicionar parâmetro via `create or replace` cria uma sobrecarga
  nova em vez de substituir (mesma lição já documentada). Ver
  `20260713000005_comunidade_filtros.sql`.
- Sexta rodada (2026-07-14):
  - **Planos deixam de ser hardcoded**: nova tabela `plans` (id/name/price/
    features), `/admin/planos` (novo, nav do admin) edita tudo — é o único
    lugar de verdade agora, tanto pra exibir em `/planos`/`/assinatura`
    quanto pro valor cobrado de fato no Asaas em `choosePlan()` (antes era
    um `PLAN_PRICES` hardcoded separado do `src/lib/plans.ts`, exatamente o
    tipo de duplicação que já tinha causado risco antes). Preços iniciais
    pedidos pelo fundador: Essencial R$ 29,90, Plus R$ 49,90. Select
    liberado geral (`using (true)`) porque `/planos` é página pública, sem
    login.
  - **Isenção de assinatura por usuário**: `users.subscription_exempt`,
    toggle em `/admin/usuarios`, conta pra `has_contact_access()` igual a
    ter assinatura ativa. **Adicionada ao guard-rail de
    `protect_sensitive_user_columns()`** — é uma coluna sensível nova
    (quem pode contatar outros sem pagar), mesma classe de vulnerabilidade
    de auto-promoção já corrigida antes; sem isso um usuário comum
    conseguiria se auto-isentar via chamada direta à API. Ver
    `20260714000000_editable_plans_and_exempt_users.sql`.
  - Filtros da Comunidade reorganizados num grid (label em cima, select
    embaixo) em vez de tudo numa linha só.
  - Fotos no chat: lista de conversas, "iniciar nova conversa" e a própria
    tela de conversa (que antes só dizia "Conversa", sem nem mostrar quem
    era o outro participante) agora mostram avatar + nome.
  - Títulos de página (`main h1`) ganharam fundo preto/texto claro via CSS
    global — mesmo padrão do feedback de clique, não precisou tocar em
    cada página.
- Sétima rodada (2026-07-14): indicação de evento com cor + avaliações de
  perfil ajustadas.
  - `event_invites.status` ganha `'declined'` (era só `'sent'`/`'accepted'`).
    Nova RPC `respond_invite(p_invite_id, p_status)` (não existia policy de
    UPDATE pra quem foi indicado — só o link tinha `accept_invite`). Em
    `/inicio`, "Indicações recebidas" agora mostra pendente em amarelo,
    aceita em verde, e recusada some da lista (`.neq("status", "declined")`
    na query). Só se aplica à indicação direta por selo
    (`convidarPorSelo`) — convite por link já nasce "accepted" no clique
    via `accept_invite`, então nunca aparece amarelo.
  - Avaliações de perfil ficam em `/perfil/[id]` (perfil de outro usuário),
    visível só com conexão aprovada — **restrição adicionada**: agora
    exige `connection_type in ('amigos_sociais', 'amigos_intimos')`
    especificamente (antes a policy aceitava qualquer tipo aprovado,
    inclusive "amigos_virtuais", que não devia poder avaliar). Tags
    trocadas de `bonito/bom_papo/gostoso/sensual/interessante` pra
    `bonito/bom_papo/inteligente/gostoso/engracado` (pedido do fundador) —
    trocado tanto no `check` da tabela quanto em `get_profile_rating_counts()`
    e em `src/lib/profile-options.ts`. Ver
    `20260714000001_invite_response_and_rating_tags.sql`.
- Oitava rodada (2026-07-14): notificação de comentário em foto + leitura
  de mensagem por aparelho pra perfil casal — **duas decisões explícitas do
  fundador**: notificação só dentro do app (sem push de verdade, que
  exigiria pedir permissão ao usuário e infraestrutura de Web Push — não
  construído), e leitura rastreada por aparelho (não por identidade
  declarada).
  - `notifications` (tabela nova, só o dono lê/marca como lida) + trigger
    `notify_photo_comment_trigger` em `photo_comments` (security definer,
    não existe policy de insert pra usuário comum de propósito). Nav ganha
    link "Notificações" com contador de não lidas; `/notificacoes` marca
    tudo como lido ao abrir, mesmo padrão do `/chat/[id]`.
  - Leitura por aparelho: perfil casal usa o mesmo login em dois celulares
    — não tem como saber "qual dos dois" leu pela sessão (é a mesma
    conta). Cookie `lumeo_device_id` (gerado no middleware, 5 anos) mais
    tabela nova `message_reads (message_id, device_id)` substituem
    `messages.read_at` (coluna antiga fica no schema sem uso — nada mais
    escreve nela). Mensagem só considerada lida quando o número de
    aparelhos distintos que confirmaram bate com o esperado:
    `profile_type = 'casal'` exige 2, `'individual'` exige 1. **Limitação
    conhecida**: se o casal usar sempre o mesmo aparelho/navegador (só 1
    device_id), a mensagem nunca vai "des-negritar" — o mecanismo pressupõe
    2 aparelhos físicos distintos, como o fundador confirmou ser o caso
    real de uso. Policy de insert em `message_reads` exige
    `sender_id <> auth.uid()` — sem isso o próprio remetente poderia
    inserir um device_id falso e fingir que a própria mensagem foi lida.
    Ver `20260714000002_notifications_and_per_device_read.sql`.
- Nona rodada (2026-07-14): resolvida a limitação de aparelho único do
  casal + curtida de foto.
  - `users.couple_single_device`: toggle em `/perfil` (só aparece pra
    `profile_type = 'casal'`) — "vocês dois acessam pelo mesmo celular".
    Marcado, `chat/[id]/page.tsx` passa a exigir só 1 aparelho confirmando
    leitura em vez de 2 (senão nunca sairia do negrito nesse caso).
  - Curtida de foto do álbum, ícone 😈 (carinha de diabo, mesmo emoji do
    WhatsApp): tabela `photo_likes`, mesma regra de visibilidade de
    `photo_comments` (quem vê a foto pode curtir/descurtir, é um toggle).
    Contagem agregada pública via `get_photo_like_counts` — **não expõe
    quem curtiu**, mesma decisão de privacidade já usada em
    `profile_ratings`. Botão aparece tanto na miniatura (contagem pequena)
    quanto no lightbox (maior, com rótulo). Ver
    `20260714000003_couple_single_device_and_photo_likes.sql`.
- Décima rodada (2026-07-14): denúncia de usuário. Botão "Denunciar este
  perfil" em `/perfil/[id]` (dentro de um `<details>`, escondido por
  padrão — é uma ação séria, não precisa estar sempre visível), motivo +
  descrição opcional, vai pra `user_reports`. `/admin/denuncias` (nova, nav
  do admin com contador de pendentes) lista tudo, admin marca como
  revisada com uma nota — **não faz nenhuma ação automática** (banir,
  suspender), só organiza a fila; a decisão de "tomar as providências" (o
  fundador quem decide o quê, caso a caso) usa as ferramentas que já
  existem (`/admin/usuarios`, remover selo, etc.) ou uma nova se ele pedir.
  Quem denunciou só vê a própria denúncia; admin vê todas. Ver
  `20260714000004_user_reports.sql`.
- Décima primeira rodada (2026-07-14): `/regras` (Manual de Boas
  Convivências — conteúdo redigido por Claude, aprovado tacitamente pelo
  fundador que só pediu o local; conteúdo em si nunca foi confirmado item a
  item), linkado no cadastro (junto de Termos/Privacidade no checkbox de
  aceite), na home e no rodapé de `/termos`. Mínimo de fotos pra aprovar
  verificação (pedido do fundador): 6 no álbum no total; perfil casal
  precisa de pelo menos 2 fotos de corpo inteiro — **decisão explícita**:
  trava só na aprovação (não bloqueia cadastro nem visibilidade), e é um
  aviso pro admin em `/admin/verificacoes`, não um bloqueio automático do
  botão "Aprovar". **Limitação técnica reconhecida e comunicada ao
  fundador**: o sistema não consegue confirmar que as 2 fotos de corpo
  mostram duas pessoas diferentes (exigiria reconhecimento de imagem) — a
  contagem é só um piso mínimo; confirmar visualmente que é o casal de
  verdade continua sendo julgamento do admin ao revisar. Mesmo aviso
  também aparece no cadastro (`/cadastro/dados`, ao lado do campo de tipo
  de perfil) e em `/perfil` (acima do álbum) — nenhuma mudança de schema
  nesta rodada, só UI e o aviso em `/admin/verificacoes`.
- Décima segunda rodada (2026-07-14): três ajustes pequenos.
  - `/regras` não tinha link nenhum na área logada (só na home/cadastro,
    pra quem ainda não tinha conta) — fundador não achava o botão. Link
    "Regras" adicionado no nav de `(logged)/layout.tsx`.
  - `/regras` ganhou "(Código de Conduta)" como subtítulo, embaixo do
    título principal.
  - `LocationShareButton.tsx` (`/perfil`, "Compartilhar minha
    localização"): ícone de mapa dobrado com um pin (SVG inline, sem
    texto dentro do desenho) num quadrado 40×40 antes do botão — antes era
    só texto, sem nenhum elemento visual ali.

- Décima terceira rodada (2026-07-14/15): identidade visual "Calor",
  redesenho de menu e correção crítica de cadastro.
  - **Identidade visual "Calor"**: nova paleta (espresso `#3a2420` cards
    sobre fundo `#241512`, coral `#d6524f` de acento, cantos grandes,
    botões/tags em pill) aplicada em tokens no `globals.css` e em todas
    as ~40 páginas do app (públicas, cadastro, logadas, admin),
    substituindo o preto/branco/cinza original. Ver decisão completa e
    spec de tokens na memória `project-lumeo-visual-identity` (fora do
    repo). **Bug real encontrado em produção**: a regra `a { color:
    var(--accent) }` estava fora de qualquer `@layer` do Tailwind v4 —
    isso faz uma regra vencer QUALQUER utilitário (`text-*`, `pr-*`
    etc.), inclusive em componentes próprios como `.btn-primary`/`.input`
    que também foram escritos sem `@layer components` inicialmente.
    Sintoma visual: o item ativo do menu ficava com texto/ícone da MESMA
    cor do fundo (invisível), e um `pr-16` de um botão "Mostrar senha"
    era ignorado. Corrigido movendo essas regras pra `@layer base` /
    `@layer components` — é o padrão que o próprio Tailwind recomenda
    exatamente pra isso, vale lembrar em qualquer CSS global novo.
  - **Menu redesenhado**: ícones dos itens principais (Início, Eventos,
    Comunidade, Chat, Perfil — e equivalentes do admin) no cabeçalho,
    com destaque de página ativa via `PrimaryNav.tsx` (client component,
    `usePathname()`); itens secundários (Notificações, Assinatura,
    Regras, Admin, Sair) viraram uma faixa fixa no rodapé. Ícones em
    `src/components/icons.tsx` (SVG inline, sem depender de lib nova).
    Decisão de layout (o quê fica no topo vs. rodapé) só foi fechada
    depois de uma pergunta de esclarecimento — "no rodapé" tinha duas
    leituras possíveis (duas barras embaixo vs. primário em cima e
    secundário embaixo) e o fundador queria a segunda.
  - **Performance**: `/inicio`, `/perfil`, `/perfil/[id]` e
    `/eventos/[id]` faziam de 4 a 6 consultas sequenciais ao Supabase
    sem depender uma da outra — paralelizadas com `Promise.all`. Achado
    mais impactante: o layout logado E cada página chamavam
    `supabase.auth.getUser()` cada um por conta própria, dobrando as
    idas e vindas até o servidor de Auth em toda navegação — novo
    `src/lib/supabase/get-user.ts` usa `cache()` do React pra memoizar
    por requisição (só a primeira chamada bate na rede). O middleware
    (`src/lib/supabase/middleware.ts`) continua com sua própria
    `getUser()` — necessária pra refresh de token, roda fora da árvore
    React e não dá pra deduplicar com `cache()`. `loading.tsx` adicionado
    nas áreas pública/logada/admin pra feedback visual imediato.
  - **Correção crítica: cadastro travado (2026-07-15)** — dois usuários
    reais e o próprio fundador não conseguiam se cadastrar; login dava
    "senha ou e-mail errado" mesmo com credenciais certas. **Causa raiz
    reproduzida com script** (`supabase.auth.signUp()` via anon key,
    igual ao código de produção): retornava erro 500 opaco (`message:
    "{}"`) e não criava nenhuma linha em `auth.users` — batia com a
    restrição conhecida do domínio de teste do Resend
    (`onboarding@resend.dev` só entrega pro dono da conta Resend, nunca
    documentado como bloqueante até esse dia). Resolvido em 3 passos,
    cada um confirmado por teste antes do próximo: (1) fundador
    verificou o domínio `lumeo.app.br` no Resend, (2) trocou o "Sender
    email" no Supabase pra `noreply@lumeo.app.br`, (3) atualizou o
    template "Confirm signup" pro formato customizado (mesmo padrão já
    usado no "Reset Password" — `{{ .SiteURL }}/auth/confirm?token_hash=
    {{ .TokenHash }}&type=signup&next=/cadastro/documento`). Teste final
    simulou o clique no link de confirmação de verdade (token gerado via
    Admin API `generateLink`, sem depender de caixa de entrada real)
    contra o servidor local e confirmou redirect + cookie de sessão
    corretos. Mudanças de código, independentes da causa raiz: campo de
    confirmar senha em `/cadastro/dados`, mensagens de erro do Supabase
    normalizadas (`src/lib/auth-errors.ts` — evita mostrar `{}` cru pro
    usuário), nova página `/cadastro/confirme-email` (pro caso de
    `signUp()` retornar sem sessão, i.e., confirmação de e-mail exigida,
    com botão de reenviar), e `/auth/confirm/route.ts` agora escolhe a
    página de erro certa por `type` (antes, um link de signup que
    falhasse caía em `/recuperar-senha`, sem sentido nenhum). **Scripts
    de diagnóstico usados foram descartáveis** (deletados depois de cada
    rodada de teste, seguindo o padrão já estabelecido do projeto) — se
    esse tipo de bug voltar a acontecer, o roteiro é: (a) checar
    `auth.admin.listUsers()` pra ver se `email_confirmed_at`/linhas
    novas aparecem, (b) reproduzir `signUp()` via anon key isolado, (c)
    se opaco, chamar o endpoint REST `/auth/v1/admin/generate_link`
    direto com a service role pra pegar o erro cru (o SDK JS às vezes
    engole o corpo do erro em `{}`).
  - **Continuação do mesmo incidente, mesmo dia**: com os 3 passos acima
    resolvidos, o e-mail de confirmação passou a chegar de verdade — mas
    o link dava "Safari não pôde se conectar ao servidor". Causa: Site
    URL do projeto no Supabase (Authentication → URL Configuration)
    ainda estava em `http://localhost:3000` (valor padrão de
    desenvolvimento), e é isso que `{{ .SiteURL }}` no template resolve
    — o link mandava o celular do usuário tentar abrir `localhost`, que
    só existe na máquina de quem desenvolveu. Confirmado chamando
    `generate_link` e lendo o campo `redirect_to` da resposta antes e
    depois da correção. Fundador trocou Site URL pra
    `https://lumeo-alpha.vercel.app` e adicionou
    `https://lumeo-alpha.vercel.app/**` em Redirect URLs. Teste final
    desta vez bateu direto em produção (não só localhost): gerou um
    link de verdade via `generate_link`, fez o `GET` no
    `/auth/confirm` de `lumeo-alpha.vercel.app` e confirmou redirect +
    cookie de sessão — cadastro funcionando ponta a ponta em produção.
    **Lição pro futuro**: sempre que o SMTP/domínio de e-mail for
    trocado ou o projeto for promovido de local pra produção, checar
    Site URL e Redirect URLs no painel — não é algo que o deploy ou a
    troca de sender ajusta sozinho.
- Décima quarta rodada (2026-07-15): ajustes de mobile, destaque visual
  no admin, foto de evento na home e isenção de assinatura com prazo.
  - **Cortes de tela no mobile** (achado real, reportado pelo fundador):
    a linha de cada pessoa em `/comunidade` (avatar + nome + tipo +
    selos + botão) não quebrava nem truncava — corrigido com
    `flex-wrap`, `min-w-0`/`truncate` no nome. Em `/perfil`, os
    `<input type="file">` de upload de foto têm um botão nativo largo
    no celular que empurrava o resto da linha pra fora da tela —
    envolvidos em `flex-wrap` com `min-w-0`. A tabela de
    `/admin/usuarios` não tinha rolagem horizontal — envolvida num
    `overflow-x-auto`. Também aumentada a folga do rodapé fixo
    (`pb-16` → `pb-24`) e adicionado `env(safe-area-inset-bottom)`.
  - `/admin/eventos`: linha do inscrito fica verde quando confirmado,
    os botões "Confirmar"/"Cancelar" mudam de cor sólida quando já é o
    estado atual — antes não tinha nenhuma pista visual de quem já
    tinha sido confirmado.
  - `/inicio`: cards de "Próximos eventos" ganharam a foto paisagem,
    ícone e descrição do evento (antes só apareciam em `/eventos`).
  - **Isenção de assinatura com prazo** (`users.subscription_exempt_until`,
    `20260715000000_exempt_subscription_expiration.sql`): admin escolhe
    "Isentar 30 dias" ou "Isentar até revogar" em `/admin/usuarios`;
    `NULL` = sem prazo. `has_contact_access()` passa a checar
    `subscription_exempt_until is null or subscription_exempt_until >
    now()`. A coluna nova entrou no mesmo guard-rail de
    `protect_sensitive_user_columns()` das outras colunas sensíveis —
    sem isso seria uma vulnerabilidade de auto-isenção com prazo longo,
    mesma classe já corrigida antes. Testado ao vivo contra o banco real
    (5 cenários: sem isenção, sem prazo, prazo futuro, prazo vencido,
    isenção removida) via script descartável antes do commit.
- Décima quinta rodada (2026-07-15): busca por nome na Comunidade.
  `browse_verified_users` ganha `p_name_query` (ilike, case-insensitive),
  reaproveitando as mesmas regras de privacidade (discreet_mode,
  autoexclusão, exigência de verificação) — precisou dropar a versão de
  3 parâmetros antes de recriar com 4 (mesma lição de sempre). Novo
  endpoint `GET /api/comunidade/search` alimenta um dropdown de
  sugestões com debounce de 300ms (`ComunidadeSearch.tsx`, client
  component) conforme a pessoa digita; o mesmo campo também participa
  do formulário de filtros pra busca completa via submit normal
  (progressive enhancement). Testado contra o banco real com login
  autêntico: busca parcial, case-insensitive, autoexclusão do próprio
  usuário logado, busca vazia. Ver `20260715000001_comunidade_busca_por_nome.sql`.
- Décima sexta rodada (2026-07-15): reestruturação completa do
  cadastro — a mudança mais profunda no controle de acesso desde a
  correção de segurança crítica original. **Decisão do fundador**:
  cadastro direto sai do ar; só existe via convite geral gerado por um
  usuário já verificado (o "padrinho"). Documento/vídeo de identidade
  saem do fluxo — verificação vira social, em duas etapas.
  - **Fluxo**: `/cadastro/dados` exige `?code=` de um convite válido
    (RPC `get_platform_invite_preview`, nova tabela `platform_invites`
    — distinta de `event_invites`, que continua existindo só pra
    indicação de evento). Ganha campo de escolha de plano (armazena a
    preferência em `users.preferred_plan`, a cobrança de fato continua
    só acontecendo depois em `/assinatura` — não foi automatizada
    nesta rodada, de propósito, pra não empurrar setup de pagamento
    pro meio do cadastro). Perde as etapas `/cadastro/documento` e
    `/cadastro/video` (páginas continuam existindo no código, só
    ficaram órfãs — nada mais linka pra elas). Depois de enviar, cai
    em `/cadastro/aguardando-padrinho`, sem nenhum acesso ainda.
  - **Apadrinhamento**: `users.membership_status` (`pending_sponsor` →
    `provisional` → `member`, ou `rejected_by_sponsor`/
    `rejected_by_admin`) substitui a dependência de `verifications`
    como gate — mas **reaproveita `verification_badge_id` como o
    mesmo gate de acesso que já existia em toda a aplicação**
    (Comunidade, timeline, eventos etc.), só muda quando/como ele é
    concedido. Isso foi deliberado pra não precisar tocar nas ~10
    páginas que já checavam esse campo. `SponsorGate.tsx` bloqueia o
    padrinho inteiro (tela cheia, mesmo padrão do `PinLockGate`)
    sempre que existe alguém com `referred_by` apontando pra ele e
    `membership_status = 'pending_sponsor'` — ele precisa aceitar ou
    recusar antes de usar o resto do app. Aceitar (RPC
    `respond_sponsorship`) já concede o badge na hora (formato
    `LUM-XXXXXXXX`, mesmo padrão do fluxo antigo) — acesso completo
    imediato, ainda não é "membro efetivo". `/admin/verificacoes` virou
    a fila de confirmação definitiva em até 48h (contadas a partir de
    `sponsor_responded_at`): mostra perfil/bio/fotos do álbum em vez de
    documento/vídeo (reaproveita `PhotoGallery` só pra visualização),
    `admin_finalize_membership` aprova (`member`, `member_since = now()`)
    ou reprova (revoga o badge).
  - **Postura de compliance, decisão explícita e registrada**: isso
    reverte a postura documentada em "Postura de compliance" abaixo —
    o Lumeo deixou de exigir documento de identidade antes de liberar
    acesso, substituindo por aval social (padrinho + revisão de perfil
    da ADM). Fundador foi avisado da mudança de postura antes de
    implementar e confirmou que era a decisão pretendida.
  - **Dois bugs reais de SQL encontrados testando contra o banco de
    verdade** (não na regra de negócio, na implementação): (1)
    `gen_random_bytes()` chamado dentro de uma função com
    `search_path = public` não encontra o pgcrypto, que fica no schema
    `extensions` no Supabase — precisa qualificar
    (`extensions.gen_random_bytes`). (2) mais sério: `respond_sponsorship`
    e `admin_finalize_membership` são `security definer`, mas isso não
    muda o que `auth.role()`/`is_admin()` enxergam dentro da trigger
    `protect_sensitive_user_columns()` (ela olha o JWT de quem chamou,
    não o dono da função) — as duas RPCs ficavam bloqueadas pelo
    próprio guard-rail que deveriam conseguir atravessar. Corrigido com
    uma flag de sessão (`set_config('lumeo.bypass_sensitive_guard',
    'true', true)`, local à transação) que só essas duas funções ligam,
    depois de já terem validado autorização própria — não abre brecha
    nova. **Vale lembrar isso ao escrever qualquer RPC `security
    definer` nova que precise escrever em coluna protegida por essa
    trigger.** Ver `20260715000003_fix_apadrinhamento_bugs.sql`.
  - **Guard-rail estendido**: `membership_status`, `sponsor_responded_at`
    e `member_since` entraram em `protect_sensitive_user_columns()`
    (mesma classe de vulnerabilidade de auto-promoção já corrigida
    antes). `handle_new_user()` nega por padrão — sem código de convite
    válido no metadata, a linha nasce `pending_sponsor` (bloqueada), não
    `member`; contas administrativas criadas via script (como a conta
    ADM) precisam setar `membership_status = 'member'` manualmente
    depois, mesmo padrão já usado pra `is_admin`/`is_support_channel`.
  - **Trial de 7 dias migrado**: `has_contact_access()` usava
    `verifications.reviewed_at`, que o fluxo novo nunca preenche — passa
    a contar a partir de `member_since`. `/assinatura` também atualizada
    (calculava o mesmo trial localmente, de forma redundante).
  - **21 cenários testados contra o banco real antes do commit**
    (script descartável, deletado depois): caminho feliz completo
    (convite → cadastro → aceite → acesso → confirmação da ADM), os
    dois caminhos de rejeição, e 5 checagens de segurança (não-padrinho
    não aceita em nome de outro, não-admin não confirma, autopromoção
    bloqueada, autoatribuição de selo bloqueada, convite usado não pode
    ser reaproveitado). **Achado durante o teste, não é bug**: dois
    "usuários de teste órfãos" ficaram no banco depois de rodadas que
    quebraram no meio (script sem `try/finally` na primeira versão) —
    corrigido no próprio script, mas serve de lembrete: sempre envolver
    scripts de teste descartáveis em `try/finally` pra garantir limpeza
    mesmo se algo no meio explodir.
  - Convites gerais gerados em `/perfil` (seção nova, só aparece pra
    quem já é verificado) — `platform_invites`, RLS exige
    `is_verified(auth.uid())` no insert.

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
de assumir que a plataforma está fora do escopo da lei. Documento/vídeo de
verificação eram apagados do Storage assim que aprovados, nunca reutilizados
para outra finalidade além da verificação em si.

**Atualização (2026-07-15, décima sexta rodada)**: essa postura foi
**revertida por decisão explícita do fundador** — o cadastro não pede mais
documento/vídeo de identidade. A verificação virou social (padrinho +
revisão de perfil da ADM em até 48h), ver detalhes na rodada 16 acima. O
fundador foi avisado dessa mudança de postura antes da implementação e
confirmou que era a decisão pretendida — não foi um descuido. Se a validade
jurídica dessa abordagem (verificação sem documento, pra um app já tratado
como sujeito à ECA Digital) precisar ser reavaliada, é uma conversa a se
retomar antes de tráfego real de lançamento, não algo já resolvido aqui.

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
- Deploy: Vercel, conectado a `github.com/juniorcoppes-cmyk/lumeo`, branch
  `master`, deploy automático a cada push. Ainda acessível por
  [lumeo-alpha.vercel.app](https://lumeo-alpha.vercel.app), mas o **domínio
  principal agora é `https://www.lumeo.app.br`** (configurado 2026-07-15).
- **Domínio principal `www.lumeo.app.br` (2026-07-15)**: `lumeo.com.br` está
  registrado por um terceiro (ver [Pendências](#) item 2), então o fundador
  adotou o `lumeo.app.br` (que já era dele, usado pro remetente de e-mail)
  como domínio do app — ver Pendências item 2. Config: Vercel (domínio +
  records), registro.br
  (A `lumeo.app.br` → `216.198.79.1`, CNAME `www` → vercel-dns; os records
  de e-mail do Resend — DKIM/MX/SPF/DMARC — ficaram intactos), e Supabase
  (Site URL → `https://www.lumeo.app.br`; Redirect URLs incluem
  `https://www.lumeo.app.br/**`, `https://lumeo.app.br/**` e o antigo
  `https://lumeo-alpha.vercel.app/**`). **A forma canônica é o `www`** — o
  apex `lumeo.app.br` faz 308 redirect pro `www`. O código não tem domínio
  hardcoded (URLs montadas via `window.location.origin`/`headers().origin`),
  então nada precisou mudar no app. Verificado ao vivo: DNS propagado nos 3
  resolvers, app servindo com TLS válido, `origin` = `https://www.lumeo.app.br`,
  `/auth/confirm` roteando certo por tipo, e a Admin API `generate_link`
  confirmando `redirect_to = https://www.lumeo.app.br` (ou seja, os e-mails de
  confirmação/reset já apontam pro domínio novo, sem editar template, pois
  usam `{{ .SiteURL }}`). **Nota de diagnóstico**: a máquina do dev tem Avast
  interceptando TLS (MITM de antivírus) — se um cert vier com issuer "Avast
  Web/Mail Shield", é artefato local, não da Vercel; validar pelo navegador
  remoto/externo.
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
- **Envio de e-mail de cadastro está no serviço padrão do Supabase**, que
  tem um limite de envios por hora bem baixo (pensado só para
  desenvolvimento) — erro visto ao vivo: "email rate limit exceeded" ao
  tentar cadastrar a conta ADM pelo fluxo normal (contornado criando a
  conta direto via service role, sem depender do envio de e-mail). Antes de
  aceitar volume real de cadastro, configurar um provedor de SMTP próprio
  nas configurações de Auth do Supabase.

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
2. Registro de domínio: **`www.lumeo.app.br` é o domínio principal do app
   desde 2026-07-15** (Vercel + registro.br + Supabase configurados — ver
   "Produção"). `lumeo.app.br` já era do fundador (usado pro remetente de
   e-mail no Resend). **`lumeo.com.br` está registrado por um terceiro**
   (Antonio Rafael Dias da Silva, criado 20/03/2026, válido até 20/03/2028,
   e-mail rafael.cdc97@gmail.com) — só obtível via compra negociada; por isso
   o fundador optou pelo `.app.br`. **Busca de marca no INPI feita 2026-07-15**
   (informativa, não é parecer jurídico): a marca nominativa "LUMEO" está
   LIVRE na classe 45 (namoro/rede social — a mais relevante), mas há um
   pedido pendente recente na classe 41 (eventos) da JET Soluções Educacionais
   (dep. 14/05/2026) e a Alcon tem "LUMEO" registrado vivo na classe 10
   (médico, ramo distinto). Depósito de marca ainda não feito — exige conta
   gov.br + GRU e, idealmente, um agente de PI; classes-alvo sugeridas: 45
   (core), 41 (eventos), 9/42 (software). Detalhes na memória
   `project-lumeo-domain-trademark` (fora do repo).
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
