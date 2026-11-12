# Aura AI — Atendimento de novos interessados pelo WhatsApp

## Reestruturação comercial e funcional

O cadastro gratuito não inicia o teste. O negócio informa autônomo/clínica e odontologia/estética, personaliza a IA e recebe um Test Drive isolado com 30 respostas, compartilhadas entre simulação de paciente e dúvidas sobre o Aura.

O teste real começa por ativação explícita após treinamento revisado, agenda preparada e WhatsApp diagnosticado: 168 horas ou 100 respostas automáticas, sem cartão ou cobrança automática. A matriz de acesso vale para APIs, fila e lembretes. Contas anteriores permanecem em transição (`legacy`), sem conversão automática ou alteração de seus dados.

As configurações, a matriz, os critérios de publicação e as limitações estão em [REESTRUTURACAO.md](REESTRUTURACAO.md). O acesso usa exclusivamente e-mail e senha (login Google removido). Paddle está integrado em ambiente sandbox isolado: Pix, confirmação por webhook, portal e cancelamentos foram validados; produção continua desabilitada. A integração financeira Meta e compatibilidade com agendas de outros sistemas continuam pendentes de comprovação.

Novos módulos: `src/access.ts`, `src/onboarding.ts`, `src/simulator.ts`, `src/billing.ts`, `src/agenda-blocks.ts`, `src/agenda-import.ts`. Migrations aditivas `0010`–`0014`. Navegação: Início, Conversas, Agenda, Meu negócio e IA, Test Drive, WhatsApp, Conta e equipe.

A revisão de interface usa estilos compartilhados em `public/css/aura.css` e seletores em `public/js/ui.js`, preservando os campos e eventos dos formulários. O bloqueio da agenda permite informar dia, início, fim e término em outro dia. Detalhes técnicos de conexão ficam recolhidos; a ajuda aparece junto às ações que precisam de explicação. `npm run test:frontend` verifica controles e formulários em DOM offline, sem substituir a conferência visual no navegador.

Novas APIs: `/api/onboarding/*`, `/api/billing/*`, `/api/webhooks/paddle`, `/api/agenda/blocks`, `/api/agenda/import/{preview,commit,undo}`. O CSV aceita somente o modelo Aura com prévia; não representa sincronização com sistemas externos.

Plataforma SaaS para clínicas odontológicas e de estética avançada no Brasil, executada 100% na edge da Cloudflare (**Workers + D1 + Queues + R2 + Workers AI + Cron Triggers**), conectada à **API Oficial do WhatsApp Cloud (Meta)** e à **Anthropic Claude API** (com Prompt Caching e Visão).

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
                                    ├─ Se áudio/foto: baixa da Meta, salva no R2 (expira em 30 dias)
                                    │  e transcreve áudio via Workers AI (@cf/openai/whisper-large-v3-turbo)
                                    ├─ Checa pausa humana (conversation_states.ai_paused)
                                    ├─ Valida treinamento mínimo (isCrucialConfigComplete)
                                    ├─ Carrega histórico + grade futura (appointments)
                                    ├─ Monta prompt em 2 blocos (Prompt Caching) + imagem (Vision) e chama Claude
                                    ├─ Processa tags <<<AGENDAR: {...}>>> (interceptando conflitos) e <<<CONFIRMAR: {...}>>>
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
| `src/clinic-routes.ts` | Rotas autenticadas por clínica (`/api/clinic/*`): dados cadastrais, alteração de senha, gestão de equipe e conexão WhatsApp via Meta Embedded Signup / diagnóstico. |
| `src/http.ts` | Helpers compartilhados de resposta (`htmlResponse`, `jsonResponse`) e `SECURITY_HEADERS`. |
| `src/auth.ts` | Sessão HMAC-SHA256 em cookie `HttpOnly` (`auth_session`), hash de senha PBKDF2 (`pbkdf2_v1:...`, com suporte legado SHA-256), criptografia AES-256-GCM (`enc:v1:...`) e `resolveTenantAccessToken`. |
| `src/db.ts` | Camada de acesso ao Cloudflare D1 filtrada por `tenant_id`, gestão de profissionais (`professionals`), equipe (`users`), dados cadastrais da clínica (`tenants`), controle de conflitos por profissional/expediente (`checkAppointmentConflict`), configuração `bot_config` e queries operacionais sem DDL em runtime. |
| `src/prompt.ts` | Monta o system prompt dividido em bloco estável (em cache) e contexto dinâmico (hora + equipe + agenda ocupada por profissional) a partir do `BotConfig`. |
| `src/claude.ts` | Integração com a API Messages da Anthropic (`askClaude`) com Prompt Caching (`ephemeral`) e suporte multimodal a imagens (`Vision`). |
| `src/whatsapp.ts` | Verificação HMAC da Meta (`verifySignature`), extração de texto/áudio/imagem (`extractJobs`), download de mídia (`downloadWhatsAppMedia`), envio (`sendText`) e integração Graph API para Meta Embedded Signup / diagnóstico. |
| `src/types.ts` | Tipagem compartilhada (`Env`, `InboundJob`, `Tenant`, `BotConfig`, `ConversationSummary`, `ConversationMessage`, `ProfessionalRecord`, `ClinicUserSummary`, `ClinicWhatsAppStatus`). |
| `src/views/landing.ts` | Landing page institucional (`/`). |
| `src/views/login.ts` | Tela de autenticação (`/login`). |
| `src/views/inbox.ts` + `src/views/inbox/` + `public/js/inbox/` | Painel principal (`/inbox` e `/painel`) com módulos de preparação/plano, demonstração, conta e operação: **Atendimento WhatsApp Multi-Chat**, **Agenda & Profissionais com Calendário**, **Treinamento da IA** e **Configurações & Perfil** (dados da clínica, equipe e Meta Embedded Signup). |
| `src/views/admin.ts` | Painel global **Super Admin** (`/admin`) para visão consolidada do SaaS, gestão de clínicas (`tenants`), credenciais WhatsApp e usuários (`users`). |
| `migrations/` | SQL D1: `0001_init.sql` (`tenants`, `messages`), `0002_conversation_states.sql` (`conversation_states`), `0003_auth_and_appointments.sql` (`users`, `appointments`), `0004_perf_indexes.sql` (`idx_messages_tenant_id`), `0005_superadmin_role.sql` (`superadmin`), `0006_media_messages.sql` (`media_key`, `media_mime`, `media_type`), `0007_professionals.sql` (`professionals` e vínculo em `appointments`) e `0008_clinic_settings_and_team.sql` (dados cadastrais da clínica, metadados WhatsApp e `users.active`). |
| `seeds/lab.sql` | Seed inicial da clínica de testes (`lab`). |
| `wrangler.jsonc` | Bindings D1 (`DB`), Queue (`INBOX`), R2 (`MEDIA_BUCKET` -> `odonto-media`), Workers AI (`AI`), Cron (`0 23 * * *`) e variáveis não secretas. |

---

## Rotas e Segurança

### Rotas Públicas
- `GET /` — Landing page institucional
- `GET /cadastro` — Cadastro gratuito sem início automático do teste
- `POST /api/auth/register` — Cadastro completo e criação da sessão
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
- `GET /api/messages?phone=...` — Histórico do paciente (com metadados de mídia) + estado `ai_paused`
- `GET /api/media?msg_id=...` — Streaming/Range (áudio) e visualização/download (`&download=1`) de mídias do R2 restritas ao `tenant_id` da sessão
- `GET /api/sync-check` — Polling leve de 1 leitura no D1 para detectar novas mensagens
- `POST /api/send` — Envio manual pela recepcionista usando `phone_number_id` e token da clínica logada (pausa a IA automaticamente)
- `POST /api/toggle-ai` — Pausa ou retoma a IA para um contato específico
- `POST /api/clear-chat` — Limpa histórico de mensagens de um contato específico da clínica
- `GET | POST | PATCH | DELETE /api/professionals` — CRUD de profissionais da clínica (dentistas/esteticistas, dias, expediente, intervalo e procedimentos vinculados)
- `GET | POST | PATCH | DELETE /api/appointments` — CRUD de agendamentos com vínculo opcional a profissional e bloqueio de sobreposição/expediente (`409 Conflict`)
- `POST /api/appointments/run-confirmations` — Disparo manual das confirmações de véspera restrito à clínica logada
- `GET | POST /api/config` — Leitura e salvamento do `BotConfig` da clínica (`tenants.bot_config`)
- `GET | PATCH /api/clinic/profile` — Dados cadastrais da clínica (razão social, CNPJ, responsável, telefone e e-mail administrativo)
- `POST /api/clinic/password` — Alteração da própria senha do usuário logado (PBKDF2)
- `GET | POST | PATCH | DELETE /api/clinic/users` — Gestão da equipe interna da clínica (criar, editar cargo, pausar/reativar e remover) restrita ao `session.tenantId`
- `GET /api/clinic/whatsapp/status` — Status real da conexão WhatsApp da clínica e disponibilidade do Meta Embedded Signup
- `POST /api/clinic/whatsapp/embedded-signup` — Troca de código OAuth Meta Embedded Signup, descoberta WABA/Phone Number ID, assinatura `subscribed_apps`, registro opcional com PIN e salvamento criptografado (AES-256-GCM)
- `POST /api/clinic/whatsapp/manual` — Conexão manual validada na Graph API com salvamento criptografado
- `POST /api/clinic/whatsapp/diagnose` — Diagnóstico em tempo real do número, token e assinatura de webhook no WABA
- `POST /api/clinic/whatsapp/subscribe` — Assinatura/reassinatura do webhook no WABA via Graph API
- `POST /api/clinic/whatsapp/disconnect` — Desconexão segura (restaura `unconfigured:<tenantId>` e remove token)
- `GET | POST /api/init-perf` — Setup manual/idempotente de tabelas e índices no D1 (restrito a usuário autenticado)
- `GET /api/time` — Horário atual do servidor (`America/Sao_Paulo`)

### Rotas Exclusivas do Super Admin (`403` para clínicas comuns)
Exigem sessão válida + `role === 'superadmin'` validado no banco + e-mail autorizado em `SUPERADMIN_EMAILS`:
- `GET /admin` — Painel global de visão do SaaS (KPIs, clínicas, status WhatsApp e usuários)
- `GET /api/admin/overview` — Estatísticas globais e listagem consolidada de clínicas/usuários (sem expor tokens nem hashes)
- `POST /api/admin/tenants` — Cria nova clínica (e opcionalmente seu usuário administrador)
- `PATCH /api/admin/tenants` — Ativa/pausa clínica e atualiza `phone_number_id`, `waba_id` ou token criptografado
- `POST /api/admin/users` — Cria usuário adicional para uma clínica
- `PATCH /api/admin/users/password` — Redefine senha de suporte de um usuário (hash PBKDF2)

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
npx wrangler secret put META_APP_SECRET        # (Opcional) App secret específico para troca OAuth do Meta Embedded Signup (fallback: 1º item de META_APP_SECRETS)
```
Para habilitar o botão **Meta Embedded Signup** na tela **Configurações & Perfil**, configure também as variáveis públicas `META_APP_ID` e `META_EMBEDDED_CONFIG_ID` no `wrangler.jsonc` ou no painel da Cloudflare.

### 4. Comandos de Desenvolvimento e Deploy
```bash
npm run typecheck          # Verifica tipagem TypeScript (tsc --noEmit)
npm test                   # Executa suíte automatizada de testes (tests/clinic-whatsapp.test.ts, tests/operations-billing.test.ts e tests/frontend-ui.test.ts)
npm run dev                # Servidor local com Wrangler
npm run deploy             # Publica o Worker na Cloudflare (npx wrangler deploy)
npm run logs               # Logs em tempo real (npx wrangler tail)
npm run db:migrate:local   # Aplica migrations no D1 local
npm run db:migrate:remote  # Aplica migrations no D1 remoto
```

---

## Cadastro e manutenção administrativa (Multi-Tenant)

Para novos clientes, use `/cadastro` e o checklist de preparação. O procedimento SQL abaixo é administrativo/legado e não deve substituir a nova jornada comercial.

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
- **Banco de desenvolvimento inicial**: a criação das tabelas e índices deve ser feita via migrations (`npm run db:migrate:local` / `npm run db:migrate:remote`) ou, em último caso, via rota autenticada `/api/init-perf` (que também semeia usuários iniciais para o tenant `'lab'` se a tabela `users` estiver vazia). Em produção, altere/remova credenciais de demonstração após criar os usuários reais.
- **Janela de 24h da Meta (Lembretes de Véspera)**: o Cron das 20h envia mensagens de texto via Graph API. Para pacientes fora da janela de 24 horas da Meta, será necessário evoluir o disparo para Message Templates aprovados na Meta.
- **LGPD**: dados de pacientes e conversas são dados sensíveis de saúde; garanta contrato, termo de consentimento e política de retenção adequados antes da operação comercial.
