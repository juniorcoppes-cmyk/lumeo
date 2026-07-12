# Lumeo

Plataforma de eventos presenciais e curadoria/verificação para o público
liberal/lifestyle brasileiro. Ver [`docs/especificacao-mvp.md`](docs/especificacao-mvp.md)
para a especificação completa e [`AGENTS.md`](AGENTS.md) para o estado atual
do projeto (o que já foi testado, pendências, decisões de compliance).

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind)
- [Supabase](https://supabase.com) (Postgres, Auth, Storage)
- [Asaas](https://www.asaas.com) (assinaturas e cobrança de eventos)

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env.local` e preencha as variáveis (projeto
   Supabase, chaves do Asaas — sandbox para desenvolvimento).

3. Rode as migrações em `supabase/migrations/` no SQL Editor do seu projeto
   Supabase, na ordem dos nomes de arquivo.

4. Suba o servidor:

   ```bash
   npm run dev
   ```

   Abra [http://localhost:3000](http://localhost:3000).

## Webhook do Asaas em desenvolvimento

O Asaas precisa alcançar `/api/webhooks/asaas` pela internet. Use um túnel
temporário (ex: `cloudflared tunnel --url http://localhost:3000`) e registre
o webhook via `POST /v3/webhooks` da API do Asaas apontando para a URL do
túnel, com `authToken` igual ao `ASAAS_WEBHOOK_TOKEN` do seu `.env.local`.

## Deploy

Este projeto tem zero-config no [Vercel](https://vercel.com). Configure as
mesmas variáveis de ambiente do `.env.example` no painel do projeto Vercel
(usando as chaves de **produção** do Asaas, não as de sandbox), e registre o
webhook do Asaas de novo apontando para o domínio de produção depois do
primeiro deploy.
