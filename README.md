# Aura AI — Atendimento de novos interessados pelo WhatsApp

Plataforma SaaS multi-tenant para clínicas odontológicas e de estética no Brasil, executada na edge da Cloudflare (**Workers + D1 + Queues + R2 + Workers AI + Cron Triggers**), conectada à **API Oficial do WhatsApp Cloud (Meta)** e à **Anthropic Claude API** (com Prompt Caching e Visão).

Cada clínica opera isolada por `tenant_id` (conversas, agendamentos, bloqueios, profissionais, configurações da IA, `phone_number_id` e token da Meta). O cadastro gratuito (`/cadastro`) não inicia cobrança nem teste real: o negócio configura o perfil, testa a assistente em um **Test Drive** isolado (30 respostas) e ativa o teste operacional (168 horas ou 100 respostas) somente após revisar treinamento, preparar agenda e diagnosticar o WhatsApp. As regras comerciais, contas `legacy`, integração Paddle sandbox e pendências estão documentadas em [REESTRUTURACAO.md](REESTRUTURACAO.md).

---

## Arquitetura do Sistema

```text
Paciente (WhatsApp)
   │
   ▼
Meta Cloud API ──POST /webhook──► Worker fetch()
                                    ├─ Valida X-Hub-Signature-256 (META_APP_SECRETS)
                                    └─ Enfileira InboundJob em INBOX (odonto-inbox)
                                          │
                                          ▼
                                    Worker queue() -> processJob()
                                    ├─ Busca clínica por phone_number_id (tenants)
                                    ├─ Verifica acesso comercial (src/access.ts) e deduplica wa_message_id
                                    ├─ Se áudio/foto: baixa da Meta, salva no R2 (expira em 30 dias)
                                    │  e transcreve áudio via Workers AI (@cf/openai/whisper-large-v3-turbo)
                                    ├─ Checa pausa humana (conversation_states.ai_paused)
                                    ├─ Valida treinamento mínimo (isCrucialConfigComplete)
                                    ├─ Carrega histórico + grade futura (appointments)
                                    ├─ Monta prompt em 2 blocos (Prompt Caching) + imagem (Vision) e chama Claude
                                    ├─ Processa tags <<<AGENDAR: {...}>>> (interceptando conflitos) e <<<CONFIRMAR: {...}>>>
                                    └─ Envia via Meta Graph API (token da clínica ou fallback)

Cron Diário (23:00 UTC / 20h BRT) -> Worker scheduled() -> runDayBeforeConfirmations()
Cron por minuto -> Worker scheduled() -> processPaddleInbox() (somente faturamento)
   └─ Percorre clínicas ativas elegíveis e envia lembretes para agendamentos do dia seguinte
      ainda em status 'agendado' ou 'pre_agendado'.
```

---

## Mapa dos Arquivos

| Caminho | Responsabilidade |
|---|---|
| `src/index.ts` | Entrypoint do Worker (`fetch`, `queue`, `scheduled`), roteamento principal, `/webhook`, `processJob` e `runDayBeforeConfirmations`. |
| `src/access.ts` | Matriz de acesso comercial (`commercialAccess`), reserva/consumo de cota (Test Drive e teste operacional) e controle de elegibilidade. |
| `src/onboarding.ts` | Cadastro inicial (`/api/auth/register`) e checklist de preparação/ativação (`/api/onboarding/*`). |
| `src/simulator.ts` | Test Drive isolado (`/api/simulator/chat`) nos modos `patient` e `aura`, sem acesso à agenda real ou envio WhatsApp. |
| `src/billing.ts` | Integração Paddle (`/api/billing/*` e `/api/webhooks/paddle`), checkout e portal do assinante (produção desabilitada até validação externa). |
| `src/paddle-sandbox.ts` | Entrypoint isolado do Worker de testes (`wrangler.paddle-sandbox.jsonc`), bloqueando atendimento real. |
| `src/clinic-routes.ts` | Rotas `/api/clinic/*`: dados cadastrais, alteração de senha, gestão de equipe e conexão WhatsApp (Meta Embedded Signup / manual / diagnóstico). |
| `src/agenda-blocks.ts` | CRUD de bloqueios de agenda por profissional (`/api/agenda/blocks`), incluindo períodos entre dias. |
| `src/agenda-import.ts` | Importação CSV no modelo Aura com prévia, confirmação e reversão (`/api/agenda/import/{preview,commit,undo}`). |
| `src/dates.ts` | Validação e cálculo de datas locais (horário de Brasília) e durações de atendimento. |
| `src/http.ts` | Helpers de resposta (`htmlResponse`, `jsonResponse`) e `SECURITY_HEADERS`. |
| `src/auth.ts` | Sessão HMAC-SHA256 em cookie `HttpOnly` (`auth_session`), hash PBKDF2 (`pbkdf2_v1:...`, com suporte legado SHA-256), criptografia AES-256-GCM (`enc:v1:...`) e `resolveTenantAccessToken`. |
| `src/db.ts` | Camada de acesso ao Cloudflare D1 filtrada por `tenant_id`, profissionais, usuários, conflitos de agenda e `bot_config`. |
| `src/prompt.ts` | Monta o system prompt dividido em bloco estável (em cache) e contexto dinâmico (hora + equipe + agenda ocupada). |
| `src/claude.ts` | Integração com a API Messages da Anthropic (`askClaude`) com Prompt Caching (`ephemeral`) e suporte a imagens (`Vision`). |
| `src/whatsapp.ts` | Verificação HMAC da Meta (`verifySignature`), extração de mensagens, download de mídia, envio (`sendText`) e Graph API. |
| `src/types.ts` | Tipagem TypeScript compartilhada (`Env`, `InboundJob`, `Tenant`, `BotConfig`, etc.). |
| `src/views/` e `public/` | Views HTML (`landing.ts`, `login.ts`, `register.ts`, `checkout.ts`, `admin.ts`, `inbox.ts` + `src/views/inbox/*.ts`) e assets estáticos (`public/css/aura.css`, `public/js/ui.js`, `public/js/checkout.js`, `public/js/inbox/*.js`). |
| `migrations/` | Migrations D1 `0001`–`0017` (núcleo `tenants`/`messages`, `conversation_states`, `users`/`appointments`, índices, `superadmin`, mídias, `professionals`, equipe/configurações, onboarding comercial, bloqueios, billing, importações e integridade de agenda). |
| `tests/` | Suítes automatizadas offline (`clinic-whatsapp.test.ts`, `operations-billing.test.ts`, `frontend-ui.test.ts` e `d1-mock.ts`). |
| `wrangler.jsonc` | Bindings de produção D1 (`DB`), Queue (`INBOX`), R2 (`MEDIA_BUCKET`), Workers AI (`AI`), Crons (`0 23 * * *` para confirmações e `* * * * *` para faturamento) e variáveis não secretas. |

---

## Rotas e Segurança

### Rotas Públicas
- `GET /` — Landing page institucional
- `GET /cadastro` (`GET /register`) — Cadastro gratuito sem início automático do teste
- `GET /login` — Tela de login (e-mail e senha)
- `GET /checkout` — Página pública de retorno/checkout Paddle
- `GET /health` — Healthcheck (`ok`)
- `GET /webhook` — Handshake de verificação da Meta (`WA_VERIFY_TOKEN`)
- `POST /webhook` — Recebimento de eventos da Meta (protegido por `X-Hub-Signature-256`)
- `POST /api/webhooks/paddle` — Recebimento e validação de assinatura de eventos Paddle

### Autenticação
- `POST /api/auth/register` — Criação de conta gratuita e emissão de cookie de sessão
- `POST /api/auth/login` — Autentica usuário em `users` e emite cookie `HttpOnly` (`auth_session`)
- `POST /api/auth/logout` — Limpa o cookie de sessão
- `GET /api/auth/me` — Retorna o usuário da sessão atual (`401` se não autenticado)

### Rotas do Painel (Autenticadas)
Todas exigem sessão válida (`401` se não autenticado), respeitam a matriz comercial de acesso (`src/access.ts`) e isolam os dados exclusivamente por `session.tenantId`:
- `GET /inbox` / `GET /painel` — Painel principal (Início, Conversas, Agenda, Meu negócio e IA, Test Drive, WhatsApp, Conta e equipe)
- `GET /api/onboarding` | `POST /api/onboarding/{prepare,review-training,agenda,start-paid,activate}` — Estado e etapas de preparação/ativação
- `POST /api/simulator/chat` — Simulação Test Drive (30 respostas isoladas)
- `GET /api/billing` | `POST /api/billing/{checkout,portal}` — Status de assinatura, abertura de checkout e portal do cliente
- `GET | POST | DELETE /api/agenda/blocks` — Bloqueios de horário/período na agenda
- `POST /api/agenda/import/{preview,commit,undo}` — Prévia, importação e reversão de CSV no modelo Aura
- `GET /api/conversations` — Lista de conversas da clínica
- `GET /api/messages?phone=...` — Histórico do paciente (com metadados de mídia) + estado `ai_paused`
- `GET /api/media?msg_id=...` — Streaming/Range (áudio) e visualização/download (`&download=1`) de mídias do R2
- `GET /api/sync-check` — Polling leve no D1 para detectar novas mensagens
- `POST /api/send` — Envio manual usando `phone_number_id` e token da clínica (pausa a IA automaticamente)
- `POST /api/toggle-ai` — Pausa ou retoma a IA para um contato específico
- `POST /api/clear-chat` — Limpa histórico de mensagens de um contato específico da clínica
- `GET | POST | PATCH | DELETE /api/professionals` — CRUD de profissionais da clínica
- `GET | POST | PATCH | DELETE /api/appointments` — CRUD de agendamentos com verificação de conflitos (`409 Conflict`)
- `POST /api/appointments/run-confirmations` — Disparo manual das confirmações de véspera da clínica
- `GET | POST /api/config` — Leitura e salvamento do `BotConfig` da clínica (`tenants.bot_config`)
- `GET | PATCH /api/clinic/profile` — Dados cadastrais da clínica
- `POST /api/clinic/password` — Alteração da própria senha (PBKDF2)
- `GET | POST | PATCH | DELETE /api/clinic/users` — Gestão da equipe interna da clínica
- `GET /api/clinic/whatsapp/status` — Status da conexão WhatsApp e disponibilidade do Meta Embedded Signup
- `POST /api/clinic/whatsapp/{embedded-signup,manual,diagnose,subscribe,disconnect}` — Fluxos de conexão, diagnóstico, assinatura de webhook e desconexão
- `GET /api/time` — Horário atual do servidor (`America/Sao_Paulo`)

### Rotas Exclusivas do Super Admin (`403` para contas comuns)
Exigem sessão válida + `role === 'superadmin'` no banco + e-mail autorizado em `SUPERADMIN_EMAILS`:
- `GET /admin` — Painel global de visão do SaaS
- `GET /api/admin/overview` — Estatísticas globais e listagem consolidada de clínicas/usuários (sem expor tokens nem hashes)
- `POST | PATCH /api/admin/tenants` — Criação, ativação/pausa e atualização de credenciais de clínicas
- `POST /api/admin/users` | `PATCH /api/admin/users/password` — Gestão de usuários e redefinição de senha de suporte
- `GET | POST /api/init-perf` — Inicialização administrativa manual/idempotente de tabelas e índices no D1

---

## Configuração do Ambiente e Comandos

### 1. Instalar dependências e provisionar Cloudflare (primeira vez)
```bash
npm install
npx wrangler login
npx wrangler d1 create odonto-db
npx wrangler queues create odonto-inbox
npx wrangler queues create odonto-inbox-dlq
npm run db:migrate:remote
```
Atualize o `database_id` em `wrangler.jsonc` caso crie um novo banco.

### 2. Configurar Secrets na Cloudflare
```bash
npx wrangler secret put META_APP_SECRETS       # App secret(s) do app Meta (separados por vírgula se houver mais de um)
npx wrangler secret put WA_VERIFY_TOKEN        # Token aleatório configurado no Webhook da Meta
npx wrangler secret put ANTHROPIC_API_KEY      # Chave da API Anthropic (Claude)
npx wrangler secret put AUTH_SECRET            # Segredo forte para assinar cookies de sessão HMAC
npx wrangler secret put TOKEN_ENCRYPTION_KEY   # (Opcional) Chave AES-256-GCM para access_token_enc (fallback: AUTH_SECRET)
npx wrangler secret put WA_LAB_TOKEN           # (Opcional) Token fallback da Meta / laboratório quando a clínica não tem token próprio
npx wrangler secret put META_APP_SECRET        # (Opcional) App secret específico para troca OAuth do Meta Embedded Signup (fallback: 1º item de META_APP_SECRETS)
```
Para habilitar o **Meta Embedded Signup**, configure também as variáveis públicas `META_APP_ID` e `META_EMBEDDED_CONFIG_ID` no `wrangler.jsonc` ou no painel da Cloudflare.

### 3. Comandos de Desenvolvimento
> O Worker de produção na Cloudflare é publicado automaticamente via integração com o GitHub a cada push na branch `main`; não é necessário executar `npm run deploy` após cada alteração.

```bash
npm run typecheck          # Verifica tipagem TypeScript (tsc --noEmit)
npm test                   # Executa backend tests + npm run test:frontend
npm run test:frontend      # Verifica controles, formulários e navegação em DOM offline
npm run dev                # Servidor local com Wrangler
npm run deploy             # Publicação manual na Cloudflare via CLI (npx wrangler deploy), quando necessária
npm run logs               # Logs em tempo real (npx wrangler tail)
npm run db:migrate:local   # Aplica migrations no D1 local
npm run db:migrate:remote  # Aplica migrations no D1 remoto
```

---

## Observações Importantes
- **Migrations D1**: alterações de estrutura devem ser aplicadas via `npm run db:migrate:local` / `npm run db:migrate:remote` (nunca via DDL em runtime).
- **Janela de 24h da Meta (Lembretes de Véspera)**: o Cron das 20h BRT envia mensagens de texto via Graph API; fora da janela de 24 horas da Meta, é necessário evoluir para Message Templates aprovados.
- **LGPD**: dados de pacientes e conversas são dados sensíveis de saúde; garanta contrato, termo de consentimento e política de retenção adequados antes da operação comercial.

### Recebimento assíncrono da Paddle

O webhook verifica HMAC e timestamp (tolerância mantida em cinco segundos), valida o vínculo local e grava o snapshot mínimo em `paddle_webhook_inbox` antes de retornar 200. Não consulta a API Paddle nessa requisição. Falha de persistência retorna 503 para permitir reentrega.

O cron por minuto processa até cinco itens por execução. Falhas temporárias voltam a pending com backoff de 60 segundos até uma hora; não há descarte automático após um número de tentativas. Leases de dois minutos permitem recuperar execuções interrompidas. O ledger `billing_events` continua atômico com a alteração do tenant e protege duplicatas e ordem. Eventos permanentemente inválidos ficam rejected e geram log; reentrega assinada permite nova tentativa depois da correção. A liberação do plano pode aguardar o próximo ciclo do cron e a atualização do painel.

Logs seguros: `[PADDLE_SIGNATURE_REJECTED]` identifica ausência/formato de cabeçalho, timestamp fora da tolerância ou HMAC divergente. `[PADDLE_RECEIPT_FAILED]` identifica persistência indisponível. `[PADDLE_PROCESSING]` informa ID do evento, tentativa, status e código de falha. Não registrar secret, assinatura nem payload. Investigar pending com muitas tentativas e rejected; o erro de processamento não altera retroativamente o 200 de recebimento.
