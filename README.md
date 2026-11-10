# Aura AI — Secretária WhatsApp com IA & CRM Multi-Tenant para Clínicas

Plataforma SaaS para clínicas odontológicas e de estética avançada no Brasil, executada 100% na edge da Cloudflare (**Workers + D1 + Queues + Cron Triggers**), conectada à **API Oficial do WhatsApp Cloud (Meta)** e à **Anthropic Claude API**.

Cada clínica cliente opera isolada por `tenant_id` (conversas, agendamentos, configurações da IA, `phone_number_id` e token de acesso da Meta).

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
                                    ├─ Deduplica wa_message_id e salva em messages
                                    ├─ Checa pausa humana (conversation_states.ai_paused)
                                    ├─ Valida treinamento mínimo (isCrucialConfigComplete)
                                    ├─ Carrega histórico + grade futura (appointments)
                                    ├─ Monta prompt clínico (src/prompt.ts) e chama Claude
                                    ├─ Processa tags <<<AGENDAR: {...}>>> e <<<CONFIRMAR: {...}>>>
                                    └─ Envia via Meta Graph API (token da clínica ou fallback)

Cron Diário (23:00 UTC / 20h BRT) -> Worker scheduled() -> runDayBeforeConfirmations()
   └─ Percorre todas as clínicas ativas (tenants.active = 1) e envia lembretes para
      agendamentos do dia seguinte ainda em status 'agendado' ou 'pre_agendado'.
```

---

## Mapa dos Arquivos

| Caminho | Responsabilidade |
|---|---|
| `src/index.ts` | Entrypoint do Worker (`fetch`, `queue`, `scheduled`), rotas públicas/autenticadas, `/webhook`, `processJob` e `runDayBeforeConfirmations`. |
| `src/auth.ts` | Sessão HMAC-SHA256 em cookie `HttpOnly` (`auth_session`), hash de senha PBKDF2 (`pbkdf2_v1:...`, com suporte legado SHA-256), criptografia AES-256-GCM (`enc:v1:...`) e `resolveTenantAccessToken`. |
| `src/db.ts` | Camada de acesso ao Cloudflare D1 filtrada por `tenant_id`, memoização de setup por isolate, controle de conflitos de horário (`checkAppointmentConflict`) e config `bot_config`. |
| `src/prompt.ts` | Monta o system prompt dinâmico da Secretária IA a partir do `BotConfig` da clínica, grade de horários ocupados e regras clínicas/comerciais. |
| `src/claude.ts` | Integração com a API Messages da Anthropic (`askClaude`). |
| `src/whatsapp.ts` | Verificação de assinatura HMAC da Meta (`verifySignature`), extração de mensagens de texto (`extractJobs`) e disparo via Graph API (`sendText`). |
| `src/types.ts` | Tipagem compartilhada (`Env`, `InboundJob`, `Tenant`, `BotConfig`, `ConversationSummary`, `ConversationMessage`). |
| `src/views/landing.ts` | Landing page institucional (`/`). |
| `src/views/login.ts` | Tela de autenticação (`/login`). |
| `src/views/inbox.ts` | Painel principal (`/inbox` e `/painel`) com 3 módulos: **Atendimento WhatsApp Multi-Chat**, **Agenda / CRM com Calendário** e **Treinamento da IA**. |
| `migrations/` | SQL D1: `0001_init.sql` (`tenants`, `messages`), `0002_conversation_states.sql` (`conversation_states`) e `0003_auth_and_appointments.sql` (`users`, `appointments`). |
| `seeds/lab.sql` | Seed inicial da clínica de testes (`lab`). |
| `wrangler.jsonc` | Bindings D1 (`DB`), Queue (`INBOX`), Cron (`0 23 * * *`) e variáveis não secretas (`GRAPH_VERSION`, `CLAUDE_MODEL`, `CLAUDE_EFFORT`). |

---

## Rotas e Segurança

### Rotas Públicas
- `GET /` — Landing page institucional
- `GET /login` — Tela de login
- `GET /health` — Healthcheck (`ok`)
- `GET /webhook` — Handshake de verificação da Meta (`WA_VERIFY_TOKEN`)
- `POST /webhook` — Recebimento de eventos da Meta (protegido por `X-Hub-Signature-256`)

### Autenticação
- `POST /api/auth/login` — Autentica usuário em `users` e emite cookie `HttpOnly` (`auth_session`)
- `POST /api/auth/logout` — Limpa o cookie de sessão
- `GET /api/auth/me` — Retorna o usuário da sessão atual (`401` se não autenticado)

### Rotas do Painel (Autenticadas)
Todas exigem sessão válida (`401` se não autenticado) e utilizam **exclusivamente** `session.tenantId` para isolar os dados:
- `GET /inbox` / `GET /painel` — Interface web do painel (redireciona para `/login` sem sessão)
- `GET /api/conversations` — Lista de conversas da clínica
- `GET /api/messages?phone=...` — Histórico do paciente + estado `ai_paused`
- `GET /api/sync-check` — Polling leve de 1 leitura no D1 para detectar novas mensagens
- `POST /api/send` — Envio manual pela recepcionista usando `phone_number_id` e token da clínica logada (pausa a IA automaticamente)
- `POST /api/toggle-ai` — Pausa ou retoma a IA para um contato específico
- `POST /api/clear-chat` — Limpa histórico de mensagens de um contato específico da clínica
- `GET | POST | PATCH | DELETE /api/appointments` — CRUD de agendamentos com bloqueio de sobreposição de horários (`409 Conflict`)
- `POST /api/appointments/run-confirmations` — Disparo manual das confirmações de véspera restrito à clínica logada
- `GET | POST /api/config` — Leitura e salvamento do `BotConfig` da clínica (`tenants.bot_config`)
- `GET /api/time` — Horário atual do servidor (`America/Sao_Paulo`)

---

## Configuração do Ambiente e Deploy

### 1. Instalar dependências
```bash
npm install
npx wrangler login
```

### 2. Provisionar recursos na Cloudflare (primeira vez)
```bash
npx wrangler d1 create odonto-db
npx wrangler queues create odonto-inbox
npx wrangler queues create odonto-inbox-dlq
npm run db:migrate:remote
```
Atualize o `database_id` em `wrangler.jsonc` caso crie um novo banco.

### 3. Configurar Secrets na Cloudflare
```bash
npx wrangler secret put META_APP_SECRETS       # App secret(s) do app Meta (separados por vírgula se houver mais de um)
npx wrangler secret put WA_VERIFY_TOKEN        # Token aleatório configurado no Webhook da Meta
npx wrangler secret put ANTHROPIC_API_KEY      # Chave da API Anthropic (Claude)
npx wrangler secret put AUTH_SECRET            # Segredo forte para assinar cookies de sessão HMAC
npx wrangler secret put TOKEN_ENCRYPTION_KEY   # (Opcional) Chave AES-256-GCM para access_token_enc (fallback: AUTH_SECRET)
npx wrangler secret put WA_LAB_TOKEN           # (Opcional) Token fallback da Meta / laboratório quando a clínica não tem token próprio
```

### 4. Comandos de Desenvolvimento e Deploy
```bash
npm run typecheck          # Verifica tipagem TypeScript (tsc --noEmit)
npm run dev                # Servidor local com Wrangler
npm run deploy             # Publica o Worker na Cloudflare (npx wrangler deploy)
npm run logs               # Logs em tempo real (npx wrangler tail)
npm run db:migrate:local   # Aplica migrations no D1 local
npm run db:migrate:remote  # Aplica migrations no D1 remoto
```

---

## Onboarding de uma Nova Clínica Real (Multi-Tenant)

Para ativar uma nova clínica em produção no D1:

1. **Cadastrar a clínica na tabela `tenants`**:
   - `id`: identificador único da clínica (ex.: `clinica-sorriso`)
   - `name`: nome da clínica
   - `phone_number_id`: Phone Number ID real do WhatsApp Cloud API da clínica (`UNIQUE`)
   - `waba_id`: WhatsApp Business Account ID (opcional)
   - `access_token_enc`: token da Meta da clínica (pode ser armazenado criptografado no formato `enc:v1:...` via `encryptTenantToken` ou em texto quando inserido manualmente; se `NULL`, o sistema usa `WA_LAB_TOKEN` como fallback — útil para System User Token compartilhado)
   - `bot_config`: JSON inicial `{}` (preenchido depois pelo painel na aba de Treinamento da IA)
   - `active`: `1`

   ```sql
   INSERT INTO tenants (id, name, phone_number_id, waba_id, access_token_enc, bot_config, active)
   VALUES ('clinica-sorriso', 'Clínica Sorriso', 'PHONE_NUMBER_ID_DA_CLINICA', 'WABA_ID', 'TOKEN_META_DA_CLINICA', '{}', 1);
   ```

2. **Cadastrar o usuário de acesso na tabela `users`**:
   - Recomenda-se gerar o hash PBKDF2 (`pbkdf2_v1:...`) usando a função `hashPassword` de `src/auth.ts`.

   ```sql
   INSERT INTO users (tenant_id, email, password_hash, name, role)
   VALUES ('clinica-sorriso', 'contato@clinicasorriso.com.br', 'HASH_PBKDF2_GERADO', 'Recepção Sorriso', 'admin');
   ```

3. **Configurar a IA no painel**:
   - Faça login em `/login`, acesse a aba de treinamento e preencha os campos obrigatórios (nome da clínica, duração da avaliação inicial, ao menos 1 procedimento ativo com duração e horário de atendimento) para liberar o atendimento automático pela IA.

---

## Observações Importantes
- **Banco de desenvolvimento inicial**: caso a tabela `users` esteja completamente vazia na primeira execução, `ensureAuthAndAppointments` em `src/db.ts` cria usuários iniciais de teste para o tenant `'lab'`. Em produção, altere/remova essas credenciais após criar os usuários reais.
- **Janela de 24h da Meta (Lembretes de Véspera)**: o Cron das 20h envia mensagens de texto via Graph API. Para pacientes fora da janela de 24 horas da Meta, será necessário evoluir o disparo para Message Templates aprovados na Meta.
- **LGPD**: dados de pacientes e conversas são dados sensíveis de saúde; garanta contrato, termo de consentimento e política de retenção adequados antes da operação comercial.
