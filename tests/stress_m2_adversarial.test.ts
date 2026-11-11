import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import worker from "../src/index";
import { MockD1Database } from "./d1-mock";
import { createSessionToken } from "../src/auth";
import type { Env } from "../src/types";

function createTestEnv(): { db: MockD1Database; env: Env } {
  const db = new MockD1Database();
  db.applyMigrations(path.resolve("migrations"));

  const env: Env = {
    DB: db as unknown as D1Database,
    INBOX: {
      send: async () => {},
      sendBatch: async () => {},
    } as unknown as Queue<any>,
    META_APP_SECRETS: "sec1,sec2",
    WA_VERIFY_TOKEN: "verify_token",
    ANTHROPIC_API_KEY: "sk-ant-test",
    WA_LAB_TOKEN: "lab_token",
    AUTH_SECRET: "adversarial_verifier_secret_32chars_long!",
    TOKEN_ENCRYPTION_KEY: "adversarial_aes_key_32chars_long!!",
    GRAPH_VERSION: "v26.0",
    CLAUDE_MODEL: "claude-haiku-5-5",
    CLAUDE_EFFORT: "low",
  };

  return { db, env };
}

// ============================================================================
// SUITE 1: ADVERSARIAL SESSION TAMPERING ON GET /cadastro
// ============================================================================

test("STRESS-1.1: GET /cadastro with completely arbitrary random strings in cookie", async () => {
  const { env } = createTestEnv();
  const arbitraryValues = [
    "",
    "   ",
    "null",
    "undefined",
    "false",
    "{}",
    "12345678",
    "bearer token",
    "admin.true",
    "../etc/passwd",
    "' OR '1'='1",
    "<script>alert(1)</script>",
    "A".repeat(1000), // long string
  ];

  for (const val of arbitraryValues) {
    const req = new Request("https://app.aura.test/cadastro", {
      headers: { cookie: `auth_session=${encodeURIComponent(val)}` },
    });
    const res = await worker.fetch(req, env);
    assert.equal(
      res.status,
      200,
      `Cookie auth_session='${val}' must return HTTP 200, but got ${res.status}`
    );
    const html = await res.text();
    assert.ok(html.includes("id=\"clinicName\""), "Must render registration form");
  }
});

test("STRESS-1.2: GET /cadastro with token signed by a different secret key", async () => {
  const { env } = createTestEnv();
  const alienSecret = "completely_different_foreign_secret_32!";
  const alienToken = await createSessionToken(
    { userId: 99, tenantId: "hacked-tenant", email: "evil@attacker.com", name: "Attacker", role: "admin" },
    alienSecret
  );

  const req = new Request("https://app.aura.test/cadastro", {
    headers: { cookie: `auth_session=${alienToken}` },
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200, "Token with foreign secret must be rejected and return 200");
});

test("STRESS-1.3: GET /cadastro with structurally broken signatures and payloads", async () => {
  const { env } = createTestEnv();

  // Valid token as base
  const validToken = await createSessionToken(
    { userId: 1, tenantId: "t1", email: "dr@valid.com", name: "Dr", role: "admin" },
    env.AUTH_SECRET
  );
  const [b64, sig] = validToken.split(".");

  const brokenTokens = [
    `${b64}`, // missing signature part
    `${b64}.${sig}.extra`, // three parts instead of two
    `${b64}.`, // empty signature
    `.${sig}`, // empty payload
    `${b64}.${sig.slice(0, 10)}`, // truncated signature
    `${b64}.${sig}00`, // elongated signature
    `${b64}.${sig.replace(/a/g, "b")}`, // bit-flipped signature
    `not_base_64!!!.${sig}`, // invalid base64
  ];

  for (const token of brokenTokens) {
    const req = new Request("https://app.aura.test/cadastro", {
      headers: { cookie: `auth_session=${token}` },
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200, `Broken token '${token.slice(0, 20)}...' must return 200`);
  }
});

test("STRESS-1.4: GET /cadastro with missing required fields in signed token", async () => {
  const { env } = createTestEnv();

  // Craft HMAC helper
  async function signCustom(payloadObj: any): Promise<string> {
    const b64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(b64))))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${b64}.${sig}`;
  }

  const validExp = Date.now() + 100000;
  const incompletePayloads = [
    { exp: validExp }, // missing everything
    { exp: validExp, userId: 1 }, // missing tenantId, email, name
    { exp: validExp, userId: 1, tenantId: "t1" }, // missing email, name
    { exp: validExp, userId: 1, tenantId: "t1", email: "a@b.com" }, // missing name
    { exp: validExp, userId: 1, tenantId: "t1", name: "Name" }, // missing email
    { userId: 1, tenantId: "t1", email: "a@b.com", name: "Name" }, // missing exp
    { exp: Date.now() - 1, userId: 1, tenantId: "t1", email: "a@b.com", name: "Name" }, // expired
  ];

  for (const payload of incompletePayloads) {
    const token = await signCustom(payload);
    const req = new Request("https://app.aura.test/cadastro", {
      headers: { cookie: `auth_session=${token}` },
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200, `Incomplete payload must reject and return 200 on /cadastro`);
  }
});

// ============================================================================
// SUITE 2: VALID SESSION ON GET /cadastro REDIRECTS 302 TO /inbox
// ============================================================================

test("STRESS-2.1: Valid cookie redirects 302 to /inbox", async () => {
  const { env } = createTestEnv();
  const token = await createSessionToken(
    { userId: 10, tenantId: "clinica-odonto", email: "dra@odonto.com", name: "Dra Odonto", role: "admin" },
    env.AUTH_SECRET
  );

  const req = new Request("https://app.aura.test/cadastro", {
    headers: { cookie: `auth_session=${token}` },
  });
  const res = await worker.fetch(req, env);

  assert.equal(res.status, 302, "Valid session on /cadastro must redirect 302");
  const loc = res.headers.get("location");
  assert.equal(loc, "https://app.aura.test/inbox", "Must redirect specifically to /inbox");
});

test("STRESS-2.2: Valid Authorization Bearer header redirects 302 to /inbox", async () => {
  const { env } = createTestEnv();
  const token = await createSessionToken(
    { userId: 10, tenantId: "clinica-odonto", email: "dra@odonto.com", name: "Dra Odonto", role: "admin" },
    env.AUTH_SECRET
  );

  const req = new Request("https://app.aura.test/cadastro", {
    headers: { authorization: `Bearer ${token}` },
  });
  const res = await worker.fetch(req, env);

  assert.equal(res.status, 302, "Valid Bearer token on /cadastro must redirect 302");
  assert.equal(res.headers.get("location"), "https://app.aura.test/inbox");
});

// ============================================================================
// SUITE 3: REGISTRATION COOKIE ISSUANCE & FLAGS
// ============================================================================

test("STRESS-3.1: Cookie issuance over HTTPS has Secure, HttpOnly, SameSite=Lax, Path=/", async () => {
  const { env } = createTestEnv();

  const req = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Segura HTTPS",
      adminName: "Dr. HTTPS",
      email: "https@segura.com",
      password: "SenhaSuperSegura123!",
      phone: "11988889999",
    }),
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);

  const setCookie = res.headers.get("set-cookie") || "";
  assert.ok(setCookie.startsWith("auth_session="), "Cookie must start with auth_session=");
  assert.ok(setCookie.includes("HttpOnly"), "Must have HttpOnly flag");
  assert.ok(setCookie.includes("SameSite=Lax"), "Must have SameSite=Lax");
  assert.ok(setCookie.includes("Path=/"), "Must have Path=/");
  assert.ok(setCookie.includes("Max-Age=604800"), "Must have Max-Age=604800 (7 days)");
  assert.ok(setCookie.includes("Secure"), "HTTPS request must have Secure flag");
});

test("STRESS-3.2: Cookie issuance over HTTP (plain dev) omits Secure flag", async () => {
  const { env } = createTestEnv();

  const req = new Request("http://localhost:8787/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Dev HTTP",
      adminName: "Dr. HTTP",
      email: "http@dev.com",
      password: "SenhaSuperSegura123!",
      phone: "11977778888",
    }),
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);

  const setCookie = res.headers.get("set-cookie") || "";
  assert.ok(setCookie.startsWith("auth_session="));
  assert.ok(setCookie.includes("HttpOnly"));
  assert.ok(setCookie.includes("SameSite=Lax"));
  assert.ok(!setCookie.includes("Secure"), "HTTP plain request must NOT have Secure flag");
});

// ============================================================================
// SUITE 4: IMMEDIATE AUTHENTICATION ACCESS WITH REGISTRATION COOKIE
// ============================================================================

test("STRESS-4.1: Registration cookie gives immediate full access to /inbox, /api/auth/me, /api/clinic/profile", async () => {
  const { env } = createTestEnv();

  // 1. Register
  const regReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Acesso Imediato",
      adminName: "Dra. Acesso",
      email: "imediato@clinica.com",
      password: "SenhaForte1234!",
      phone: "11944443333",
    }),
  });

  const regRes = await worker.fetch(regReq, env);
  assert.equal(regRes.status, 201);
  const rawCookie = regRes.headers.get("set-cookie") || "";
  const cookiePart = rawCookie.split(";")[0]; // "auth_session=..."

  // 2. Access /inbox
  const inboxRes = await worker.fetch(
    new Request("https://app.aura.test/inbox", { headers: { cookie: cookiePart } }),
    env
  );
  assert.equal(inboxRes.status, 200, "/inbox should return 200 with registered cookie");
  const inboxHtml = await inboxRes.text();
  assert.ok(inboxHtml.includes("Aura AI"), "Inbox HTML loaded");

  // 3. Access /api/auth/me
  const meRes = await worker.fetch(
    new Request("https://app.aura.test/api/auth/me", { headers: { cookie: cookiePart } }),
    env
  );
  assert.equal(meRes.status, 200);
  const meJson = (await meRes.json()) as any;
  assert.equal(meJson.authenticated, true);
  assert.equal(meJson.user.email, "imediato@clinica.com");
  assert.equal(meJson.user.role, "admin");

  // 4. Access /api/clinic/profile (clinic routes)
  const profRes = await worker.fetch(
    new Request("https://app.aura.test/api/clinic/profile", { headers: { cookie: cookiePart } }),
    env
  );
  assert.equal(profRes.status, 200, "Should access clinic profile");
  const profJson = (await profRes.json()) as any;
  assert.equal(profJson.clinic.name, "Clínica Acesso Imediato");
  assert.equal(profJson.clinic.active, true);

  // 5. Access /cadastro with registered cookie -> redirects 302 to /inbox
  const cadRes = await worker.fetch(
    new Request("https://app.aura.test/cadastro", { headers: { cookie: cookiePart } }),
    env
  );
  assert.equal(cadRes.status, 302);
  assert.equal(cadRes.headers.get("location"), "https://app.aura.test/inbox");

  // 6. Access /login with registered cookie -> redirects 302 to /inbox
  const loginRes = await worker.fetch(
    new Request("https://app.aura.test/login", { headers: { cookie: cookiePart } }),
    env
  );
  assert.equal(loginRes.status, 302);
  assert.equal(loginRes.headers.get("location"), "https://app.aura.test/inbox");
});

// ============================================================================
// SUITE 5: LANDING AND LOGIN PAGE CTAs
// ============================================================================

test("STRESS-5.1: Landing page and Login page CTAs point accurately to /cadastro", async () => {
  const { env } = createTestEnv();

  // Landing page
  const landRes = await worker.fetch(new Request("https://app.aura.test/", { method: "GET" }), env);
  assert.equal(landRes.status, 200);
  const landHtml = await landRes.text();

  // Verify all occurrences of href="/cadastro" on landing page
  const cadastroMatches = landHtml.match(/href="\/cadastro"/g);
  assert.ok(
    cadastroMatches && cadastroMatches.length >= 3,
    `Landing page must have at least 3 CTAs pointing to /cadastro, found: ${cadastroMatches?.length}`
  );

  // Check navbar CTA
  assert.ok(
    landHtml.includes('id="navRegisterBtn"') && landHtml.includes('href="/cadastro"'),
    "Navbar CTA button present"
  );

  // Check Hero CTA
  assert.ok(
    landHtml.includes("Começar Teste Grátis (7 Dias)"),
    "Hero CTA text present"
  );

  // Check Final conversion section CTA
  assert.ok(
    landHtml.includes("Criar Conta & Testar Grátis"),
    "Final section CTA text present"
  );

  // Login page
  const logRes = await worker.fetch(new Request("https://app.aura.test/login", { method: "GET" }), env);
  assert.equal(logRes.status, 200);
  const logHtml = await logRes.text();

  assert.ok(
    logHtml.includes('href="/cadastro"'),
    "Login page must contain href='/cadastro'"
  );
  assert.ok(
    logHtml.includes("Começar Teste Grátis de 7 dias"),
    "Login page link text matches 'Começar Teste Grátis de 7 dias'"
  );
  assert.ok(
    logHtml.includes("Sua clínica ainda não usa a Aura AI?"),
    "Login page contextual text matches"
  );
});
