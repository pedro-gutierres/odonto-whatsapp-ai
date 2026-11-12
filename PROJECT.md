# Project: Aura AI — Etapa 3 (SaaS Self-Service, Trial & Test Drive)

## Architecture
Aura AI is a multi-tenant SaaS running on Cloudflare Workers (TypeScript) that automates dental and aesthetic clinic WhatsApp communications using WhatsApp Cloud API + Claude + Cloudflare D1 + Queues + R2 + Workers AI.

In Etapa 3, we add:
1. **Database & Trial Schema (Cloudflare D1)**:
   - Migration `migrations/0009_tenant_trial_and_plans.sql` adding `plan_status`, `trial_ends_at`, `trial_messages_used`, `trial_messages_limit`, `billing_cycle`.
   - Data access helpers in `src/db.ts` for atomic tenant registration, trial inspection, and atomic message counter increment.
2. **Public Self-Service Registration & CTAs**:
   - Public view `GET /cadastro` (`src/views/register.ts`) with responsive dark-theme design matching Aura AI brand.
   - Endpoint `POST /api/auth/register` with input sanitization, duplicate email rejection (409), atomic creation of tenant (with `unconfigured:${id}` and base operational `bot_config` template) and admin user with PBKDF2 hash (`pbkdf2_v1:...`), issuing `auth_session` cookie.
   - CTAs on Landing Page (`src/views/landing.ts`) and Login Page (`src/views/login.ts`).
3. **Interactive Simulator ("Test Drive Guiado") & Trial Engine**:
   - Native simulator view in `/inbox` (`src/views/inbox/simulator-view.ts` and `public/js/inbox/simulator.js`).
   - Absolute data isolation: simulator chat history is client-side/session-based, never inserting into `messages` table or polluting real WhatsApp conversation lists.
   - Backend endpoint `POST /api/simulator/chat` verifying trial quota, invoking Claude with Brasília time and clinic context, interpreting `<<<AGENDAR>>>` to create real appointments in `appointments` table (`contact_wa_id = 'simulador'`), and incrementing `trial_messages_used`.
   - Visual trial indicator widget in `/inbox` header (days left, messages used X / 100), global expiration banner, and automated input/AI blocking on trial expiry, keeping Agenda, Treinamento, and Configurações 100% accessible in read-only mode.
4. **Quality Gates & Deployment**:
   - Vitest automated test suite `tests/etapa3.test.ts`.
   - `npm test` 100% passing and `npm run typecheck` 0 errors.
   - Remote D1 migration apply, Git commit & push, and Cloudflare Workers deploy.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | D1 Migration 0009 | Add trial & plan columns to `tenants` with safe backfill | M1 | R1, survey_db |
| 2 | Tenant Types & Models | Update `Tenant` interface and define `TenantTrialInfo` in `src/types.ts` | M1 | R1, survey_db |
| 3 | Trial DB Helpers | Implement `getTenantTrialInfo` and `incrementTenantTrialMessages` in `src/db.ts` | M1 | R1, survey_db |
| 4 | Public `/cadastro` Page | Responsive self-service registration page in `src/views/register.ts` | M2 | R2, survey_auth |
| 5 | `POST /api/auth/register` | Public registration endpoint with validation, PBKDF2 hashing, operational `bot_config` template, and session cookie | M2 | R2, survey_auth |
| 6 | Landing & Login CTAs | Add "Começar Teste Grátis" and login links pointing to `/cadastro` | M2 | R2, survey_auth |
| 7 | Inbox Simulator View | "Test Drive Guiado" view with scenario chips and action cards (`simulator-view.ts`, `simulator.js`) | M3 | R3, survey_simulator |
| 8 | Header Trial Widget | Visual indicator for days left and message quota (X / 100) in `/inbox` | M3 | R3, survey_simulator |
| 9 | `POST /api/simulator/chat` | AI simulator endpoint executing Claude, handling `<<<AGENDAR>>>`, and incrementing trial quota | M3 | R3, survey_simulator |
| 10 | Trial Enforcement & Read-Only | Block simulator/AI when trial expires; preserve read-only access to Agenda/Config/Settings | M3 | R3, survey_simulator |
| 11 | Data Isolation | Zero pollution of `messages` table or real patient WhatsApp conversations | M3 | R3, survey_simulator |
| 12 | Automated Test Suite | Vitest tests in `tests/etapa3.test.ts` covering registration, trial limits, simulator, and isolation | M4 | R4, survey_all |
| 13 | Build, Remote Migration & Deploy | Run tests, apply migration on D1 remote, git commit/push, and wrangler deploy | M4 | R4, GEMINI.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Migration 0009 & Data Access | `migrations/0009_tenant_trial_and_plans.sql`, `src/types.ts`, `src/db.ts` | none | DONE |
| M2 | Public Registration & CTAs | `src/views/register.ts`, `POST /api/auth/register` in `src/index.ts`, `src/views/landing.ts`, `src/views/login.ts` | M1 | DONE |
| M3 | Inbox Simulator ("Test Drive") & Trial Engine | `src/views/inbox/simulator-view.ts`, `public/js/inbox/simulator.js`, `src/views/inbox/header.ts`, `src/views/inbox.ts`, `public/js/inbox/core.js`, `POST /api/simulator/chat` in `src/index.ts` | M1, M2 | DONE |
| M4 | E2E Testing, Quality Gates & Production Deploy | `tests/etapa3.test.ts`, `npm test`, `npm run typecheck`, remote D1 migration, git commit/push, wrangler deploy | M1, M2, M3 | IN_PROGRESS |

## Interface Contracts
### M1 ↔ M2, M3 (Data Access Contract)
- `Tenant` interface contains:
  ```typescript
  plan_status?: "trial" | "active" | "past_due" | "canceled" | string;
  trial_ends_at?: string | null;
  trial_messages_used?: number;
  trial_messages_limit?: number;
  billing_cycle?: string | null;
  ```
- `TenantTrialInfo`:
  ```typescript
  interface TenantTrialInfo {
    plan_status: string;
    trial_ends_at: string | null;
    trial_messages_used: number;
    trial_messages_limit: number;
    days_remaining: number;
    is_expired: boolean;
    is_limit_reached: boolean;
    can_send_messages: boolean;
  }
  ```
- `getTenantTrialInfo(tenant: Tenant): TenantTrialInfo`
- `incrementTenantTrialMessages(db: D1Database, tenantId: string): Promise<number>`

### M2 ↔ M3, Client (Registration & Auth Contract)
- `POST /api/auth/register`:
  - Request body: `{ clinicName: string, adminName: string, email: string, password: string, phone: string }`
  - Success response: HTTP 201 `{ success: true, redirect: "/inbox", tenantId: string, user: { name, email, role, tenantId } }` with `Set-Cookie: auth_session=...; HttpOnly; Path=/; SameSite=Lax`
  - Error responses: HTTP 400 (validation), HTTP 409 (duplicate email).

### M3 ↔ Client (Simulator Contract)
- `POST /api/simulator/chat`:
  - Header: `Cookie: auth_session=...`
  - Request body: `{ message: string, history?: Array<{ role: "user" | "assistant", content: string }> }`
  - Success response: HTTP 200 `{ reply: string, action?: { type: "appointment_created", appointmentId: number, details: any }, trial: TenantTrialInfo }`
  - Error responses: HTTP 403 `{ error: "Trial limit reached or trial expired", code: "TRIAL_LIMIT_EXCEEDED", trial: TenantTrialInfo }`

## Code Layout
- `migrations/0009_tenant_trial_and_plans.sql`: D1 migration for trial/plan columns
- `src/types.ts`: Domain models and interfaces
- `src/db.ts`: D1 queries and data access functions
- `src/auth.ts`: PBKDF2 hashing and session management
- `src/index.ts`: Main HTTP routing, webhook handler, queue processing, simulator endpoint
- `src/views/register.ts`: Public registration view
- `src/views/landing.ts`: Landing page with CTAs
- `src/views/login.ts`: Login page with registration link
- `src/views/inbox.ts`: Inbox main layout
- `src/views/inbox/header.ts`: Navigation header and trial badge
- `src/views/inbox/simulator-view.ts`: Test Drive simulator view
- `public/js/inbox/simulator.js`: Simulator client-side controller
- `public/js/inbox/core.js`: Navigation tab and state manager
- `tests/etapa3.test.ts`: Automated test suite

## Reestruturação comercial — 11/11/2026

Este registro da Etapa 3 acima é histórico. O comportamento atual e as decisões aprovadas estão em `REESTRUTURACAO.md`.

- Base de perfil, condição comercial, preparação e permissões: IMPLEMENTADA.
- Cadastro gratuito, Test Drive isolado (30 respostas/dois modos), teste explícito (168h/100 respostas): IMPLEMENTADOS.
- Agenda estruturada, bloqueios e importação do CSV Aura com prévia/confirmação: IMPLEMENTADOS.
- Google e Paddle: CÓDIGO PREPARADO; aguardando contas/configurações e validação externa. Proprietário pediu para preencher os tokens posteriormente.
- Métricas Meta, números existentes/coexistência e compatibilidade de outros sistemas: PENDENTES DE COMPROVAÇÃO.
- Verificação local: tipagem e 49 testes aprovados; verificação visual bloqueada pela ferramenta de navegador.
- Migração remota: CONCLUÍDA, com backup e inventário preservado (15 contas, 16 usuários, 3 consultas, 56 mensagens). Publicação: CONCLUÍDA; versão ativa conferida pela API Cloudflare. Verificação HTTP pública bloqueada pelo erro Cloudflare 1010.
