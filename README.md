# Aura

Painel para clínicas odontológicas e de estética com agenda, atendimento pelo WhatsApp e Suporte.

## Desenvolvimento

Use Node.js 24 ou posterior com suporte a `node:sqlite`.

```sh
npm ci
npm run db:migrate:local
npm run dev
```

Configure as credenciais locais em `.dev.vars`, ignorado pelo Git. Rode `npm run typecheck` e `npm test` para validar as mudanças.

## Publicação

A integração do GitHub publica o Worker a cada push em `main`. Se houver migrations novas, aplique com `npm run db:migrate:remote` antes do push. Migrations já aplicadas continuam no histórico do D1.

Na Cloudflare, cadastre as credenciais em **Workers & Pages → odonto-whatsapp-ai → Settings → Variables and Secrets**.

| Credencial | Onde obter ou configurar |
|---|---|
| `ANTHROPIC_SUPPORT_API_KEY` | Chave do workspace de Suporte na Anthropic, usada para dúvidas gerais e simulação. |
| `ANTHROPIC_API_KEY` | Chave da Anthropic usada nas respostas do WhatsApp. |
| `META_APP_SECRETS` | Segredos dos aplicativos Meta aceitos pelo webhook, separados por vírgula. |
| `WA_VERIFY_TOKEN` | Mesmo valor definido ao cadastrar o destino `/webhook` na Meta. |
| `AUTH_SECRET` | Segredo de sessão. |
| `TOKEN_ENCRYPTION_KEY` | Segredo que cifra os tokens das clínicas. Se ausente, a aplicação usa `AUTH_SECRET`. Preserve a chave usada para cifrar dados existentes. |

Para o Embedded Signup, configure também `META_APP_ID`, `META_EMBEDDED_CONFIG_ID` e, se necessário, `META_APP_SECRET` para a troca OAuth. A configuração depende das permissões do aplicativo na Meta.

## Paddle

O Worker de testes usa `wrangler.paddle-sandbox.jsonc`, com banco e credenciais próprios. Para aplicar as migrações nesse ambiente, use `npx wrangler d1 migrations apply aura-paddle-sandbox-db --remote --config wrangler.paddle-sandbox.jsonc`.

- Configure `PADDLE_ENVIRONMENT`, `PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY` e `PADDLE_WEBHOOK_SECRET` para o ambiente correspondente. A chave de servidor precisa ler preços, ler e gravar transações e assinaturas, e criar sessões do portal.
- Na Paddle, aponte o link padrão de checkout para `/checkout` e o webhook para `/api/webhooks/paddle`. Inscreva o destino em `transaction.completed`, nos eventos de ciclo de vida `subscription.*`, em `adjustment.created` e em `adjustment.updated`.
- Cadastre preços recorrentes em BRL, com impostos inclusos (`tax_mode: internal`), quantidade fixa de uma unidade, sem período de teste ou sobrescrita de moeda. Os valores iniciais estão na migração `0020_billing_lifecycle.sql`. Vincule os IDs com as quatro variáveis `PADDLE_PRO_MONTHLY_PRICE_ID`, `PADDLE_PRO_YEARLY_PRICE_ID`, `PADDLE_ULTRA_MONTHLY_PRICE_ID` e `PADDLE_ULTRA_YEARLY_PRICE_ID`. IDs de preços anteriores servem para reconhecer pagamentos históricos.
- Para avisos de migração de oferta, configure `BILLING_EMAIL_API_KEY` e `BILLING_EMAIL_FROM` no Resend. A chave precisa enviar e consultar mensagens. O remetente precisa estar verificado.
- Use `PADDLE_ENABLED` para abrir as vendas depois de validar domínio, catálogo, meios de pagamento e webhooks no ambiente correspondente.
