# Regras e Contexto do Projeto (Aura AI — WhatsApp Odonto & Estética)

## Regras Obrigatórias de Entrega

Trabalhar em conjuntos pequenos e completos. Ao concluir um conjunto autorizado para implementação:
1. Validar tipagem (`npm run typecheck`) e testes (`npm test`) antes de publicar.
2. Atualizar a documentação do comportamento e registrar pendências reais; não marcar integrações como validadas somente por testes simulados.
3. Preparar backup e conferir compatibilidade antes de aplicar migrations remotas.
4. Atualizar o repositório no GitHub (`git add` seletivo, `git commit`, `git push origin main`) e publicar o conjunto validado na Cloudflare (`npx wrangler deploy`). Não publicar edições intermediárias automaticamente.
5. **Nunca** commitar `.dev.vars`, `.dev.vars.txt`, `.env`, backups ou segredos. Não incluir alterações pré-existentes de terceiros no commit por conveniência.

Pedidos explícitos de somente análise, implementação local ou de não publicar prevalecem sobre a rotina acima. As decisões comerciais aprovadas, a transição das contas e as configurações opcionais estão em `REESTRUTURACAO.md`.

Google e Paddle permanecem desabilitados até configurar e validar as contas externas. Não prometer métricas Meta, coexistência ou compatibilidade com agendas externas sem prova específica. Contas `legacy` devem preservar sua operação até classificação individual.

---

## Visão Geral para Devs e IAs

Este projeto é um **SaaS multi-tenant** em **Cloudflare Workers (TypeScript)** que automatiza o atendimento de WhatsApp de clínicas odontológicas e de estética utilizando **WhatsApp Cloud API (Meta)** + **Anthropic Claude** + **Cloudflare D1 (SQLite)** + **Cloudflare Queues** + **Cloudflare R2** + **Workers AI** + **Cron Triggers**.

### Fluxo Principal
- **Webhook (`POST /webhook` em `src/index.ts`)**: valida assinatura HMAC (`META_APP_SECRETS`), extrai mensagens de texto, áudio e imagem (`src/whatsapp.ts`) e publica `InboundJob` na fila `INBOX` (`odonto-inbox`).
- **Fila (`queue` -> `processJob` em `src/index.ts`)**:
  - Resolve a clínica pela coluna `tenants.phone_number_id` (`getTenantByPhoneNumberId`).
  - Ignora clínicas inativas ou com `phone_number_id` não configurado (`unconfigured:...`).
  - Deduplica por `wa_message_id` (`claimInbound`), baixa mídias da Meta quando aplicável, salva no R2 (`MEDIA_BUCKET` com expiração de 30 dias) e transcreve áudios via Workers AI (`@cf/openai/whisper-large-v3-turbo`).
  - Respeita pausa humana (`conversation_states.ai_paused`) e exige treinamento mínimo completo (`isCrucialConfigComplete`).
  - Resolve o token via `resolveTenantAccessToken(tenant, env)`: prioriza `tenants.access_token_enc` (suporta `enc:v1:...` em AES-256-GCM ou texto direto) com fallback para `env.WA_LAB_TOKEN`.
  - Monta o prompt em 2 blocos (`buildSystemPromptParts` em `src/prompt.ts`: bloco estável em cache + contexto dinâmico) considerando a grade de agendamentos futuros (`getUpcomingAppointments`) e consulta o Claude em `src/claude.ts` (com Prompt Caching `ephemeral` e suporte a imagem `Vision`).
  - Interpreta comandos ocultos retornados pelo modelo: `<<<AGENDAR: {...}>>>` (com prevenção de conflitos em `createAppointment` e interceptação da resposta para impedir falso positivo ao paciente em caso de conflito) e `<<<CONFIRMAR: {...}>>>`.
- **Painel Web (`src/views/inbox.ts`, `src/views/inbox/*.ts`, `public/js/inbox/*.js`, `src/views/login.ts`, `src/views/landing.ts`, `src/views/admin.ts`)**:
  - Protegido por sessão HMAC (`auth_session` cookie `HttpOnly`).
  - `/inbox` possui Central Multi-Chat WhatsApp (com reprodução de áudio estilo WhatsApp + botão de transcrição, visualização/download de fotos via `/api/media`, envio manual e pausa automática da IA), Agenda/Calendário CRM com Multi-Profissionais, Treinamento da IA (`tenants.bot_config`) e Configurações & Perfil (`src/clinic-routes.ts`: dados cadastrais, alteração de senha PBKDF2, gestão de equipe e Meta Embedded Signup / diagnóstico WhatsApp).
  - `/admin` é o painel global **Super Admin**, restrito via `requireSuperAdmin` (`users.role === 'superadmin'` no D1 + `SUPERADMIN_EMAILS`).
- **Cron de Confirmação (`scheduled` -> `runDayBeforeConfirmations`)**:
  - Executa às `23:00 UTC` (`20h America/Sao_Paulo`, configurado em `wrangler.jsonc`).
  - Itera por **todas** as clínicas ativas (`tenants.active = 1`) buscando agendamentos do dia seguinte com status `'agendado'` ou `'pre_agendado'`, disparando pelo `phone_number_id` e token de cada clínica.

---

## Convenções Críticas de Arquitetura e Segurança

1. **Isolamento Multi-Tenant Estrito**:
   - Toda rota `/api/*` de negócio exige sessão autenticada via `requireSession()` e usa **exclusivamente** `session.tenantId` — nunca confie em `tenant` vindo de query string ou body.
   - Nunca faça fallback de `phone_number_id` para o número de laboratório (`lab`) em rotas operacionais (`/api/send`, `runDayBeforeConfirmations`, `processJob`). Se uma clínica ainda não tiver `phone_number_id` real ou token válido, bloqueie o disparo à Meta.
   - `updateTenantConfig` em `src/db.ts` faz `UPDATE` por `id` sem sobrescrever `phone_number_id` (para evitar colisão na constraint `UNIQUE`). Quando cria registro ausente, usa placeholder único `unconfigured:<tenantId>`.
2. **Segredos e Criptografia**:
   - `src/auth.ts` usa PBKDF2 (`pbkdf2_v1:...`) para novos hashes de senha (mantendo verificação retrocompatível para hashes legados SHA-256), HMAC-SHA256 em tempo constante para cookies de sessão (`AUTH_SECRET`) e AES-256-GCM (`enc:v1:...`) para tokens por clínica (`TOKEN_ENCRYPTION_KEY` ou `AUTH_SECRET`).
3. **Performance D1**:
   - Rotas de leitura, escrita e polling (`/api/sync-check`, agenda, atendimento e cron) **nunca** executam `CREATE TABLE` ou `ALTER TABLE`. A estrutura do banco fica exclusivamente em `migrations/` (`0001` a `0008`) e na rota autenticada de inicialização manual `/api/init-perf`.
4. **Arquivos-Chave**:
   - `src/index.ts` | `src/clinic-routes.ts` | `src/http.ts` | `src/db.ts` | `src/auth.ts` | `src/prompt.ts` | `src/claude.ts` | `src/whatsapp.ts` | `src/types.ts`
   - Views inline e assets: `src/views/landing.ts` | `src/views/login.ts` | `src/views/inbox.ts` | `src/views/inbox/*.ts` | `public/js/inbox/*.js` | `src/views/admin.ts`
   - Banco e Infra: `migrations/*.sql` (`0001`–`0008`) | `seeds/lab.sql` | `wrangler.jsonc` | `package.json` | `tests/etapa2.test.ts`
