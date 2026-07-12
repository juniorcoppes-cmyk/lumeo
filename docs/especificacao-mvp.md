# Lumeo — Especificação técnica (MVP v1)
> Documento de referência para desenvolvimento com Claude Code. Consolida escopo, arquitetura de informação, fluxos de usuário, modelo de dados e stack técnica definidos no planejamento do produto.
---
## 1. Visão geral do produto
Plataforma web (responsiva, acessível pelo navegador do celular, sem necessidade de loja de app na primeira fase) voltada ao público liberal/lifestyle brasileiro, unindo eventos presenciais de socialização de baixa pressão a um ambiente digital verificado e com curadoria.
**Nome da plataforma:** Lumeo
**Público-alvo:** casais, homens e mulheres do meio liberal, começando na região onde o evento presencial já acontece (o fundador possui um lounge próprio, o que reduz custo de produção de eventos).
**Posicionamento estratégico:** Lumeo se posiciona como plataforma de curadoria e verificação séria — não como rede social explícita. A dor central do público-alvo é medo de julgamento e necessidade de discrição; todo o tom de marca e toda decisão de produto devem reforçar isso.
**Referência de mercado:** CRS (CRSnofake / Capital Real Swing) — rede por convite, com aprovação de identidade pela equipe, majoritariamente composta por casais (~80%). Pontos fracos relatados por ex-usuários: falta de transparência na moderação e banimentos sem explicação. O Lumeo deve resolver isso com feedback claro em toda decisão de aprovação/reprovação.
### Escopo desta fase (Caminho A)
Este documento cobre exclusivamente o **MVP enxuto**. Um conceito de produto mais amplo, inspirado em redes sociais de nicho já maduras (feed público, radar geolocalizado, fórum, grupos, álbuns separados rosto/corpo, mensageria dupla), foi avaliado e **fica registrado como roadmap de fase 2/3+**, não faz parte deste escopo. Dois elementos baratos desse conceito futuro já foram incorporados ao MVP por reforçarem o diferencial de discrição:
- Selo de verificação com ID único no perfil
- Modo de navegação discreta (oculta atividade do usuário)
### Fora do escopo desta fase
Feed social público, radar geolocalizado, fórum, grupos, app nativo iOS/Android, sistema de reputação pós-encontro.
---
## 2. Funcionalidades do MVP
1. **Cadastro e perfil de usuário** — upload de documento e vídeo curto de verificação, campo de indicação por "padrinho" (usuário já verificado que vouches por um novo cadastro).
2. **Módulo de eventos** — criar evento, exibir vagas, vender/confirmar inscrição, indicar evento para outra pessoa dentro do app.
3. **Chat simples** — liberado apenas entre pessoas confirmadas no mesmo evento (evita mensagens abertas em massa).
4. **Assinatura mensal recorrente** — dois planos: Essencial (R$34,90) e Plus (R$59,90), valores de referência ajustáveis.
5. **Painel administrativo** — aprovação manual de verificações de identidade e gestão de eventos.
---
## 3. Sitemap
**Público (sem login)**
- `/` — Home institucional (tom editorial, não explícito)
- `/como-funciona` — explica verificação, padrinho, curadoria
- `/planos` — Essencial vs Plus
- `/login` / `/cadastro`
**Cadastro**
- `/cadastro/dados`
- `/cadastro/documento`
- `/cadastro/video`
- `/cadastro/padrinho`
- `/cadastro/aguardando`
**Área logada**
- `/inicio` — próximos eventos + indicações de amigos
- `/eventos` — lista com vagas
- `/eventos/:id` — detalhe, inscrição, indicar amigo
- `/chat` — lista de conversas (só com confirmados no mesmo evento)
- `/chat/:id` — conversa individual
- `/perfil` — dados, selo de verificação com ID único, toggle de navegação discreta, plano atual
- `/assinatura` — gestão de pagamento
**Admin (equipe)**
- `/admin/verificacoes` — fila de aprovação de documento/vídeo
- `/admin/eventos` — criar/editar evento, ver inscritos
- `/admin/usuarios` — gestão geral
---
## 4. Fluxos de usuário
### 4.1 Cadastro → Verificação

```
Cadastro de dados
      ↓
Documento + vídeo (upload de verificação)
      ↓
Análise da equipe (aprovação manual)
      ↓
   ┌──┴──┐
Aprovado   Reprovado
(perfil    (feedback claro
liberado)   ao usuário +
            opção de reenvio)
```

**Regra de negócio:** toda reprovação deve incluir motivo específico (documento ilegível, vídeo incompleto, etc.) e permitir reenvio — resolve a falha de transparência observada em referências de mercado como o CRS.
### 4.2 Inscrição em evento

```
Ver evento → Confirmar vaga → Pagamento confirmado → Presença confirmada
                                                       (libera chat do evento)
```

### 4.3 Chat liberado

```
Você confirmado no evento  ┐
                            ├→ Chat liberado (apenas entre os dois)
Outro confirmado no evento ┘
```

O chat só existe como consequência de ambos os usuários estarem confirmados no mesmo evento.
### 4.4 Assinatura

```
Escolha do plano (Essencial ou Plus)
      ↓
Pagamento recorrente
      ↓
Acesso liberado (conforme plano escolhido)
      ↺ renovação mensal automática
```

**Ponto em aberto:** definir regra de tolerância para falha de pagamento (ex: 3 dias de tolerância com acesso suspenso antes de cancelar a assinatura).
---
## 5. Modelo de dados (ERD)

```
USERS ||--o{ VERIFICATIONS : submits
USERS ||--o{ EVENT_REGISTRATIONS : registers
EVENTS ||--o{ EVENT_REGISTRATIONS : has
EVENTS ||--o{ CONVERSATIONS : hosts
USERS ||--o{ CONVERSATIONS : joins
CONVERSATIONS ||--o{ MESSAGES : contains
USERS ||--o{ MESSAGES : sends
USERS ||--o| SUBSCRIPTIONS : has
```

### USERS
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| name | string | |
| email | string | |
| profile_type | string | individual / casal |
| verification_badge_id | string | número de selo exibido no perfil |
| discreet_mode | boolean | modo de navegação discreta |
| referred_by | uuid (FK → USERS.id) | auto-referência — implementa o "padrinho" |
### VERIFICATIONS
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| document_url | string | **dado sensível — ver seção 7** |
| video_url | string | **dado sensível — ver seção 7** |
| status | string | pending / approved / rejected |
| rejection_reason | string | obrigatório quando status = rejected |
### EVENTS
| Campo | Tipo |
|---|---|
| id | uuid (PK) |
| title | string |
| event_date | timestamp |
| location | string |
| capacity | int |
### EVENT_REGISTRATIONS
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| event_id | uuid (FK) | |
| user_id | uuid (FK) | |
| status | string | pending / confirmed / cancelled |
| payment_status | string | cobrança pontual, distinta da assinatura |
### CONVERSATIONS
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| event_id | uuid (FK) | amarra a conversa ao evento que a originou |
| user_a_id | uuid (FK) | |
| user_b_id | uuid (FK) | |
### MESSAGES
| Campo | Tipo |
|---|---|
| id | uuid (PK) |
| conversation_id | uuid (FK) |
| sender_id | uuid (FK) |
| content | text |
| sent_at | timestamp |
### SUBSCRIPTIONS
| Campo | Tipo |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK) |
| plan | string (essencial / plus) |
| status | string |
| renewed_at | timestamp |
---
## 6. Stack técnica
| Camada | Escolha | Justificativa |
|---|---|---|
| Frontend + Backend | Next.js | Framework validado, boa integração com Claude Code, SSR bom para SEO da home institucional |
| Auth + banco + storage | Supabase | Postgres gerenciado + autenticação + storage em um produto único, com Row Level Security (RLS) para restringir acesso a dados sensíveis diretamente no banco |
| Hospedagem | Vercel | Integração nativa com Next.js |
| Pagamento (assinatura + eventos) | Em aberto | Pesquisar diretamente com 2-3 processadores brasileiros antes de travar arquitetura — políticas de aceitação para nicho lifestyle variam e mudam com frequência |
**Custo estimado de infraestrutura no lançamento** (fora processador de pagamento): Supabase Pro (US$25/mês) + Vercel Pro (US$20/mês, 1 assento) ≈ **US$45/mês**. É possível operar em free tier durante a fase de testes antes do lançamento oficial (Supabase free pausa projeto após 7 dias de inatividade — não serve para produção; Vercel Hobby proíbe uso comercial).
---
## 7. Segurança e compliance (LGPD)
- **Documentos e vídeos de verificação** (`VERIFICATIONS.document_url`, `VERIFICATIONS.video_url`): armazenar em bucket separado, com acesso restrito por Row Level Security (RLS) do Supabase — apenas usuários com papel de aprovação podem ler. Nunca expor publicamente.
- **Política de retenção:** definir prazo de exclusão automática dos arquivos de verificação após aprovação/reprovação (ex: reter apenas o resultado "aprovado/reprovado" e descartar o arquivo original em X dias).
- **Consentimento:** termos de uso claros no cadastro sobre o uso de documento e vídeo, alinhados à LGPD.
- **Geolocalização e dados sensíveis de comportamento:** não fazem parte do MVP — ficam registrados como ponto de atenção para quando entrarem no roadmap de fases futuras.
---
## 8. Pendências antes do desenvolvimento
1. Pesquisar processadores de pagamento brasileiros compatíveis com o nicho (2-3 cotações antes de travar arquitetura)
2. Confirmar `lumeo.com.br` em registro.br e busca de marca no INPI
3. Definir regra de tolerância para falha de pagamento recorrente
4. Definir prazo exato de retenção/exclusão dos arquivos de verificação
