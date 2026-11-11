import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import worker from "../src/index";
import { getTenantById, getUserByEmail, isCrucialConfigComplete } from "../src/db";
import type { Env, Tenant } from "../src/types";
import { MockD1Database } from "./d1-mock";

function ensureMigration0009(db: MockD1Database): void {
  const cols = db.sqlite.prepare("PRAGMA table_info(tenants)").all() as Array<{ name: string }>;
  const existingCols = new Set(cols.map((c) => c.name));

  if (!existingCols.has("plan_status")) {
    db.sqlite.exec(
      "ALTER TABLE tenants ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'trial' CHECK (plan_status IN ('trial', 'active', 'past_due', 'canceled'));"
    );
  }
  if (!existingCols.has("trial_ends_at")) {
    db.sqlite.exec("ALTER TABLE tenants ADD COLUMN trial_ends_at TEXT;");
  }
  if (!existingCols.has("trial_messages_used")) {
    db.sqlite.exec("ALTER TABLE tenants ADD COLUMN trial_messages_used INTEGER NOT NULL DEFAULT 0;");
  }
  if (!existingCols.has("trial_messages_limit")) {
    db.sqlite.exec("ALTER TABLE tenants ADD COLUMN trial_messages_limit INTEGER NOT NULL DEFAULT 100;");
  }
  if (!existingCols.has("billing_cycle")) {
    db.sqlite.exec("ALTER TABLE tenants ADD COLUMN billing_cycle TEXT DEFAULT 'monthly';");
  }
}

function initTestDb(): MockD1Database {
  const db = new MockD1Database();
  db.applyMigrations(path.resolve("migrations"));
  ensureMigration0009(db);
  return db;
}

function createTestEnv(db: MockD1Database): Env {
  return {
    DB: db as unknown as D1Database,
    INBOX: {
      send: async () => {},
      sendBatch: async () => {},
    } as unknown as Queue<any>,
    META_APP_SECRETS: "meta_secret",
    WA_VERIFY_TOKEN: "verify_token",
    ANTHROPIC_API_KEY: "sk-ant-test",
    WA_LAB_TOKEN: "wa_lab_token",
    AUTH_SECRET: "test_auth_secret_for_unit_tests_32chars",
    TOKEN_ENCRYPTION_KEY: "test_token_aes_key_for_unit_tests_32",
    GRAPH_VERSION: "v26.0",
    CLAUDE_MODEL: "claude-haiku-5-5",
    CLAUDE_EFFORT: "low",
    META_APP_ID: "12345",
    META_EMBEDDED_CONFIG_ID: "98765",
  };
}

async function callRegister(env: Env, body: any): Promise<Response> {
  const req = new Request("https://aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return worker.fetch(req, env);
}

// ============================================================================
// ADVERSARIAL TEST SUITE — MILESTONE 2: PUBLIC REGISTRATION & CTAS
// ============================================================================

test("CHALLENGER-1: Duplicate email case-insensitivity (User@Clinic.com vs user@clinic.com) -> HTTP 409", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  // First registration with lowercase email
  const res1 = await callRegister(env, {
    clinicName: "Clínica Alfa",
    adminName: "Dr. Alfa",
    email: "user@clinic.com",
    password: "password123",
    phone: "11987654321",
  });
  assert.equal(res1.status, 201, "First registration must succeed with 201");

  // Second registration with mixed case email
  const res2 = await callRegister(env, {
    clinicName: "Clínica Beta",
    adminName: "Dr. Beta",
    email: "User@Clinic.com",
    password: "password456",
    phone: "11987654322",
  });
  assert.equal(res2.status, 409, "Mixed-case duplicate email must be rejected with HTTP 409");
  const data2 = (await res2.json()) as any;
  assert.ok(data2.error, "Error message must be present");

  // Third registration with uppercase + leading/trailing whitespace
  const res3 = await callRegister(env, {
    clinicName: "Clínica Gama",
    adminName: "Dr. Gama",
    email: "  USER@CLINIC.COM  ",
    password: "password789",
    phone: "11987654323",
  });
  assert.equal(res3.status, 409, "Uppercase with whitespace duplicate email must be rejected with HTTP 409");
});

test("CHALLENGER-2: Whitespace trimming on clinic name, admin name, and email", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await callRegister(env, {
    clinicName: "   Clínica Sorriso Perfeito   ",
    adminName: "   Dra. Renata Vasconcelos   ",
    email: "   Renata@SorrisoPerfeito.com   ",
    password: "password123",
    phone: "   (11) 98765-4321   ",
  });
  assert.equal(res.status, 201, "Registration with padded whitespace must succeed with 201");
  const body = (await res.json()) as any;

  // Verify DB tenant state
  const tenant = await getTenantById(env.DB, body.tenantId);
  assert.ok(tenant, "Tenant must exist");
  assert.equal(tenant.name, "Clínica Sorriso Perfeito", "Clinic name must be trimmed");
  assert.equal(tenant.responsible_name, "Dra. Renata Vasconcelos", "Responsible name must be trimmed");
  assert.equal(tenant.contact_email, "renata@sorrisoperfeito.com", "Contact email must be trimmed and lowercased");

  // Verify DB user state
  const user = await getUserByEmail(env.DB, "renata@sorrisoperfeito.com");
  assert.ok(user, "User must exist with lowercased email");
  assert.equal(user.name, "Dra. Renata Vasconcelos", "User name must be trimmed");
  assert.equal(user.email, "renata@sorrisoperfeito.com", "User email must be trimmed and lowercased");
});

test("CHALLENGER-3: Whitespace-only fields rejected with HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const testCases = [
    { name: "whitespace clinicName", body: { clinicName: "   ", adminName: "Dr", email: "a@b.com", password: "password123", phone: "11999999999" } },
    { name: "whitespace adminName", body: { clinicName: "Clinica", adminName: "   ", email: "a@b.com", password: "password123", phone: "11999999999" } },
    { name: "whitespace email", body: { clinicName: "Clinica", adminName: "Dr", email: "   ", password: "password123", phone: "11999999999" } },
    { name: "whitespace phone", body: { clinicName: "Clinica", adminName: "Dr", email: "a@b.com", password: "password123", phone: "   " } },
  ];

  for (const tc of testCases) {
    const res = await callRegister(env, tc.body);
    assert.equal(res.status, 400, `Expected HTTP 400 for ${tc.name}`);
  }
});

test("CHALLENGER-4: Passwords shorter than 6 chars rejected with HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const shortPasswords = ["", "1", "12", "123", "1234", "12345", "abcde"];
  for (const pwd of shortPasswords) {
    const res = await callRegister(env, {
      clinicName: "Clínica Teste",
      adminName: "Dr. Teste",
      email: `test_pwd_${pwd.length}@clinic.com`,
      password: pwd,
      phone: "11987654321",
    });
    assert.equal(res.status, 400, `Password "${pwd}" (len ${pwd.length}) must be rejected with HTTP 400`);
    const data = (await res.json()) as any;
    assert.ok(data.error, "Must include error message");
  }

  // Exactly 6 chars should succeed
  const resValid = await callRegister(env, {
    clinicName: "Clínica Teste 6",
    adminName: "Dr. Teste",
    email: "test_pwd_6@clinic.com",
    password: "123456",
    phone: "11987654321",
  });
  assert.equal(resValid.status, 201, "Password with exactly 6 chars should succeed with HTTP 201");
});

test("CHALLENGER-5: Malformed emails (bad@, @bad.com, noatsign, spaces, missing TLD) -> HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const malformedEmails = [
    { email: "bad@", reason: "Missing domain and TLD" },
    { email: "@bad.com", reason: "Missing user/local part" },
    { email: "noatsign", reason: "Missing @ symbol" },
    { email: "spaces in email@domain.com", reason: "Spaces in local part" },
    { email: "user@domain with space.com", reason: "Spaces in domain part" },
    { email: "bad email@domain.com", reason: "Spaces in email" },
    { email: "@.", reason: "Only @ and dot" },
    { email: "user@domain", reason: "Missing TLD" },
    { email: "user@.com", reason: "Missing domain before TLD" },
    { email: "user@domain.", reason: "Trailing dot with no TLD" },
    { email: ".user@domain.com", reason: "Leading dot in local part" },
  ];

  const results: Array<{ email: string; reason: string; status: number; passed: boolean }> = [];

  for (const item of malformedEmails) {
    const res = await callRegister(env, {
      clinicName: "Clínica Email Test",
      adminName: "Dr. Email",
      email: item.email,
      password: "password123",
      phone: "11987654321",
    });
    const passed = res.status === 400;
    results.push({ email: item.email, reason: item.reason, status: res.status, passed });
  }

  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0) {
    const msg = failures.map((f) => `Email "${f.email}" (${f.reason}) returned ${f.status} instead of 400`).join("\n  ");
    assert.fail(`Malformed email acceptance vulnerability detected in POST /api/auth/register:\n  ${msg}`);
  }
});

test("CHALLENGER-6: Short/invalid phone numbers (< 10 digits) -> HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const invalidPhones = [
    "",
    "1",
    "123",
    "123456789",          // 9 digits
    "abc-def-ghij",        // 0 digits
    "(11) 9876-543",       // 9 digits
    "++--(( ))",          // 0 digits
  ];

  for (const phone of invalidPhones) {
    const res = await callRegister(env, {
      clinicName: "Clínica Phone Test",
      adminName: "Dr. Phone",
      email: `phone_${Math.random().toString(36).slice(2, 7)}@clinic.com`,
      password: "password123",
      phone,
    });
    assert.equal(res.status, 400, `Invalid phone "${phone}" MUST be rejected with HTTP 400, got ${res.status}`);
  }

  // 10 digits and 11 digits should succeed
  const res10 = await callRegister(env, {
    clinicName: "Clínica Phone 10",
    adminName: "Dr. Phone",
    email: "phone10@clinic.com",
    password: "password123",
    phone: "1198765432",
  });
  assert.equal(res10.status, 201, "10-digit phone must succeed with 201");

  const res11 = await callRegister(env, {
    clinicName: "Clínica Phone 11",
    adminName: "Dr. Phone",
    email: "phone11@clinic.com",
    password: "password123",
    phone: "+55 (11) 98765-4321",
  });
  assert.equal(res11.status, 201, "11-digit phone with formatting must succeed with 201");
});

test("CHALLENGER-7: Missing fields / empty body / invalid JSON -> HTTP 400", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  // Invalid JSON
  const resRaw = await worker.fetch(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "this is not json {",
    }),
    env
  );
  assert.equal(resRaw.status, 400, "Invalid JSON body must return 400");

  // Empty JSON object
  const resEmpty = await callRegister(env, {});
  assert.equal(resEmpty.status, 400, "Empty JSON object must return 400");

  // Each required field omitted
  const base = {
    clinicName: "Clínica Completa",
    adminName: "Dr. Completo",
    email: "completo@clinic.com",
    password: "password123",
    phone: "11987654321",
  };

  for (const field of Object.keys(base) as Array<keyof typeof base>) {
    const payload = { ...base };
    delete payload[field];
    const res = await callRegister(env, payload);
    assert.equal(res.status, 400, `Omission of ${field} must return HTTP 400`);
  }

  // Null field values
  for (const field of Object.keys(base) as Array<keyof typeof base>) {
    const payload: any = { ...base };
    payload[field] = null;
    const res = await callRegister(env, payload);
    assert.equal(res.status, 400, `Null value for ${field} must return HTTP 400`);
  }
});

test("CHALLENGER-8: Verify tenants.phone_number_id starts with 'unconfigured:' and links to tenantId", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await callRegister(env, {
    clinicName: "Clínica Teste ID",
    adminName: "Dr. Identificador",
    email: "identificador@clinic.com",
    password: "password123",
    phone: "11987654321",
  });
  assert.equal(res.status, 201);
  const data = (await res.json()) as any;

  const tenant = await getTenantById(env.DB, data.tenantId);
  assert.ok(tenant, "Tenant must exist");
  assert.ok(
    tenant.phone_number_id.startsWith("unconfigured:"),
    `phone_number_id '${tenant.phone_number_id}' must start with 'unconfigured:'`
  );
  assert.equal(
    tenant.phone_number_id,
    `unconfigured:${data.tenantId}`,
    "phone_number_id must equal 'unconfigured:<tenantId>'"
  );
});

test("CHALLENGER-9: Verify bot_config has isCrucialConfigComplete(cfg) === true and valid structure", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const res = await callRegister(env, {
    clinicName: "Clínica Config Test",
    adminName: "Dra. Especialista",
    email: "config@clinic.com",
    password: "password123",
    phone: "11987654321",
  });
  assert.equal(res.status, 201);
  const data = (await res.json()) as any;

  const tenant = await getTenantById(env.DB, data.tenantId);
  assert.ok(tenant, "Tenant must exist");
  assert.ok(tenant.bot_config, "bot_config must not be empty");

  let parsedConfig: any;
  assert.doesNotThrow(() => {
    parsedConfig = JSON.parse(tenant.bot_config);
  }, "bot_config must be valid JSON");

  // Critical requirement: isCrucialConfigComplete(cfg) must be true
  const isComplete = isCrucialConfigComplete(parsedConfig);
  assert.equal(isComplete, true, "isCrucialConfigComplete(parsedConfig) MUST be true for newly registered tenant");

  // Verify structure
  assert.equal(parsedConfig.clinic_name, "Clínica Config Test");
  assert.equal(parsedConfig.doctor_name, "Dra. Especialista");
  assert.ok(Array.isArray(parsedConfig.procedures) && parsedConfig.procedures.length > 0, "procedures must be non-empty array");
  assert.ok(parsedConfig.hours && parsedConfig.hours.length > 0, "hours must be configured");
});

test("CHALLENGER-10: Concurrent duplicate email registration race condition handling", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const payload = {
    clinicName: "Clínica Concorrente",
    adminName: "Dr. Concorrente",
    email: "race@clinic.com",
    password: "password123",
    phone: "11987654321",
  };

  // Fire 2 concurrent requests with exact same email
  const [res1, res2] = await Promise.all([
    callRegister(env, payload),
    callRegister(env, payload),
  ]);

  const statuses = [res1.status, res2.status].sort();
  // Exactly one should succeed (201) and the other should be rejected (409)
  assert.deepEqual(statuses, [201, 409], "Under race condition, exactly one must succeed (201) and the other must return 409");
});

test("CHALLENGER-11: Tampered/malformed JSON payload or non-string field types", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  // Payload with number/boolean types instead of strings
  const badTypes = [
    { clinicName: 12345, adminName: "Dr", email: "a@b.com", password: "password123", phone: "11987654321" },
    { clinicName: "Clinica", adminName: true, email: "a@b.com", password: "password123", phone: "11987654321" },
    { clinicName: "Clinica", adminName: "Dr", email: { bad: "object" }, password: "password123", phone: "11987654321" },
    { clinicName: "Clinica", adminName: "Dr", email: "a@b.com", password: ["array"], phone: "11987654321" },
  ];

  for (const p of badTypes) {
    const res = await callRegister(env, p);
    assert.equal(res.status, 400, "Non-string field values must be safely rejected with HTTP 400");
  }
});
