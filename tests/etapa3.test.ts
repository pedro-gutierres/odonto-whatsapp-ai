import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import worker from "../src/index";
import {
  verifyPassword,
  createSessionToken,
} from "../src/auth";
import {
  getTenantById,
  getUserByEmail,
  getUserById,
  createAppointment,
  listAppointments,
  listConversations,
  getTenantTrialInfo,
  incrementTenantTrialMessages,
  isCrucialConfigComplete,
} from "../src/db";
import type { ChatTurn } from "../src/claude";
import type { Env, Tenant, TenantTrialInfo } from "../src/types";
import { MockD1Database } from "./d1-mock";

// ============================================================================
// FIXTURES & HARNESS ARCHITECTURE
// ============================================================================

export interface RecordedClaudeCall {
  url: string;
  headers: Headers;
  body: {
    model?: string;
    system?: Array<{ type: string; text: string }>;
    messages?: Array<{ role: string; content: string }>;
  };
}

export class MockClaudeFixture {
  private originalFetch: typeof globalThis.fetch | null = null;
  public calls: RecordedClaudeCall[] = [];
  private responseQueue: Array<(call: RecordedClaudeCall) => string | { reply?: string; status?: number; error?: string }> = [];
  private defaultResponse = "Olá! Sou a secretária virtual da clínica. Como posso lhe ajudar hoje?";

  install(): void {
    if (this.originalFetch) return;
    this.originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("api.anthropic.com/v1/messages")) {
        const parsedBody = init?.body ? JSON.parse(init.body as string) : {};
        const callInfo: RecordedClaudeCall = {
          url,
          headers: new Headers(init?.headers),
          body: parsedBody,
        };
        this.calls.push(callInfo);

        const handler = this.responseQueue.shift();
        const outcome = handler ? handler(callInfo) : this.defaultResponse;

        if (typeof outcome === "object" && outcome.status && outcome.status !== 200) {
          return new Response(outcome.error || "Anthropic Error", { status: outcome.status });
        }

        const replyText = typeof outcome === "string" ? outcome : outcome.reply ?? "";

        return new Response(
          JSON.stringify({
            id: "msg_mock_" + Math.random().toString(36).slice(2),
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: replyText }],
            usage: {
              input_tokens: 120,
              output_tokens: 45,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      // Allow internal or other mock requests
      if (this.originalFetch) {
        return this.originalFetch(input, init);
      }
      return new Response(JSON.stringify({ error: `Unhandled call to ${url}` }), { status: 404 });
    }) as typeof fetch;
  }

  restore(): void {
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    this.calls = [];
    this.responseQueue = [];
  }

  resetCalls(): void {
    this.calls = [];
  }

  queueReply(reply: string | ((call: RecordedClaudeCall) => string)): void {
    if (typeof reply === "string") {
      this.responseQueue.push(() => reply);
    } else {
      this.responseQueue.push(reply);
    }
  }

  setDefaultReply(reply: string): void {
    this.defaultResponse = reply;
  }
}

function createTestEnv(db: MockD1Database, overrides: Partial<Env> = {}): Env {
  return {
    DB: db as unknown as D1Database,
    INBOX: {
      send: async () => {},
      sendBatch: async () => {},
    } as unknown as Queue<any>,
    META_APP_SECRETS: "meta_app_secret_primary,meta_app_secret_secondary",
    WA_VERIFY_TOKEN: "verify_token_test",
    ANTHROPIC_API_KEY: "sk-ant-test-key-mock",
    WA_LAB_TOKEN: "wa_lab_fallback_token",
    AUTH_SECRET: "test_auth_secret_for_unit_tests_32chars",
    TOKEN_ENCRYPTION_KEY: "test_token_aes_key_for_unit_tests_32",
    GRAPH_VERSION: "v26.0",
    CLAUDE_MODEL: "claude-haiku-5-5",
    CLAUDE_EFFORT: "low",
    META_APP_ID: "123456789012345",
    META_EMBEDDED_CONFIG_ID: "987654321098765",
    ...overrides,
  };
}

function initTestDb(): MockD1Database {
  const db = new MockD1Database();
  db.applyMigrations(path.resolve("migrations"));
  return db;
}

async function createExpiredSessionToken(user: any, secret?: string): Promise<string> {
  const expiresAt = Date.now() - 3600000; // 1 hour ago
  const payload = JSON.stringify({ ...user, exp: expiresAt });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret || "fallback"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payloadB64}.${sigHex}`;
}

async function executeRequest(req: Request, env: Env): Promise<Response> {
  return worker.fetch(req, env);
}

async function registerTestClinic(
  env: Env,
  data: {
    clinicName: string;
    adminName: string;
    email: string;
    password: string;
    phone: string;
  }
): Promise<{ res: Response; body: any; cookie: string }> {
  const res = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
    env
  );
  const body = (await res.json()) as any;
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/auth_session=([^;]+)/);
  return { res, body, cookie: match ? `auth_session=${match[1]}` : "" };
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (30 TESTS)
// ============================================================================

// --- Feature 1: Database Trial Schema & Migration 0009 (6 Tests) ---

test("T1.1.1: Database Schema: Migration 0009 applies cleanly and adds 5 trial columns", async () => {
  const db = new MockD1Database();
  db.applyMigrations(path.resolve("migrations"));

  const cols = (await db.prepare("PRAGMA table_info(tenants)").all<{ name: string }>()).results;
  const colNames = cols.map((c) => c.name);

  assert.ok(colNames.includes("plan_status"), "tenants must have plan_status");
  assert.ok(colNames.includes("trial_ends_at"), "tenants must have trial_ends_at");
  assert.ok(colNames.includes("trial_messages_used"), "tenants must have trial_messages_used");
  assert.ok(colNames.includes("trial_messages_limit"), "tenants must have trial_messages_limit");
  assert.ok(colNames.includes("billing_cycle"), "tenants must have billing_cycle");
});

test("T1.1.2: Database Schema: Default values on newly inserted tenant adhere to specification", async () => {
  const db = initTestDb();
  await db
    .prepare("INSERT INTO tenants (id, name, phone_number_id) VALUES ('t-def-1', 'Clínica Nova', 'unconfigured:t-def-1')")
    .run();

  const tenant = await db.prepare("SELECT * FROM tenants WHERE id = ?1").bind("t-def-1").first<Tenant>();
  assert.ok(tenant, "Tenant must exist");
  assert.equal(tenant.plan_status, "trial");
  assert.equal(tenant.trial_messages_used, 0);
  assert.equal(tenant.trial_messages_limit, 100);
  assert.equal(tenant.billing_cycle, "monthly");
});

test("T1.1.3: Database Schema: Retrocompatibility and backfill update pre-existing tenants", async () => {
  const db = new MockD1Database();
  // Apply migrations 0001 through 0008 manually first
  const fs = await import("node:fs");
  const files = fs.readdirSync(path.resolve("migrations")).filter((f) => f.endsWith(".sql") && !f.startsWith("0009")).sort();
  for (const f of files) {
    db.sqlite.exec(fs.readFileSync(path.join(path.resolve("migrations"), f), "utf-8"));
  }

  // Insert pre-existing tenant before 0009
  db.sqlite.exec("INSERT INTO tenants (id, name, phone_number_id) VALUES ('t-legacy', 'Clínica Antiga', '12345')");

  // Now apply 0009 migration
  const m0009Sql = fs.readFileSync(path.join(path.resolve("migrations"), "0009_tenant_trial_and_plans.sql"), "utf-8");
  db.sqlite.exec(m0009Sql);

  const row = db.sqlite.prepare("SELECT * FROM tenants WHERE id = 't-legacy'").get() as Tenant;
  assert.equal(row.plan_status, "trial");
  assert.ok(row.trial_ends_at !== null && row.trial_ends_at.length > 0, "trial_ends_at must be backfilled");
  assert.equal(row.trial_messages_used, 0);
  assert.equal(row.trial_messages_limit, 100);
});

test("T1.1.4: Database Schema: getTenantTrialInfo calculates days remaining, limits, and flags correctly", async () => {
  const tenantActive: Tenant = {
    id: "t-calc",
    name: "Calc Test",
    phone_number_id: "123",
    bot_config: "{}",
    active: 1,
    plan_status: "trial",
    trial_ends_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    trial_messages_used: 15,
    trial_messages_limit: 100,
  };

  const info = getTenantTrialInfo(tenantActive);
  assert.equal(info.plan_status, "trial");
  assert.equal(info.trial_messages_used, 15);
  assert.equal(info.trial_messages_limit, 100);
  assert.equal(info.is_expired, false);
  assert.equal(info.is_limit_reached, false);
  assert.equal(info.can_send_messages, true);
  assert.ok(info.days_remaining >= 4 && info.days_remaining <= 6);
});

test("T1.1.5: Database Schema: incrementTenantTrialMessages atomically increments counter", async () => {
  const db = initTestDb();
  await db
    .prepare("INSERT INTO tenants (id, name, phone_number_id, trial_messages_used) VALUES ('t-inc', 'Inc Test', '123', 42)")
    .run();

  const c1 = await incrementTenantTrialMessages(db as unknown as D1Database, "t-inc");
  assert.equal(c1, 43);

  const c2 = await incrementTenantTrialMessages(db as unknown as D1Database, "t-inc");
  assert.equal(c2, 44);

  const row = await db.prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1").bind("t-inc").first<{ trial_messages_used: number }>();
  assert.equal(row?.trial_messages_used, 44);
});

test("T1.1.6: Database Schema: CHECK constraint rejects invalid plan_status values", async () => {
  const db = initTestDb();
  assert.throws(() => {
    db.sqlite.exec("INSERT INTO tenants (id, name, phone_number_id, plan_status) VALUES ('t-bad', 'Bad', '123', 'invalid_status')");
  }, /CHECK constraint failed/);
});

// --- Feature 2: Public Registration & `/cadastro` (6 Tests) ---

test("T1.2.1: Public Registration: POST /api/auth/register happy path creates trial tenant and admin user", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { res, body, cookie } = await registerTestClinic(env, {
    clinicName: "Clínica Odonto Prime",
    adminName: "Dr. Marcelo",
    email: "marcelo@odontoprime.com",
    password: "senhaSegura123",
    phone: "(11) 98888-7777",
  });

  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.redirect, "/inbox");
  assert.ok(cookie.includes("auth_session="));
  assert.equal(body.user.role, "admin");

  // Verify DB state
  const tenant = await getTenantById(env.DB, body.tenantId);
  assert.ok(tenant);
  assert.equal(tenant.plan_status, "trial");
  assert.equal(tenant.trial_messages_used, 0);
  assert.equal(tenant.trial_messages_limit, 100);
  assert.ok(tenant.phone_number_id.startsWith("unconfigured:"));
});

test("T1.2.2: Public Registration: Rejects missing mandatory fields with HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const missingClinic = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adminName: "Dr.", email: "a@b.com", password: "123", phone: "1199999999" }),
    }),
    env
  );
  assert.equal(missingClinic.status, 400);
  const dataClinic = (await missingClinic.json()) as any;
  assert.ok(dataClinic.error && typeof dataClinic.error === "string");
  assert.ok(dataClinic.error.toLowerCase().includes("obrigat") || dataClinic.error.toLowerCase().includes("clínica"));

  const missingEmail = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clinicName: "C", adminName: "Dr.", password: "123", phone: "1199999999" }),
    }),
    env
  );
  assert.equal(missingEmail.status, 400);
  const dataEmail = (await missingEmail.json()) as any;
  assert.ok(dataEmail.error && typeof dataEmail.error === "string");
  assert.ok(dataEmail.error.toLowerCase().includes("obrigat") || dataEmail.error.toLowerCase().includes("e-mail"));
});

test("T1.2.3: Public Registration: Rejects duplicate email case-insensitively with HTTP 409", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  await registerTestClinic(env, {
    clinicName: "Clínica Original",
    adminName: "Dra. Ana",
    email: "ana@clinica.com",
    password: "senhaSegura123",
    phone: "11977778888",
  });

  const dupRes = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clinicName: "Outra Clínica",
        adminName: "Outro Dr",
        email: "  ANA@CLINICA.COM  ",
        password: "outraSenha123",
        phone: "11966665555",
      }),
    }),
    env
  );

  assert.equal(dupRes.status, 409);
  const data = (await dupRes.json()) as any;
  assert.ok(data.error.includes("já está cadastrado"));
});

test("T1.2.4: Public Registration: Password is saved exclusively with PBKDF2 hash", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  await registerTestClinic(env, {
    clinicName: "Clínica PBKDF2",
    adminName: "Dr. Pedro",
    email: "pedro@pbkdf2.com",
    password: "SuperSenhaSecreta2026!",
    phone: "11999998888",
  });

  const user = await getUserByEmail(env.DB, "pedro@pbkdf2.com");
  assert.ok(user);
  assert.ok(user.password_hash.startsWith("pbkdf2_v1:"));
  assert.equal(await verifyPassword("SuperSenhaSecreta2026!", user.password_hash), true);
  assert.equal(await verifyPassword("SenhaErrada", user.password_hash), false);
});

test("T1.2.5: Public Registration: bot_config initialized with operational template", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { body } = await registerTestClinic(env, {
    clinicName: "Estética Facial & Dental",
    adminName: "Dra. Bianca",
    email: "bianca@estetica.com",
    password: "senhaSegura123",
    phone: "11911112222",
  });

  const tenant = await getTenantById(env.DB, body.tenantId);
  assert.ok(tenant);
  const parsed = JSON.parse(tenant.bot_config);
  assert.equal(parsed.clinic_name, "Estética Facial & Dental");
  assert.ok(Array.isArray(parsed.procedures) && parsed.procedures.length > 0);
  assert.equal(isCrucialConfigComplete(parsed), true);
});

test("T1.2.6: Public Registration: GET /cadastro returns responsive registration form", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await executeRequest(new Request("https://aura.test/cadastro"), env);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("clinicName"));
  assert.ok(html.includes("adminName"));
  assert.ok(html.includes("email"));
  assert.ok(html.includes("password"));
  assert.ok(html.includes("phone"));
});

test("T1.2.7: Public Registration: GET /cadastro with active session redirects 302 to /inbox", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { cookie } = await registerTestClinic(env, {
    clinicName: "Clínica Logada",
    adminName: "Dr. Logado",
    email: "logado@clinica.com",
    password: "senhaSegura123",
    phone: "(11) 98888-1234",
  });

  const res = await executeRequest(
    new Request("https://aura.test/cadastro", {
      headers: { cookie },
    }),
    env
  );
  assert.equal(res.status, 302);
  assert.ok(res.headers.get("location")?.endsWith("/inbox"));
});

test("T1.2.8: CTAs: Landing page GET / contains conversion CTAs to /cadastro", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await executeRequest(new Request("https://aura.test/"), env);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(
    html.includes('href="/cadastro"') || html.includes("href='/cadastro'"),
    "Landing page must contain link to /cadastro"
  );
  assert.ok(html.includes("Começar Teste Grátis"));
  assert.ok(html.includes("Começar Teste Grátis (7 Dias)"));
  assert.ok(html.includes("Criar Conta & Testar Grátis"));
});

test("T1.2.9: CTAs: Login page GET /login contains link to /cadastro", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await executeRequest(new Request("https://aura.test/login"), env);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(
    html.includes('href="/cadastro"') || html.includes("href='/cadastro'"),
    "Login page must contain link to /cadastro"
  );
  assert.ok(html.includes("Sua clínica ainda não usa a Aura AI?"));
  assert.ok(html.includes("Começar Teste Grátis de 7 dias"));
});

// --- Feature 3: Simulator Chat `POST /api/simulator/chat` (6 Tests) ---

test("T1.3.1: Simulator Chat: Basic dialogue returns AI reply and incremented trial counter", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "Clínica Teste Chat",
      adminName: "Dr. Chat",
      email: "chat@teste.com",
      password: "senhaSegura123",
      phone: "11944445555",
    });

    mockClaude.queueReply("Olá! Em que posso ajudar na sua avaliação hoje?");

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Olá, boa tarde!" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.reply, "Olá! Em que posso ajudar na sua avaliação hoje?");
    assert.equal(data.trial.trial_messages_used, 1);
  } finally {
    mockClaude.restore();
  }
});

test("T1.3.2: Simulator Chat: Requires authenticated session (HTTP 401 when missing)", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await executeRequest(
    new Request("https://aura.test/api/simulator/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Tentativa anônima" }),
    }),
    env
  );

  assert.equal(res.status, 401);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(data.error.toLowerCase().includes("autenticado") || data.error.toLowerCase().includes("sessão"));
});

test("T1.3.3: Simulator Chat: Prompt contains real bot_config and clinic context", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "Clínica Sorriso Dourado",
      adminName: "Dra. Dourado",
      email: "dourado@clinica.com",
      password: "senhaSegura123",
      phone: "11988889999",
    });

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Vocês atendem aos sábados?" }),
      }),
      env
    );
    assert.equal(res.status, 200);

    assert.equal(mockClaude.calls.length, 1);
    const systemPrompt = JSON.stringify(mockClaude.calls[0].body.system);
    assert.ok(systemPrompt.includes("Clínica Sorriso Dourado"));
  } finally {
    mockClaude.restore();
  }
});

test("T1.3.4: Simulator Chat: Multi-turn history preserves conversation context", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "Clínica Multi Turn",
      adminName: "Dr. Turn",
      email: "turn@clinica.com",
      password: "senhaSegura123",
      phone: "11922223333",
    });

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          history: [
            { role: "user", content: "Quanto custa o clareamento?" },
            { role: "assistant", content: "Nosso clareamento é R$ 600." },
          ],
          message: "Vocês dividem no cartão?",
        }),
      }),
      env
    );
    assert.equal(res.status, 200);

    assert.equal(mockClaude.calls.length, 1);
    const messages = mockClaude.calls[0].body.messages || [];
    assert.equal(messages.length, 3);
    assert.equal(messages[0].content, "Quanto custa o clareamento?");
    assert.equal(messages[1].content, "Nosso clareamento é R$ 600.");
    assert.equal(messages[2].content, "Vocês dividem no cartão?");
  } finally {
    mockClaude.restore();
  }
});

test("T1.3.5: Simulator Chat: Operates fully with unconfigured: phone_number_id and zero Meta token", async () => {
  const db = initTestDb();
  const env = createTestEnv(db, { WA_LAB_TOKEN: undefined }); // Zero Meta token configured
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Sem Meta",
      adminName: "Dr. Zero Meta",
      email: "zerometa@clinica.com",
      password: "senhaSegura123",
      phone: "11900000000",
    });

    const tenant = await getTenantById(env.DB, body.tenantId);
    assert.ok(tenant?.phone_number_id.startsWith("unconfigured:"));
    assert.equal(tenant?.access_token_enc, null);

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Test Drive sem WhatsApp conectado" }),
      }),
      env
    );

    assert.equal(res.status, 200);
  } finally {
    mockClaude.restore();
  }
});

test("T1.3.6: Simulator Chat: Immediate auto-login with session cookie on /api/auth/me", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { cookie, body } = await registerTestClinic(env, {
    clinicName: "Clínica Auto Login",
    adminName: "Dr. Auto",
    email: "auto@clinica.com",
    password: "senhaSegura123",
    phone: "11988880000",
  });

  const meRes = await executeRequest(
    new Request("https://aura.test/api/auth/me", {
      headers: { cookie },
    }),
    env
  );

  assert.equal(meRes.status, 200);
  const meData = (await meRes.json()) as any;
  assert.equal(meData.authenticated, true);
  assert.equal(meData.user.email, "auto@clinica.com");
  assert.equal(meData.user.tenantId, body.tenantId);
});

// --- Feature 4: Trial Usage Tracking & Limit Enforcement (6 Tests) ---

test("T1.4.1: Trial Tracking: Incrementing message counter sequentially on simulator turns", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Counter",
      adminName: "Dr. C",
      email: "c@clinica.com",
      password: "senhaSegura123",
      phone: "11955556666",
    });

    for (let i = 1; i <= 3; i++) {
      const res = await executeRequest(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: `Mensagem ${i}` }),
        }),
        env
      );
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.trial.trial_messages_used, i);
    }

    const tenant = await getTenantById(env.DB, body.tenantId);
    assert.equal(tenant?.trial_messages_used, 3);
  } finally {
    mockClaude.restore();
  }
});

test("T1.4.2: Trial Tracking: Precise calculation of days_remaining in API response", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Dias",
      adminName: "Dr. D",
      email: "d@clinica.com",
      password: "senhaSegura123",
      phone: "11955557777",
    });

    // Set trial_ends_at to exactly 5 days from now
    await db
      .prepare("UPDATE tenants SET trial_ends_at = datetime('now', '+5 days') WHERE id = ?1")
      .bind(body.tenantId)
      .run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Consulta prazo" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.trial.days_remaining, 5);
    assert.equal(data.trial.is_expired, false);
  } finally {
    mockClaude.restore();
  }
});

test("T1.4.3: Trial Limits: Exceeding 100 messages blocks requests with HTTP 403 TRIAL_LIMIT_EXCEEDED", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica 100",
      adminName: "Dr. 100",
      email: "100@clinica.com",
      password: "senhaSegura123",
      phone: "11955558888",
    });

    // Force counter to 100
    await db
      .prepare("UPDATE tenants SET trial_messages_used = 100 WHERE id = ?1")
      .bind(body.tenantId)
      .run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem 101" }),
      }),
      env
    );

    assert.equal(res.status, 403);
    const data = (await res.json()) as any;
    assert.equal(data.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(data.error && typeof data.error === "string");
    assert.ok(data.trial);
    assert.equal(data.trial.is_limit_reached, true);
    assert.equal(mockClaude.calls.length, 0, "Claude must NOT be invoked when limit reached");
  } finally {
    mockClaude.restore();
  }
});

test("T1.4.4: Trial Limits: Past trial_ends_at date blocks requests with HTTP 403 TRIAL_LIMIT_EXCEEDED", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Expirada",
      adminName: "Dr. Exp",
      email: "exp@clinica.com",
      password: "senhaSegura123",
      phone: "11955559999",
    });

    // Force trial_ends_at to 2 days ago
    await db
      .prepare("UPDATE tenants SET trial_ends_at = datetime('now', '-2 days') WHERE id = ?1")
      .bind(body.tenantId)
      .run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Tentativa expirada" }),
      }),
      env
    );

    assert.equal(res.status, 403);
    const data = (await res.json()) as any;
    assert.equal(data.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(data.error && typeof data.error === "string");
    assert.ok(data.trial);
    assert.equal(data.trial.is_expired, true);
    assert.equal(mockClaude.calls.length, 0);
  } finally {
    mockClaude.restore();
  }
});

test("T1.4.5: Trial Limits: Active paid plan (plan_status = 'active') ignores trial limits", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica PRO",
      adminName: "Dr. PRO",
      email: "pro@clinica.com",
      password: "senhaSegura123",
      phone: "11955550000",
    });

    // Upgrade to active plan with 150 used messages and past trial date
    await db
      .prepare("UPDATE tenants SET plan_status = 'active', trial_messages_used = 150, trial_ends_at = datetime('now', '-10 days') WHERE id = ?1")
      .bind(body.tenantId)
      .run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Pergunta de cliente VIP" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.trial.can_send_messages, true);
    assert.equal(data.trial.plan_status, "active");
  } finally {
    mockClaude.restore();
  }
});

test("T1.4.6: Trial Tracking: Atomic increment handles parallel consecutive calls correctly", async () => {
  const db = initTestDb();
  await db
    .prepare("INSERT INTO tenants (id, name, phone_number_id, trial_messages_used) VALUES ('t-conc', 'Conc', '123', 0)")
    .run();

  await Promise.all([
    incrementTenantTrialMessages(db as unknown as D1Database, "t-conc"),
    incrementTenantTrialMessages(db as unknown as D1Database, "t-conc"),
    incrementTenantTrialMessages(db as unknown as D1Database, "t-conc"),
  ]);

  const tenant = await db.prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1").bind("t-conc").first<{ trial_messages_used: number }>();
  assert.equal(tenant?.trial_messages_used, 3);
});

// --- Feature 5: Data Isolation & Non-Pollution (6 Tests) ---

test("T1.5.1: Data Isolation: Simulator chat messages NEVER written to messages table", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Isolamento",
      adminName: "Dr. Iso",
      email: "iso@clinica.com",
      password: "senhaSegura123",
      phone: "11944443333",
    });

    for (let i = 0; i < 5; i++) {
      const res = await executeRequest(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: `Simulação de conversa #${i}` }),
        }),
        env
      );
      assert.equal(res.status, 200, "Simulator request must succeed with 200");
      const data = (await res.json()) as any;
      assert.ok(data.reply && typeof data.reply === "string", "Simulator response must contain AI reply");
    }

    const msgCount = await db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE tenant_id = ?1")
      .bind(body.tenantId)
      .first<{ c: number }>();
    assert.equal(msgCount?.c, 0, "messages table must have 0 rows from simulator");
  } finally {
    mockClaude.restore();
  }
});

test("T1.5.2: Data Isolation: listConversations returns empty list after simulator interactions", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Inbox Limpo",
      adminName: "Dr. Limpo",
      email: "limpo@clinica.com",
      password: "senhaSegura123",
      phone: "11944442222",
    });

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Olá teste" }),
      }),
      env
    );
    assert.equal(res.status, 200, "Simulator request must succeed with 200");

    const convs = await listConversations(env.DB, body.tenantId);
    assert.equal(convs.length, 0, "WhatsApp conversations list must remain completely empty");
  } finally {
    mockClaude.restore();
  }
});

test("T1.5.3: Data Isolation: conversation_states table not affected by simulator turns", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Pause Safe",
      adminName: "Dr. Pause",
      email: "pause@clinica.com",
      password: "senhaSegura123",
      phone: "11944441111",
    });

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Teste sem pausa" }),
      }),
      env
    );
    assert.equal(res.status, 200, "Simulator request must succeed with 200");

    const states = await db
      .prepare("SELECT COUNT(*) as c FROM conversation_states WHERE tenant_id = ?1")
      .bind(body.tenantId)
      .first<{ c: number }>();
    assert.equal(states?.c, 0, "conversation_states must have 0 rows");
  } finally {
    mockClaude.restore();
  }
});

test("T1.5.4: Data Isolation: Simulator appointments are created with contact_wa_id = 'simulador'", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Agendamento Sim",
      adminName: "Dr. Sim",
      email: "sim@clinica.com",
      password: "senhaSegura123",
      phone: "11944440000",
    });

    mockClaude.queueReply(
      `Consulta agendada! <<<AGENDAR: {"patient_name":"Gabriela Rocha","procedure":"Limpeza","scheduled_at":"2026-11-23 15:00","duration":"30 min"}>>> Aguardo você!`
    );

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Quero agendar com a Dra para o dia 23 às 15h, sou a Gabriela" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.reply.includes("Aguardo você!"));
    assert.ok(!data.reply.includes("<<<AGENDAR"));

    const appt = await db
      .prepare("SELECT * FROM appointments WHERE tenant_id = ?1 AND patient_name = 'Gabriela Rocha'")
      .bind(body.tenantId)
      .first<any>();
    assert.ok(appt);
    assert.equal(appt.contact_wa_id, "simulador");
    assert.equal(appt.procedure, "Limpeza");
    assert.equal(appt.scheduled_at, "2026-11-23 15:00");
  } finally {
    mockClaude.restore();
  }
});

test("T1.5.5: Data Isolation: Strict multi-tenant isolation between clinics in simulator", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const clinicA = await registerTestClinic(env, {
      clinicName: "Clínica A",
      adminName: "Dr. A",
      email: "a@clinica.com",
      password: "senhaSegura123",
      phone: "11933331111",
    });

    const clinicB = await registerTestClinic(env, {
      clinicName: "Clínica B",
      adminName: "Dr. B",
      email: "b@clinica.com",
      password: "senhaSegura123",
      phone: "11933332222",
    });

    mockClaude.queueReply(
      `Agendado! <<<AGENDAR: {"patient_name":"Paciente Exclusivo A","procedure":"Extração","scheduled_at":"2026-11-24 10:00"}>>>`
    );

    const resA = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie: clinicA.cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Agendar A" }),
      }),
      env
    );
    assert.equal(resA.status, 200, "Clinic A simulator chat must succeed");

    // Verify Clinic B does NOT see Clinic A's appointment
    const bAppts = await listAppointments(env.DB, clinicB.body.tenantId);
    assert.equal(bAppts.length, 0, "Clinic B must not see Clinic A appointments");

    // Verify Clinic A trial count incremented to 1, Clinic B remains 0
    const tA = await getTenantById(env.DB, clinicA.body.tenantId);
    const tB = await getTenantById(env.DB, clinicB.body.tenantId);
    assert.equal(tA?.trial_messages_used, 1);
    assert.equal(tB?.trial_messages_used, 0);
  } finally {
    mockClaude.restore();
  }
});

test("T1.5.6: Data Isolation: WhatsApp Meta sendText is NEVER called by the simulator", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "Clínica No Meta Call",
      adminName: "Dr. No Call",
      email: "nocall@clinica.com",
      password: "senhaSegura123",
      phone: "11933334444",
    });

    let externalMetaCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: any, init: any) => {
      const url = String(input);
      if (url.includes("graph.facebook.com")) {
        externalMetaCalls++;
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Envio de simulação" }),
      }),
      env
    );
    assert.equal(res.status, 200, "Simulator request must succeed with 200");

    assert.equal(externalMetaCalls, 0, "No Meta Graph API calls permitted during simulator turns");
  } finally {
    mockClaude.restore();
  }
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (27 TESTS)
// ============================================================================

// --- Message Counters (5 Tests) ---

test("T2.1.1: Boundary Counters: Counter at 0 permitted, increments to 1", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "B1", adminName: "Dr", email: "b1@test.com", password: "senhaSegura123", phone: "11988880001"
    });

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Primeira" }),
      }),
      env
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.trial.trial_messages_used, 1);
    assert.equal(data.trial.is_limit_reached, false);
  } finally {
    mockClaude.restore();
  }
});

test("T2.1.2: Boundary Counters: Transition 98 -> 99 permitted, 1 message remaining", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "B2", adminName: "Dr", email: "b2@test.com", password: "senhaSegura123", phone: "11988880002"
    });
    await db.prepare("UPDATE tenants SET trial_messages_used = 98 WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "99th" }),
      }),
      env
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.trial.trial_messages_used, 99);
    assert.equal(data.trial.is_limit_reached, false);
  } finally {
    mockClaude.restore();
  }
});

test("T2.1.3: Boundary Counters: 100th message permitted (99 -> 100), flags is_limit_reached", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "B3", adminName: "Dr", email: "b3@test.com", password: "senhaSegura123", phone: "11988880003"
    });
    await db.prepare("UPDATE tenants SET trial_messages_used = 99 WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "100th" }),
      }),
      env
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.trial.trial_messages_used, 100);
    assert.equal(data.trial.is_limit_reached, true);
  } finally {
    mockClaude.restore();
  }
});

test("T2.1.4: Boundary Counters: 101st message rejected with HTTP 403 TRIAL_LIMIT_EXCEEDED", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "B4", adminName: "Dr", email: "b4@test.com", password: "senhaSegura123", phone: "11988880004"
    });
    await db.prepare("UPDATE tenants SET trial_messages_used = 100 WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "101st" }),
      }),
      env
    );
    assert.equal(res.status, 403);
    const data = (await res.json()) as any;
    assert.equal(data.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(data.error && typeof data.error === "string");
    assert.ok(data.trial);
    assert.equal(data.trial.is_limit_reached, true);
  } finally {
    mockClaude.restore();
  }
});

test("T2.1.5: Boundary Counters: Pre-existing counter > 100 rejected with HTTP 403", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "B5", adminName: "Dr", email: "b5@test.com", password: "senhaSegura123", phone: "11988880005"
    });
    await db.prepare("UPDATE tenants SET trial_messages_used = 150 WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "overflow test" }),
      }),
      env
    );
    assert.equal(res.status, 403);
    const errData = (await res.json()) as any;
    assert.equal(errData.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(errData.error && errData.error.length > 0);
    assert.ok(errData.trial);
    assert.equal(errData.trial.is_limit_reached, true);
    assert.equal(errData.trial.can_send_messages, false);
  } finally {
    mockClaude.restore();
  }
});

// --- Expiration Dates (5 Tests) ---

test("T2.2.1: Boundary Dates: Exact current timestamp cutoff rejected with HTTP 403", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "BD1", adminName: "Dr", email: "bd1@test.com", password: "senhaSegura123", phone: "11988880006"
    });
    await db.prepare("UPDATE tenants SET trial_ends_at = datetime('now') WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Exact now" }),
      }),
      env
    );
    assert.equal(res.status, 403);
    const errData = (await res.json()) as any;
    assert.equal(errData.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(errData.error && errData.error.length > 0);
    assert.ok(errData.trial);
    assert.equal(errData.trial.is_expired, true);
    assert.equal(errData.trial.can_send_messages, false);
  } finally {
    mockClaude.restore();
  }
});

test("T2.2.2: Boundary Dates: Future expiration (+1 hour) permitted", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "BD2", adminName: "Dr", email: "bd2@test.com", password: "senhaSegura123", phone: "11988880007"
    });
    await db.prepare("UPDATE tenants SET trial_ends_at = datetime('now', '+1 hour') WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Still valid" }),
      }),
      env
    );
    assert.equal(res.status, 200);
  } finally {
    mockClaude.restore();
  }
});

test("T2.2.3: Boundary Dates: Past expiration (-1 second / -1 hour) rejected with HTTP 403", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "BD3", adminName: "Dr", email: "bd3@test.com", password: "senhaSegura123", phone: "11988880008"
    });
    await db.prepare("UPDATE tenants SET trial_ends_at = datetime('now', '-1 hour') WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Just expired" }),
      }),
      env
    );
    assert.equal(res.status, 403);
    const errData = (await res.json()) as any;
    assert.equal(errData.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(errData.error && errData.error.length > 0);
    assert.ok(errData.trial);
    assert.equal(errData.trial.is_expired, true);
    assert.equal(errData.trial.can_send_messages, false);
  } finally {
    mockClaude.restore();
  }
});

test("T2.2.4: Boundary Dates: Far past date (-30 days) rejected with HTTP 403", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "BD4", adminName: "Dr", email: "bd4@test.com", password: "senhaSegura123", phone: "11988880009"
    });
    await db.prepare("UPDATE tenants SET trial_ends_at = datetime('now', '-30 days') WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Far expired" }),
      }),
      env
    );
    assert.equal(res.status, 403);
    const errData = (await res.json()) as any;
    assert.equal(errData.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(errData.error && errData.error.length > 0);
    assert.ok(errData.trial);
    assert.equal(errData.trial.is_expired, true);
    assert.equal(errData.trial.can_send_messages, false);
  } finally {
    mockClaude.restore();
  }
});

test("T2.2.5: Boundary Dates: Distant future date (+365 days) permitted, days_remaining ~365", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "BD5", adminName: "Dr", email: "bd5@test.com", password: "senhaSegura123", phone: "11988880010"
    });
    await db.prepare("UPDATE tenants SET trial_ends_at = datetime('now', '+365 days') WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Distant future" }),
      }),
      env
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.trial.days_remaining >= 360 && data.trial.days_remaining <= 366);
  } finally {
    mockClaude.restore();
  }
});

// --- Registration Boundaries (6 Tests) ---

test("T2.3.1: Boundary Registration: Duplicate email with whitespace and mixed-case rejected", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  await registerTestClinic(env, {
    clinicName: "Clínica Original", adminName: "Dr", email: "dr@clinica.com", password: "senhaSegura123", phone: "11988881111"
  });

  const dupRes = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clinicName: "Clínica Nova", adminName: "Dr", email: "  DR@CLINICA.COM  ", password: "senhaSegura123", phone: "11988882222"
      }),
    }),
    env
  );
  assert.equal(dupRes.status, 409);
  const dupData = (await dupRes.json()) as any;
  assert.ok(dupData.error && typeof dupData.error === "string");
  assert.ok(dupData.error.includes("já está cadastrado"));
});

test("T2.3.2: Boundary Registration: Each required field omitted individually returns HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const base = { clinicName: "C", adminName: "A", email: "a@b.com", password: "password123", phone: "11988883333" };
  for (const key of Object.keys(base) as Array<keyof typeof base>) {
    const invalidPayload = { ...base };
    delete invalidPayload[key];

    const res = await executeRequest(
      new Request("https://aura.test/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidPayload),
      }),
      env
    );
    assert.equal(res.status, 400, `Expected 400 when missing ${key}`);
    const data = (await res.json()) as any;
    assert.ok(data.error && typeof data.error === "string");
    assert.ok(data.error.toLowerCase().includes("obrigat") || data.error.toLowerCase().includes("campos"));
  }
});

test("T2.3.3: Boundary Registration: Whitespace-only fields rejected with HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clinicName: "   ", adminName: "   ", email: "a@b.com", password: "password123", phone: "11988884444"
      }),
    }),
    env
  );
  assert.equal(res.status, 400);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(data.error.toLowerCase().includes("obrigat") || data.error.toLowerCase().includes("campos"));
});

test("T2.3.4: Boundary Registration: Password < 6 characters rejected with HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clinicName: "C", adminName: "A", email: "short@b.com", password: "12345", phone: "11988885555"
      }),
    }),
    env
  );
  assert.equal(res.status, 400);
  const data = (await res.json()) as any;
  assert.ok(data.error.includes("6 caracteres"));
});

test("T2.3.5: Boundary Registration: Special characters and XSS in clinic name sanitized safely", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { res, body } = await registerTestClinic(env, {
    clinicName: "<script>alert('xss')</script> Clínica São Paulo & Estética!",
    adminName: "Dr. André <b>VIP</b>",
    email: "xss@clinica.com",
    password: "senhaSegura123",
    phone: "11988886666",
  });
  assert.equal(res.status, 201);
  assert.ok(!body.tenantId.includes("<script>"));

  const tenant = await getTenantById(env.DB, body.tenantId);
  assert.ok(tenant);
});

test("T2.3.6: Boundary Registration: Phone formatting sanitized to digits, < 10 digits rejected", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const shortPhone = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clinicName: "C", adminName: "A", email: "p1@b.com", password: "password123", phone: "11 999" }),
    }),
    env
  );
  assert.equal(shortPhone.status, 400);
  const shortPhoneData = (await shortPhone.json()) as any;
  assert.ok(shortPhoneData.error && typeof shortPhoneData.error === "string");
  assert.ok(shortPhoneData.error.toLowerCase().includes("telefone"));

  const validPhone = await executeRequest(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clinicName: "C", adminName: "A", email: "p2@b.com", password: "password123", phone: "+55 (11) 98765-4321" }),
    }),
    env
  );
  assert.equal(validPhone.status, 201);
});

// --- Simulator Input Boundaries (6 Tests) ---

test("T2.4.1: Boundary Simulator: Empty or whitespace message returns HTTP 400 with no quota deduction", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { cookie, body } = await registerTestClinic(env, {
    clinicName: "SB1", adminName: "Dr", email: "sb1@test.com", password: "senhaSegura123", phone: "11977770001"
  });

  const res = await executeRequest(
    new Request("https://aura.test/api/simulator/chat", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ message: "   \n\t  " }),
    }),
    env
  );
  assert.equal(res.status, 400);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(
    data.error.toLowerCase().includes("mensagem") ||
    data.error.toLowerCase().includes("obrigat") ||
    data.error.toLowerCase().includes("vazi") ||
    data.error.toLowerCase().includes("inválid")
  );

  const tenant = await getTenantById(env.DB, body.tenantId);
  assert.equal(tenant?.trial_messages_used, 0);
});

test("T2.4.2: Boundary Simulator: Very large message (10,000+ characters) handled safely", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "SB2", adminName: "Dr", email: "sb2@test.com", password: "senhaSegura123", phone: "11977770002"
    });

    const largeMessage = "A".repeat(12000);
    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: largeMessage }),
      }),
      env
    );
    assert.equal(res.status, 200);
  } finally {
    mockClaude.restore();
  }
});

test("T2.4.3: Boundary Simulator: Malformed JSON body returns HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { cookie } = await registerTestClinic(env, {
    clinicName: "SB3", adminName: "Dr", email: "sb3@test.com", password: "senhaSegura123", phone: "11977770003"
  });

  const res = await executeRequest(
    new Request("https://aura.test/api/simulator/chat", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: "{ bad json",
    }),
    env
  );
  assert.equal(res.status, 400);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(data.error.toLowerCase().includes("json") || data.error.toLowerCase().includes("inválido"));
});

test("T2.4.4: Boundary Simulator: Missing history field defaults safely to empty history", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "SB4", adminName: "Dr", email: "sb4@test.com", password: "senhaSegura123", phone: "11977770004"
    });

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Sem history explicitado" }),
      }),
      env
    );
    assert.equal(res.status, 200);
  } finally {
    mockClaude.restore();
  }
});

test("T2.4.5: Boundary Simulator: Corrupted history structures filtered out safely", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "SB5", adminName: "Dr", email: "sb5@test.com", password: "senhaSegura123", phone: "11977770005"
    });

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          history: [{ role: "hacker", foo: 123 }, null, "string", { role: "assistant", content: "ok" }],
          message: "Mensagem pós history corrompido",
        }),
      }),
      env
    );
    assert.equal(res.status, 200);
  } finally {
    mockClaude.restore();
  }
});

test("T2.4.6: Boundary Simulator: Excessive history length truncated safely to prevent token overflow", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "SB6", adminName: "Dr", email: "sb6@test.com", password: "senhaSegura123", phone: "11977770006"
    });

    const longHistory: ChatTurn[] = [];
    for (let i = 0; i < 50; i++) {
      longHistory.push({ role: "user", content: `Turn ${i}` });
      longHistory.push({ role: "assistant", content: `Reply ${i}` });
    }

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ history: longHistory, message: "Última pergunta" }),
      }),
      env
    );
    assert.equal(res.status, 200);
    assert.ok(mockClaude.calls[0].body.messages!.length <= 25);
  } finally {
    mockClaude.restore();
  }
});

// --- Permission Boundaries (5 Tests) ---

test("T2.5.1: Boundary Permissions: Unauthenticated request returns HTTP 401", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await executeRequest(
    new Request("https://aura.test/api/simulator/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Anon" }),
    }),
    env
  );
  assert.equal(res.status, 401);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(data.error.toLowerCase().includes("autenticado") || data.error.toLowerCase().includes("sessão"));
});

test("T2.5.2: Boundary Permissions: Tampered HMAC signature returns HTTP 401", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await executeRequest(
    new Request("https://aura.test/api/simulator/chat", {
      method: "POST",
      headers: { cookie: "auth_session=fakePayload.fakeSignature123456", "content-type": "application/json" },
      body: JSON.stringify({ message: "Tampered" }),
    }),
    env
  );
  assert.equal(res.status, 401);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(data.error.toLowerCase().includes("autenticado") || data.error.toLowerCase().includes("sessão"));
});

test("T2.5.3: Boundary Permissions: Expired session token returns HTTP 401", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const expiredToken = await createExpiredSessionToken(
    { userId: 1, tenantId: "t-exp", email: "exp@t.com", name: "Exp", role: "admin" },
    env.AUTH_SECRET
  );

  const res = await executeRequest(
    new Request("https://aura.test/api/simulator/chat", {
      method: "POST",
      headers: { cookie: `auth_session=${expiredToken}`, "content-type": "application/json" },
      body: JSON.stringify({ message: "Expired" }),
    }),
    env
  );
  assert.equal(res.status, 401);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(data.error.toLowerCase().includes("autenticado") || data.error.toLowerCase().includes("sessão") || data.error.toLowerCase().includes("expirad"));
});

test("T2.5.4: Boundary Permissions: Inactive paused user (users.active = 0) returns HTTP 403", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { cookie, body } = await registerTestClinic(env, {
    clinicName: "PB_User", adminName: "Dr", email: "pb_user@test.com", password: "senhaSegura123", phone: "11966660001"
  });

  await db.prepare("UPDATE users SET active = 0 WHERE tenant_id = ?1").bind(body.tenantId).run();

  const res = await executeRequest(
    new Request("https://aura.test/api/simulator/chat", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ message: "Paused user" }),
    }),
    env
  );
  assert.equal(res.status, 403);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(data.error.toLowerCase().includes("inativo") || data.error.toLowerCase().includes("desativado") || data.error.toLowerCase().includes("pausada"));
});

test("T2.5.5: Boundary Permissions: Inactive tenant (tenants.active = 0) returns HTTP 403", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const { cookie, body } = await registerTestClinic(env, {
    clinicName: "PB_Tenant", adminName: "Dr", email: "pb_tenant@test.com", password: "senhaSegura123", phone: "11966660002"
  });

  await db.prepare("UPDATE tenants SET active = 0 WHERE id = ?1").bind(body.tenantId).run();

  const res = await executeRequest(
    new Request("https://aura.test/api/simulator/chat", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ message: "Suspended tenant" }),
    }),
    env
  );
  assert.equal(res.status, 403);
  const data = (await res.json()) as any;
  assert.ok(data.error && typeof data.error === "string");
  assert.ok(data.error.toLowerCase().includes("inativa") || data.error.toLowerCase().includes("suspens") || data.error.toLowerCase().includes("desativada"));
});

// ============================================================================
// TIER 3: PAIRWISE COMBINATORIAL INTERACTIONS (19 TESTS)
// ============================================================================

// --- Plan Status x Quota Limit x Expiration Date Matrix (12 Tests) ---

const COMBINATORIAL_CASES: Array<{
  id: string;
  plan_status: string;
  used: number;
  limit: number;
  daysOffset: number;
  expectedStatus: number;
  desc: string;
}> = [
  { id: "T3.1.1", plan_status: "trial", used: 50, limit: 100, daysOffset: 3, expectedStatus: 200, desc: "Trial + Below Limit + Active Date -> Allowed" },
  { id: "T3.1.2", plan_status: "trial", used: 100, limit: 100, daysOffset: 3, expectedStatus: 403, desc: "Trial + At Limit + Active Date -> Blocked" },
  { id: "T3.1.3", plan_status: "trial", used: 105, limit: 100, daysOffset: 3, expectedStatus: 403, desc: "Trial + Over Limit + Active Date -> Blocked" },
  { id: "T3.1.4", plan_status: "trial", used: 10, limit: 100, daysOffset: -1, expectedStatus: 403, desc: "Trial + Below Limit + Expired Date -> Blocked" },
  { id: "T3.1.5", plan_status: "trial", used: 100, limit: 100, daysOffset: -1, expectedStatus: 403, desc: "Trial + Over Limit + Expired Date -> Blocked" },
  { id: "T3.1.6", plan_status: "active", used: 20, limit: 100, daysOffset: 5, expectedStatus: 200, desc: "Active + Below Limit + Active Date -> Allowed" },
  { id: "T3.1.7", plan_status: "active", used: 100, limit: 100, daysOffset: 5, expectedStatus: 200, desc: "Active + At Limit + Active Date -> Allowed" },
  { id: "T3.1.8", plan_status: "active", used: 250, limit: 100, daysOffset: -5, expectedStatus: 200, desc: "Active + Over Limit + Expired Date -> Allowed" },
  { id: "T3.1.9", plan_status: "past_due", used: 10, limit: 100, daysOffset: 3, expectedStatus: 403, desc: "Past_due + Below Limit + Active Date -> Blocked" },
  { id: "T3.1.10", plan_status: "past_due", used: 110, limit: 100, daysOffset: -2, expectedStatus: 403, desc: "Past_due + Over Limit + Expired Date -> Blocked" },
  { id: "T3.1.11", plan_status: "canceled", used: 0, limit: 100, daysOffset: 5, expectedStatus: 403, desc: "Canceled + Below Limit + Active Date -> Blocked" },
  { id: "T3.1.12", plan_status: "canceled", used: 100, limit: 100, daysOffset: -3, expectedStatus: 403, desc: "Canceled + Over Limit + Expired Date -> Blocked" },
];

for (const tc of COMBINATORIAL_CASES) {
  test(`${tc.id}: Pairwise Matrix: ${tc.desc}`, async () => {
    const db = initTestDb();
    const env = createTestEnv(db);
    const mockClaude = new MockClaudeFixture();
    mockClaude.install();

    try {
      const email = `comb_${tc.id.toLowerCase().replace(/[^a-z0-9]/g, "")}@clinica.com`;
      const { cookie, body } = await registerTestClinic(env, {
        clinicName: `Clinica ${tc.id}`, adminName: "Dr", email, password: "senhaSegura123", phone: "11988880000"
      });

      const dateModifier = tc.daysOffset >= 0 ? `+${tc.daysOffset} days` : `${tc.daysOffset} days`;
      await db
        .prepare(`UPDATE tenants SET plan_status = ?1, trial_messages_used = ?2, trial_messages_limit = ?3, trial_ends_at = datetime('now', '${dateModifier}') WHERE id = ?4`)
        .bind(tc.plan_status, tc.used, tc.limit, body.tenantId)
        .run();

      const res = await executeRequest(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: "Matrix test" }),
        }),
        env
      );
      assert.equal(res.status, tc.expectedStatus, `${tc.desc} failed: expected ${tc.expectedStatus}, got ${res.status}`);
    } finally {
      mockClaude.restore();
    }
  });
}

// --- Claude Scheduling Tags x Slot Conflicts x Quota Exhaustion (7 Tests) ---

test("T3.2.1: Combinatorial Scheduling: <<<AGENDAR>>> on open slot creates appointment and returns clean reply", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "CS1", adminName: "Dr", email: "cs1@test.com", password: "senhaSegura123", phone: "11911110001"
    });

    mockClaude.queueReply(
      `Confirmadíssimo! <<<AGENDAR: {"patient_name":"Renata Dias","procedure":"Clareamento","scheduled_at":"2026-11-26 14:00","duration":"45 min"}>>> Tenha uma ótima tarde!`
    );

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Quero clareamento dia 26 às 14h, sou a Renata" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.ok(data.reply.includes("Tenha uma ótima tarde!"));
    assert.ok(!data.reply.includes("<<<AGENDAR"));
    assert.equal(data.action.type, "appointment_created");

    const appt = await db.prepare("SELECT * FROM appointments WHERE tenant_id = ?1").bind(body.tenantId).first<any>();
    assert.equal(appt.patient_name, "Renata Dias");
    assert.equal(appt.contact_wa_id, "simulador");
  } finally {
    mockClaude.restore();
  }
});

test("T3.2.2: Combinatorial Scheduling: <<<AGENDAR>>> on conflicting slot detects conflict without duplicate insertion", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "CS2", adminName: "Dr", email: "cs2@test.com", password: "senhaSegura123", phone: "11911110002"
    });

    // Seed existing appointment at 2026-11-26 14:00
    await createAppointment(env.DB, body.tenantId, "outro_paciente", "Outro", "Consulta", "2026-11-26 14:00");

    mockClaude.queueReply(
      `Agendando... <<<AGENDAR: {"patient_name":"Paciente Conflito","procedure":"Limpeza","scheduled_at":"2026-11-26 14:00"}>>>`
    );

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Marcar às 14h dia 26" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.action.type, "appointment_conflict");

    const count = await db.prepare("SELECT COUNT(*) as c FROM appointments WHERE tenant_id = ?1").bind(body.tenantId).first<{ c: number }>();
    assert.equal(count?.c, 1, "Must NOT insert duplicate conflicting appointment");
  } finally {
    mockClaude.restore();
  }
});

test("T3.2.3: Combinatorial Scheduling: <<<CONFIRMAR>>> on pending appointment updates status to confirmado", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "CS3", adminName: "Dr", email: "cs3@test.com", password: "senhaSegura123", phone: "11911110003"
    });

    const appt = await createAppointment(env.DB, body.tenantId, "paciente_pendente", "Carlos", "Consulta", "2026-11-27 10:00", "pre_agendado");

    mockClaude.queueReply(
      `Perfeito, consulta confirmada com sucesso! <<<CONFIRMAR: {"appointment_id": ${appt.id}}>>>`
    );

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Sim, confirmo minha presença!" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const updated = await db.prepare("SELECT status FROM appointments WHERE id = ?1").bind(appt.id).first<{ status: string }>();
    assert.equal(updated?.status, "confirmado");
  } finally {
    mockClaude.restore();
  }
});

test("T3.2.4: Combinatorial Scheduling: <<<CONFIRMAR>>> on non-existing appointment handled gracefully", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "CS4", adminName: "Dr", email: "cs4@test.com", password: "senhaSegura123", phone: "11911110004"
    });

    mockClaude.queueReply(
      `Confirmado! <<<CONFIRMAR: {"appointment_id": 999999}>>>`
    );

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Confirmo" }),
      }),
      env
    );

    assert.equal(res.status, 200);
  } finally {
    mockClaude.restore();
  }
});

test("T3.2.5: Combinatorial Scheduling: Response without tags creates zero appointment rows", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "CS5", adminName: "Dr", email: "cs5@test.com", password: "senhaSegura123", phone: "11911110005"
    });

    mockClaude.queueReply("Nosso endereço é Avenida Paulista, 1000.");

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Onde fica a clínica?" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const count = await db.prepare("SELECT COUNT(*) as c FROM appointments WHERE tenant_id = ?1").bind(body.tenantId).first<{ c: number }>();
    assert.equal(count?.c, 0);
  } finally {
    mockClaude.restore();
  }
});

test("T3.2.6: Combinatorial Scheduling: Request blocked when quota reached even if user asks to schedule", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "CS6", adminName: "Dr", email: "cs6@test.com", password: "senhaSegura123", phone: "11911110006"
    });
    await db.prepare("UPDATE tenants SET trial_messages_used = 100 WHERE id = ?1").bind(body.tenantId).run();

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Gostaria de agendar amanhã às 10h" }),
      }),
      env
    );

    assert.equal(res.status, 403);
    const data = (await res.json()) as any;
    assert.equal(data.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(data.error && typeof data.error === "string");
    assert.equal(mockClaude.calls.length, 0);
  } finally {
    mockClaude.restore();
  }
});

test("T3.2.7: Combinatorial Scheduling: Malformed JSON in <<<AGENDAR: {bad json}>>> handled safely", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie } = await registerTestClinic(env, {
      clinicName: "CS7", adminName: "Dr", email: "cs7@test.com", password: "senhaSegura123", phone: "11911110007"
    });

    mockClaude.queueReply("Quase lá! <<<AGENDAR: {patient_name: malformed, scheduled_at>>> Resposta de teste.");

    const res = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Agendar" }),
      }),
      env
    );

    assert.equal(res.status, 200);
  } finally {
    mockClaude.restore();
  }
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 SCENARIOS)
// ============================================================================

test("T4.1: Scenario 1: Complete Self-Service Onboarding & First Test Drive", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    // Step 1: Visit registration page
    const getReg = await executeRequest(new Request("https://aura.test/cadastro"), env);
    assert.equal(getReg.status, 200);

    // Step 2: Submit registration
    const { res: regRes, body: regBody, cookie } = await registerTestClinic(env, {
      clinicName: "Clínica Sorriso VIP",
      adminName: "Dr. Marcelo Ramos",
      email: "marcelo@sorrisovip.com.br",
      password: "SenhaSegura2026!",
      phone: "(11) 97777-8888",
    });

    assert.equal(regRes.status, 201);
    assert.equal(regBody.success, true);
    assert.equal(regBody.redirect, "/inbox");
    assert.ok(cookie.length > 0);

    // Step 3: Access /inbox with session
    const inboxRes = await executeRequest(new Request("https://aura.test/inbox", { headers: { cookie } }), env);
    assert.equal(inboxRes.status, 200);

    // Step 4: First test drive turn in simulator
    mockClaude.queueReply("Olá Dr. Marcelo! Nossa limpeza dental dura 30 minutos e realizamos profilaxia completa.");
    const chatRes = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Olá, gostaria de saber quanto tempo dura a limpeza dental." }),
      }),
      env
    );

    assert.equal(chatRes.status, 200);
    const chatData = (await chatRes.json()) as any;
    assert.ok(chatData.reply.includes("limpeza dental dura 30 minutos"));
    assert.equal(chatData.trial.trial_messages_used, 1);
    assert.equal(chatData.trial.days_remaining, 7);

    // Step 5: Assert DB state
    const tenant = await getTenantById(env.DB, regBody.tenantId);
    assert.equal(tenant?.trial_messages_used, 1);
    const msgs = await db.prepare("SELECT COUNT(*) as c FROM messages WHERE tenant_id = ?1").bind(regBody.tenantId).first<{ c: number }>();
    assert.equal(msgs?.c, 0, "No messages in WhatsApp messages table");
  } finally {
    mockClaude.restore();
  }
});

test("T4.2: Scenario 2: Test Drive AI Appointment Booking & CRM Calendar Check", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Odonto Vida",
      adminName: "Dra. Laura",
      email: "laura@odontovida.com",
      password: "SenhaSegura2026!",
      phone: "11988887777",
    });

    mockClaude.queueReply(
      `Perfeito, Fernanda! Sua avaliação está agendada para amanhã às 14h com o Dr. Marcelo. <<<AGENDAR: {"patient_name":"Fernanda Lima","procedure":"Avaliação Geral","scheduled_at":"2026-11-20 14:00","duration":"30 min"}>>> Te aguardamos na clínica!`
    );

    const chatRes = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Quero agendar uma avaliação com o Dr. Marcelo amanhã às 14:00, meu nome é Fernanda Lima." }),
      }),
      env
    );

    assert.equal(chatRes.status, 200);
    const chatData = (await chatRes.json()) as any;
    assert.ok(!chatData.reply.includes("<<<AGENDAR"));
    assert.equal(chatData.action.type, "appointment_created");

    // Check appointment in CRM Calendar
    const apptsRes = await executeRequest(new Request("https://aura.test/api/appointments", { headers: { cookie } }), env);
    assert.equal(apptsRes.status, 200);
    const appts = await listAppointments(env.DB, body.tenantId);
    assert.equal(appts.length, 1);
    assert.equal(appts[0].patient_name, "Fernanda Lima");
    assert.equal(appts[0].contact_wa_id, "simulador");

    // Check zero WhatsApp conversation pollution
    const convs = await listConversations(env.DB, body.tenantId);
    assert.equal(convs.length, 0);
  } finally {
    mockClaude.restore();
  }
});

test("T4.3: Scenario 3: Quota Exhaustion & Degradation to Read-Only Mode", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Read Only",
      adminName: "Dr. Read Only",
      email: "readonly@clinica.com",
      password: "SenhaSegura2026!",
      phone: "11988886666",
    });

    // Advance to 99 messages used
    await db.prepare("UPDATE tenants SET trial_messages_used = 99 WHERE id = ?1").bind(body.tenantId).run();

    // 100th message succeeds
    const res100 = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem número 100" }),
      }),
      env
    );
    assert.equal(res100.status, 200);

    // 101st message fails with HTTP 403
    const res101 = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem número 101" }),
      }),
      env
    );
    assert.equal(res101.status, 403);
    const data101 = (await res101.json()) as any;
    assert.equal(data101.code, "TRIAL_LIMIT_EXCEEDED");
    assert.equal(data101.trial.can_send_messages, false);

    // Verify Read-Only access to panel and APIs remains 100% accessible
    const inbox = await executeRequest(new Request("https://aura.test/inbox", { headers: { cookie } }), env);
    assert.equal(inbox.status, 200);

    const appts = await executeRequest(new Request("https://aura.test/api/appointments", { headers: { cookie } }), env);
    assert.equal(appts.status, 200);

    const profile = await executeRequest(new Request("https://aura.test/api/clinic/profile", { headers: { cookie } }), env);
    assert.equal(profile.status, 200);

    const users = await executeRequest(new Request("https://aura.test/api/clinic/users", { headers: { cookie } }), env);
    assert.equal(users.status, 200);
  } finally {
    mockClaude.restore();
  }
});

test("T4.4: Scenario 4: Multi-Tenant Concurrent Isolation", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const clinicA = await registerTestClinic(env, {
      clinicName: "Clínica Alfa",
      adminName: "Dr. Alfa",
      email: "alfa@clinica.com",
      password: "SenhaSegura2026!",
      phone: "11988885555",
    });

    const clinicB = await registerTestClinic(env, {
      clinicName: "Clínica Beta",
      adminName: "Dr. Beta",
      email: "beta@clinica.com",
      password: "SenhaSegura2026!",
      phone: "11988884444",
    });

    // Clinic A has 50 messages used; Clinic B is exhausted with 100 messages used
    await db.prepare("UPDATE tenants SET trial_messages_used = 50 WHERE id = ?1").bind(clinicA.body.tenantId).run();
    await db.prepare("UPDATE tenants SET trial_messages_used = 100 WHERE id = ?1").bind(clinicB.body.tenantId).run();

    // Parallel requests
    const [resA, resB] = await Promise.all([
      executeRequest(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie: clinicA.cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: "Mensagem da Clínica Alfa" }),
        }),
        env
      ),
      executeRequest(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie: clinicB.cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: "Mensagem da Clínica Beta" }),
        }),
        env
      ),
    ]);

    assert.equal(resA.status, 200, "Clinic A must succeed");
    assert.equal(resB.status, 403, "Clinic B must be blocked");

    const dataA = (await resA.json()) as any;
    assert.equal(dataA.trial.trial_messages_used, 51);

    const dataB = (await resB.json()) as any;
    assert.equal(dataB.code, "TRIAL_LIMIT_EXCEEDED");
  } finally {
    mockClaude.restore();
  }
});

test("T4.5: Scenario 5: Trial Expiration by Date & Immediate Recovery via Plan Upgrade", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);
  const mockClaude = new MockClaudeFixture();
  mockClaude.install();

  try {
    const { cookie, body } = await registerTestClinic(env, {
      clinicName: "Clínica Upgrade",
      adminName: "Dr. Upgrade",
      email: "upgrade@clinica.com",
      password: "SenhaSegura2026!",
      phone: "11988883333",
    });

    // Force expiration
    await db.prepare("UPDATE tenants SET trial_ends_at = datetime('now', '-2 hours') WHERE id = ?1").bind(body.tenantId).run();

    // Simulator is blocked
    const expiredRes = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Ainda consigo testar?" }),
      }),
      env
    );
    assert.equal(expiredRes.status, 403);
    const data = (await expiredRes.json()) as any;
    assert.equal(data.code, "TRIAL_LIMIT_EXCEEDED");
    assert.ok(data.error && typeof data.error === "string");

    // Verify Read-Only access remains intact
    const inbox = await executeRequest(new Request("https://aura.test/inbox", { headers: { cookie } }), env);
    assert.equal(inbox.status, 200);

    // Upgrade plan to active
    await db.prepare("UPDATE tenants SET plan_status = 'active' WHERE id = ?1").bind(body.tenantId).run();

    // Subsequent simulator chat succeeds immediately
    mockClaude.queueReply("Bem-vindo ao plano ativo da Aura AI! Como posso lhe ajudar?");
    const upgradedRes = await executeRequest(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Agora sou assinante ativo!" }),
      }),
      env
    );

    assert.equal(upgradedRes.status, 200);
    const upgradedData = (await upgradedRes.json()) as any;
    assert.equal(upgradedData.trial.can_send_messages, true);
    assert.equal(upgradedData.trial.plan_status, "active");
  } finally {
    mockClaude.restore();
  }
});
