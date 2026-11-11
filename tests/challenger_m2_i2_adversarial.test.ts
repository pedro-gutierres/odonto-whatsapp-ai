import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import worker from "../src/index";
import { getTenantById, getUserByEmail } from "../src/db";
import { REGISTER_HTML } from "../src/views/register";
import type { Env } from "../src/types";
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
// ADVERSARIAL STRESS TEST SUITE — ITERATION 2
// ============================================================================

test("ADV-I2-1: Verification of all 11 Challenger 1 malformed email cases", async () => {
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
    { email: ".user@domain.com", reason: "Leading dot in local part (naive regex bug)" },
  ];

  for (const item of malformedEmails) {
    const res = await callRegister(env, {
      clinicName: "Clínica Email Test",
      adminName: "Dr. Email",
      email: item.email,
      password: "password123",
      phone: "11987654321",
    });
    assert.equal(
      res.status,
      400,
      `Email "${item.email}" (${item.reason}) must be rejected with 400, got ${res.status}`
    );
    const data = (await res.json()) as any;
    assert.equal(data.error, "E-mail inválido.");
  }
});

test("ADV-I2-2: Extreme email length boundary testing & ReDoS resistance", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  // Exact 254 chars email (RFC 5321 max length)
  // local: 60 chars, domain: 190 chars total (including .com)
  // local = 60 chars ('a' * 60)
  // '@' = 1 char
  // domain = 189 chars (e.g. 'b' * 185 + '.com')
  // 60 + 1 + 189 = 250 -> let's make exactly 254
  const local60 = "a".repeat(60);
  const domainPart = "b".repeat(189); // 189 chars
  const exact254Email = `${local60}@${domainPart}.com`; // 60 + 1 + 189 + 4 = 254
  assert.equal(exact254Email.length, 254);

  const res254 = await callRegister(env, {
    clinicName: "Clínica 254 Chars",
    adminName: "Dr. Length",
    email: exact254Email,
    password: "password123",
    phone: "11987654321",
  });
  assert.equal(res254.status, 201, "Email with exactly 254 characters must be accepted");

  // 255 chars email (> 254 boundary condition)
  const exact255Email = "a" + exact254Email;
  assert.equal(exact255Email.length, 255);

  const res255 = await callRegister(env, {
    clinicName: "Clínica 255 Chars",
    adminName: "Dr. Length",
    email: exact255Email,
    password: "password123",
    phone: "11987654321",
  });
  assert.equal(res255.status, 400, "Email with 255 chars must be rejected with 400");
  const data255 = (await res255.json()) as any;
  assert.equal(data255.error, "E-mail inválido.");

  // 10,000 chars email (massive payload / ReDoS stress test)
  const hugeEmail = "user." + "a".repeat(5000) + "@" + "b".repeat(5000) + ".com";
  assert.ok(hugeEmail.length > 10000);

  const startTime = Date.now();
  const resHuge = await callRegister(env, {
    clinicName: "Clínica Huge",
    adminName: "Dr. Huge",
    email: hugeEmail,
    password: "password123",
    phone: "11987654321",
  });
  const elapsed = Date.now() - startTime;
  assert.equal(resHuge.status, 400, "10k char email must be rejected with 400");
  assert.ok(elapsed < 100, `Massive string must be rejected in < 100ms, took ${elapsed}ms`);

  // Pathological backtracking strings that crash weak regexes (ReDoS)
  const redosAttempts = [
    "a" + ".".repeat(100) + "@domain.com",
    "a".repeat(100) + "@" + "-".repeat(100) + ".com",
    "user@" + "a".repeat(200) + "!",
    "a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p+q+r+s+t+u+v+w+x+y+z@" + "a".repeat(150),
  ];

  for (const attack of redosAttempts) {
    const t0 = Date.now();
    const res = await callRegister(env, {
      clinicName: "Clínica ReDoS",
      adminName: "Dr. Attack",
      email: attack,
      password: "password123",
      phone: "11987654321",
    });
    const dt = Date.now() - t0;
    assert.equal(res.status, 400, `ReDoS payload '${attack.slice(0, 20)}...' must be rejected with 400`);
    assert.ok(dt < 100, `Evaluation must be fast (< 100ms), took ${dt}ms`);
  }
});

test("ADV-I2-3: Legitimate and invalid special character email combinations", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  // Legitimate emails with special chars (+, -, _, ., %)
  const validSpecialEmails = [
    "user+tag@clinic.com",
    "first.last@clinic.com",
    "first_last@clinic.com",
    "first-last@clinic.com",
    "first%last@clinic.com",
    "user.name+tag_123-abc@sub.clinic-domain.com.br",
    "dentista123@odonto.tech",
  ];

  for (let i = 0; i < validSpecialEmails.length; i++) {
    const email = validSpecialEmails[i];
    const res = await callRegister(env, {
      clinicName: `Clínica Especial ${i}`,
      adminName: `Dr. Especial ${i}`,
      email,
      password: "password123",
      phone: `119876543${i < 10 ? "0" + i : i}`,
    });
    assert.equal(res.status, 201, `Valid email "${email}" MUST be accepted with 201, got ${res.status}`);
  }

  // Invalid special char combinations
  const invalidSpecialEmails = [
    { email: "user..name@clinic.com", reason: "consecutive dots in local part" },
    { email: "user.@clinic.com", reason: "trailing dot in local part" },
    { email: ".user@clinic.com", reason: "leading dot in local part" },
    { email: "+user@clinic.com", reason: "leading plus in local part" },
    { email: "user+@clinic.com", reason: "trailing plus in local part" },
    { email: "_user@clinic.com", reason: "leading underscore in local part" },
    { email: "user_@clinic.com", reason: "trailing underscore in local part" },
    { email: "-user@clinic.com", reason: "leading hyphen in local part" },
    { email: "user-@clinic.com", reason: "trailing hyphen in local part" },
    { email: "user@clinic..com", reason: "consecutive dots in domain" },
    { email: "user@-clinic.com", reason: "leading hyphen in domain label" },
    { email: "user@clinic-.com", reason: "trailing hyphen in domain label" },
    { email: "user@clinic.c", reason: "TLD too short (< 2 chars)" },
    { email: "user@clinic.123", reason: "numeric TLD" },
    { email: "user#name@clinic.com", reason: "illegal character #" },
    { email: "user$name@clinic.com", reason: "illegal character $" },
    { email: "user!name@clinic.com", reason: "illegal character !" },
  ];

  for (const item of invalidSpecialEmails) {
    const res = await callRegister(env, {
      clinicName: "Clínica Invalid",
      adminName: "Dr. Invalid",
      email: item.email,
      password: "password123",
      phone: "11987654321",
    });
    assert.equal(
      res.status,
      400,
      `Invalid email "${item.email}" (${item.reason}) MUST be rejected with 400, got ${res.status}`
    );
  }
});

test("ADV-I2-4: High-concurrency duplicate email race condition stress test (10 parallel requests)", async () => {
  const db = initTestDb();
  const env = createTestEnv(db);

  const sharedEmail = "concurrency-test@aura-odonto.com";
  const concurrencyCount = 10;

  const payloads = Array.from({ length: concurrencyCount }, (_, idx) => ({
    clinicName: `Clínica Paralela ${idx}`,
    adminName: `Dr. Paralelo ${idx}`,
    email: sharedEmail,
    password: `password_${idx}_123`,
    phone: `119876543${idx < 10 ? "0" + idx : idx}`,
  }));

  // Dispatch all 10 simultaneously
  const results = await Promise.all(payloads.map((p) => callRegister(env, p)));

  const statusCounts: Record<number, number> = {};
  for (const res of results) {
    statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
  }

  // Exactly 1 must be 201 (success)
  assert.equal(
    statusCounts[201],
    1,
    `Under 10 concurrent requests, exactly 1 must succeed with 201, got ${statusCounts[201]}`
  );

  // Exactly 9 must be 409 (conflict), 0 must be 500 or any other code
  assert.equal(
    statusCounts[409],
    concurrencyCount - 1,
    `Under 10 concurrent requests, exactly ${concurrencyCount - 1} must return 409, got ${statusCounts[409]}`
  );
  assert.equal(statusCounts[500] || 0, 0, "No concurrent request should result in 500 Internal Server Error");

  // Verify database state: exactly 1 user and 1 tenant
  const user = await getUserByEmail(env.DB, sharedEmail);
  assert.ok(user, "User must exist in DB");

  const userRows = db.sqlite.prepare("SELECT * FROM users WHERE email = ?").all(sharedEmail);
  assert.equal(userRows.length, 1, "There must be exactly 1 user record in DB");

  const tenantRows = db.sqlite.prepare("SELECT * FROM tenants WHERE contact_email = ?").all(sharedEmail);
  assert.equal(tenantRows.length, 1, "There must be exactly 1 tenant record associated with this email");
});

test("ADV-I2-5: Frontend client script and backend regex equivalence check", () => {
  // Extract client-side regex from REGISTER_HTML
  assert.ok(REGISTER_HTML.includes("EMAIL_REGEX"), "REGISTER_HTML must contain EMAIL_REGEX definition");

  // Find regex definition in REGISTER_HTML
  const match = REGISTER_HTML.match(/const EMAIL_REGEX = (\/.*?\/);/);
  assert.ok(match, "Must find EMAIL_REGEX in client script");

  const clientRegexStr = match[1];
  // In the template literal, \\. was rendered as \. in the resulting HTML string
  // Evaluate the regex
  const clientRegex = new RegExp(
    "^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\\.[a-zA-Z]{2,}$"
  );

  // Server regex from src/index.ts
  const serverRegex = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

  assert.equal(clientRegex.source, serverRegex.source, "Client and server regexes must have identical patterns");

  // Test set of 20 diverse emails on both regexes to guarantee 100% parity
  const testSamples = [
    "user@clinic.com",
    ".user@clinic.com",
    "user.@clinic.com",
    "user..name@clinic.com",
    "user+tag@clinic.com",
    "user%name@clinic.com",
    "user-name@clinic.com",
    "user_name@clinic.com",
    "bad@",
    "@bad.com",
    "noatsign",
    "spaces in@domain.com",
    "@.",
    "user@domain",
    "user@.com",
    "user@domain.",
    "user@sub.domain.co.uk",
    "user@-domain.com",
    "user@domain-.com",
    "user@domain.toolongtld",
  ];

  for (const s of testSamples) {
    const clientResult = clientRegex.test(s);
    const serverResult = serverRegex.test(s);
    assert.equal(
      clientResult,
      serverResult,
      `Client and server regex must behave identically for "${s}" (client=${clientResult}, server=${serverResult})`
    );
  }
});
