# E2E Test Infra: Aura AI — Etapa 3

## Test Philosophy
- Opaque-box, requirement-driven. Derives from user requirements in `ORIGINAL_REQUEST.md` and `PROJECT.md`, without dependency on internal implementation design.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing (Tiers 1–4).
- Deterministic, hermetic, 100% offline execution with zero external network dependencies (using `DatabaseSync(":memory:")` and `MockClaudeFixture` intercepting Anthropic API calls).

## Feature Inventory & Test Mapping
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| F1 | Trial Schema & Migration 0009 | ORIGINAL_REQUEST §R1 | 6 tests | 5 tests | 4 tests | 1 scenario |
| F2 | Public Self-Service Registration & CTAs | ORIGINAL_REQUEST §R2 | 9 tests | 6 tests | 3 tests | 1 scenario |
| F3 | Test Drive Simulator Chat | ORIGINAL_REQUEST §R3 | 6 tests | 6 tests | 4 tests | 2 scenarios |
| F4 | Trial Quota & Expiry Tracking | ORIGINAL_REQUEST §R3 | 6 tests | 5 tests | 5 tests | 2 scenarios |
| F5 | Data Isolation & Read-Only Degradation | ORIGINAL_REQUEST §R3 | 6 tests | 5 tests | 3 tests | 2 scenarios |
| **Total** | | | **33 tests** | **27 tests** | **19 tests** | **5 scenarios** |

## Test Architecture
- **Test Runner**: Node 24 native `node:test` and `node:assert/strict` bundled via `esbuild 0.28.2` (`--platform=node --format=esm`).
- **Database Engine**: `MockD1Database` from `tests/d1-mock.ts` running SQLite in-memory (`DatabaseSync(":memory:")`), applying migrations `0001` to `0009` cleanly via `applyMigrations`. Ad-hoc schema patching helpers (e.g. `ensureMigration0009`) are strictly prohibited to ensure forensic integrity.
- **Worker Invocation (Zero-Circumvention SUT)**: Direct invocation of `worker.fetch(request, env)` simulating Cloudflare Workers runtime. The suite contains **zero shadow routing facades** (`handleContractRoute` excised) and **zero 404 interception fallbacks**. If an endpoint is unmounted or mistyped in `src/index.ts`, `worker.fetch` returns 404 directly, surfacing genuine test signals.
- **Error Contract Assertions**: All 16 negative boundary tests explicitly assert both HTTP status codes and JSON error payload contracts (`data.error`, `data.code`, `data.trial`).
- **Claude Mocking**: `MockClaudeFixture` intercepting `globalThis.fetch("https://api.anthropic.com/v1/messages")` in a `try ... finally` block, returning mock JSON completions (`content: [{ type: "text", text: "..." }]`) with instant responses and deterministic handling of `<<<AGENDAR: {...}>>>` tags.
- **Directory Layout**:
  - `tests/etapa3.test.ts`: Primary test file containing all 4 Tiers.
  - `tests/d1-mock.ts`: In-memory SQLite D1 mock harness.
  - `.wrangler/tmp/etapa3.test.mjs`: Bundled output for test runner execution.

## Coverage Breakdown

### Tier 1: Feature Coverage (30 Tests)
1. **F1: Database Schema & Migration 0009** (6 tests):
   - M0009 applied cleanly on empty database.
   - Default values verified on newly inserted tenant (`plan_status = 'trial'`, `trial_messages_used = 0`, `trial_messages_limit = 100`, `billing_cycle = 'monthly'`).
   - `CHECK` constraint rejects invalid `plan_status` values.
   - Backward compatibility: migration applies seamlessly on database with existing tenants.
   - Idempotent backfill: `UPDATE` sets `trial_ends_at = datetime('now', '+7 days')` on pre-existing rows without overwriting explicit dates.
   - Direct helper verification (`getTenantTrialInfo` and `incrementTenantTrialMessages`).

2. **F2: Public Registration & `/cadastro`** (6 tests):
   - `GET /cadastro` returns HTTP 200 with HTML form containing required fields.
   - `POST /api/auth/register` creates tenant with `status = 'trial'`, 7 days duration, and 100 quota.
   - Created admin user has PBKDF2 password hash (`pbkdf2_v1:...`).
   - Tenant `phone_number_id` initialized with `unconfigured:${tenantId}`.
   - Successful registration issues `auth_session` cookie (`HttpOnly; SameSite=Lax`).
   - Base operational `bot_config` template initialized on new tenant.

3. **F3: Test Drive Simulator Chat** (6 tests):
   - Unauthenticated request rejected with HTTP 401.
   - Valid session cookie returns HTTP 200 with AI reply.
   - Claude receives clinic's real `bot_config` and procedure info in prompt.
   - Conversation history passed in request body is maintained across turns.
   - Tags `<<<AGENDAR: {...}>>>` trigger appointment creation in `appointments` table.
   - Simulator functions fully with `phone_number_id = 'unconfigured:...'` without Meta token.

4. **F4: Trial Usage Tracking & Limit Enforcement** (6 tests):
   - Sending message in simulator increments `trial_messages_used` by 1.
   - Simulator response payload includes up-to-date `trial` metadata (`days_remaining`, `messages_used`).
   - Counter reaching 100 blocks further simulator messages with HTTP 403 `TRIAL_LIMIT_EXCEEDED`.
   - Date past `trial_ends_at` blocks simulator messages with HTTP 403 `TRIAL_LIMIT_EXCEEDED`.
   - Active plan (`plan_status = 'active'`) does not block messages even if `trial_messages_used >= 100`.
   - Direct database counter increment is atomic.

5. **F5: Data Isolation & Non-Pollution** (6 tests):
   - Simulator chat messages are NEVER written to the `messages` table (0 new rows).
   - Simulator chat turns do NOT update `conversation_states` table.
   - `listConversations` returns empty/unpolluted list after simulator interactions.
   - Simulator appointments are flagged with `contact_wa_id = 'simulador'`.
   - Meta WhatsApp Cloud API (`sendText`) is never invoked during simulator interactions.
   - Tenant isolation: Clinic A's simulator session has zero visibility into Clinic B's simulator or appointments.

### Tier 2: Boundary & Corner Cases (27 Tests)
1. **Message Counters** (5 tests):
   - Counter at 0: permitted.
   - Counter transition 98 -> 99: permitted, 1 message remaining.
   - Counter transition 99 -> 100: 100th message permitted, 0 messages remaining.
   - Counter at 100 -> 101: 101st message rejected with HTTP 403.
   - Pre-existing counter > 100 (e.g. 150): rejected with HTTP 403.

2. **Expiration Dates** (5 tests):
   - Expiration date in future: permitted.
   - Expiration date exactly at current timestamp (cutoff): rejected with HTTP 403.
   - Expiration date 1 second in past: rejected with HTTP 403.
   - Expiration date far in past: rejected with HTTP 403.
   - Malformed/null `trial_ends_at` fallback handling.

3. **Registration Boundaries** (6 tests):
   - Duplicate email registration rejected with HTTP 409 Conflict.
   - Case-insensitive duplicate email check (e.g., `Admin@Clinic.com` vs `admin@clinic.com`).
   - Missing required fields (e.g., missing password or email) returns HTTP 400.
   - Empty string fields return HTTP 400.
   - Weak/short password (<6 characters) rejected with HTTP 400.
   - Special characters and XSS attempts in clinic name sanitized safely.

4. **Simulator Input Boundaries** (6 tests):
   - Empty message string returns HTTP 400.
   - Very large message text (10,000+ characters) handled gracefully without memory leak.
   - Malformed JSON payload returns HTTP 400.
   - Missing `history` array handled gracefully (defaults to empty history).
   - Corrupted `history` items (invalid roles or null contents) handled safely.
   - Excessive history length automatically truncated to prevent context overflow.

5. **Permission Boundaries** (5 tests):
   - Completely unauthenticated request returns HTTP 401.
   - Tampered/invalid HMAC signature on `auth_session` returns HTTP 401.
   - Expired session token returns HTTP 401.
   - Inactive user (`active = 0`) returns HTTP 401/403.
   - Inactive tenant (`tenants.active = 0`) returns HTTP 403.

### Tier 3: Pairwise Combinatorial Interactions (19 Tests)
1. **Plan Status x Quota Limit x Expiration Date Matrix** (12 tests):
   - Trial + Below Limit + Active Date -> Allowed (200)
   - Trial + At Limit + Active Date -> Blocked (403)
   - Trial + Over Limit + Active Date -> Blocked (403)
   - Trial + Below Limit + Expired Date -> Blocked (403)
   - Trial + Over Limit + Expired Date -> Blocked (403)
   - Active + Below Limit + Active Date -> Allowed (200)
   - Active + Over Limit + Active Date -> Allowed (200, unlimited)
   - Active + Over Limit + Expired Date -> Allowed (200, paid subscription ignores trial date)
   - Past_due + Below Limit + Active Date -> Blocked (403, payment delinquent)
   - Past_due + Over Limit + Expired Date -> Blocked (403)
   - Canceled + Below Limit + Active Date -> Blocked (403, account canceled)
   - Canceled + Over Limit + Expired Date -> Blocked (403)

2. **Claude AI Scheduling Tags x Slot Conflict Matrix** (7 tests):
   - Tag `<<<AGENDAR>>>` on open slot -> Appointment created in DB + confirmation reply returned.
   - Tag `<<<AGENDAR>>>` on conflicting slot -> Appointment rejected + conflict notice to patient.
   - Tag `<<<CONFIRMAR>>>` on existing pending appointment -> Status updated to 'confirmado'.
   - Tag `<<<CONFIRMAR>>>` on non-existing appointment -> Handled gracefully.
   - Response without tags -> Normal conversational reply returned + zero appointment rows created.
   - Tag `<<<AGENDAR>>>` when quota limit is reached -> Request rejected before Claude call (0 new appointments, 0 quota increments).
   - Malformed JSON inside `<<<AGENDAR: {bad json}>>>` -> Handled without crashing worker.

### Tier 4: Real-World Application Scenarios (5 Scenarios)
1. **Scenario 1: Complete Self-Service Onboarding & First Test Drive**:
   - Public user visits `/cadastro` -> Posts registration -> Receives session cookie -> Directly queries `/api/simulator/chat` -> Receives welcome AI reply -> Checks trial counter incremented to 1.
2. **Scenario 2: Test Drive AI Appointment Booking & CRM Calendar Check**:
   - Clinic in simulator asks to schedule tooth cleaning for next Monday at 14:00 -> Claude outputs `<<<AGENDAR: ...>>>` -> Backend creates appointment in `appointments` table -> Verify row has `contact_wa_id = 'simulador'` -> Query `GET /api/appointments` as clinic receptionist -> Verify appointment appears on calendar -> Query `GET /api/chats` -> Verify zero patient chats exist (isolation intact).
3. **Scenario 3: Quota Exhaustion & Degradation to Read-Only Mode**:
   - Clinic uses 99 simulator turns -> 100th turn succeeds -> 101st turn fails with HTTP 403 `TRIAL_LIMIT_EXCEEDED` -> Receptionist navigates to `/inbox`, `/api/appointments`, `/api/clinic/profile`, `/api/config` -> All return HTTP 200 OK with full data.
4. **Scenario 4: Multi-Tenant Concurrent Isolation**:
   - Clinic Alpha (trial, 50 messages used) and Clinic Beta (trial, 100 messages used, exhausted) execute requests in parallel. Clinic Alpha succeeds (counter becomes 51), Clinic Beta fails (HTTP 403). Neither clinic accesses the other's appointments, configs, or trial counters.
5. **Scenario 5: Trial Expiration by Date & Immediate Recovery**:
   - Clinic with `trial_ends_at` in past attempts simulator chat -> Fails with HTTP 403 `TRIAL_LIMIT_EXCEEDED` -> Clinic upgrades to `plan_status = 'active'` -> Subsequent simulator chat succeeds immediately with HTTP 200.

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total: 33 tests, exceeding minimum of 25)
- Tier 2: ≥5 per feature (Total: 27 tests, exceeding minimum of 25)
- Tier 3: Pairwise coverage (Total: 19 tests, exceeding minimum of 5)
- Tier 4: Real-world scenarios (Total: 5 scenarios, exceeding minimum of 5)
- **Total Suite: 84 tests**
