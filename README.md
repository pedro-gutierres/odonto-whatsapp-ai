# Atendimento 24h por WhatsApp para clínicas odontológicas

Um Worker da Cloudflare que recebe mensagens do WhatsApp (API oficial da Meta), consulta o Claude e responde ao paciente. Cada clínica é uma linha na tabela `tenants`; adicionar cliente novo não exige código novo.

## Como funciona

```
Paciente → WhatsApp → Meta ──webhook──► /webhook (valida assinatura, enfileira, responde 200)
                                              │
                                              ▼
                                         Fila "odonto-inbox"
                                              │
                                              ▼
                         processJob: acha a clínica pelo phone_number_id
                                  → grava a mensagem (D1)
                                  → monta o prompt da clínica + histórico
                                  → pergunta ao Claude
                                  → envia a resposta pela API da Meta
```

## Mapa dos arquivos (para instruir uma IA)

| Arquivo | Para que serve |
|---|---|
| `src/index.ts` | Entrada. `fetch` recebe o webhook; `queue` processa cada mensagem. |
| `src/whatsapp.ts` | Validar assinatura da Meta, ler o payload, enviar mensagem. |
| `src/claude.ts` | Chamada à API da Anthropic. |
| `src/prompt.ts` | Instruções do bot (monta o prompt a partir dos dados da clínica). |
| `src/db.ts` | Todas as consultas ao banco. Sempre filtradas por `tenant_id`. |
| `src/types.ts` | Formato dos dados e lista de segredos/variáveis. |
| `migrations/` | Estrutura do banco (tabelas). |
| `seeds/lab.sql` | Clínica de teste para a fase de laboratório. |
| `wrangler.jsonc` | Configuração do Worker, banco e fila. |

## Ordem de execução

Pré-requisitos: Node.js (versão LTS), Git, conta Cloudflare com plano Workers Paid, chave de API da Anthropic, app da Meta com o produto WhatsApp.

1. **Instalar dependências**
   ```
   npm install
   npm install --save-dev wrangler typescript @cloudflare/workers-types
   npx wrangler login
   ```
2. **Criar banco e filas na Cloudflare**
   ```
   npx wrangler d1 create odonto-db
   npx wrangler queues create odonto-inbox
   npx wrangler queues create odonto-inbox-dlq
   ```
   Copie o `database_id` mostrado e cole em `wrangler.jsonc`.
3. **Criar as tabelas**
   ```
   npm run db:migrate:remote
   ```
4. **Guardar os segredos** (cada comando pede o valor no terminal)
   ```
   npx wrangler secret put META_APP_SECRETS
   npx wrangler secret put WA_VERIFY_TOKEN
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put WA_LAB_TOKEN
   ```
   - `META_APP_SECRETS`: "App secret" do app (Meta → Configurações do app → Básico). Com vários apps, separe por vírgula.
   - `WA_VERIFY_TOKEN`: uma frase longa que você inventa; use a mesma no painel da Meta.
   - `WA_LAB_TOKEN`: token do painel da Meta (API Setup).
5. **Publicar**
   ```
   npm run deploy
   ```
   Abra `https://SEU-WORKER.SEU-SUBDOMINIO.workers.dev/health`. Deve aparecer "ok".
6. **Configurar o webhook na Meta**: Callback URL = `.../webhook`, Verify token = o mesmo de `WA_VERIFY_TOKEN`, e assine o campo `messages`.
7. **Cadastrar a clínica de teste**: edite `seeds/lab.sql` (Phone number ID) e rode
   ```
   npx wrangler d1 execute odonto-db --remote --file=seeds/lab.sql
   ```
8. **Testar**: mande uma mensagem do seu WhatsApp para o número de teste. Acompanhe com `npm run logs`.

## GitHub + deploy automático

Suba o código para o GitHub e, no painel da Cloudflare (Workers & Pages), conecte o repositório para publicar a cada push. As migrações do banco continuam sendo rodadas manualmente (passo 3).

**Nunca** coloque segredos no repositório. `.dev.vars` já está no `.gitignore`.

## Limitações conhecidas (versão de laboratório)

- Um único token da Meta (`WA_LAB_TOKEN`). Tokens por clínica (Embedded Signup) é a próxima fase.
- Só lê mensagens de texto. Áudio e imagem recebem um aviso padrão.
- Se o paciente mandar várias mensagens seguidas, cada uma gera uma resposta separada.
- Não há agendamento real: o bot coleta o pedido e avisa que a equipe confirma.
- Não há painel nem alerta de falhas. Use `npm run logs` e a fila `odonto-inbox-dlq`.
- Dados de pacientes são dados de saúde (LGPD): antes de operar com clientes reais, defina contrato, consentimento e política de retenção.
