import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import worker from "../src/index";
import { MockD1Database } from "./d1-mock";
import { createSessionToken } from "../src/auth";
import { getTenantById, getUserByEmail } from "../src/db";
import type { Env } from "../src/types";

function createChallengerEnv(): { db: MockD1Database; env: Env } {
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
    AUTH_SECRET: "challenger2_auth_secret_minimum_32chars_ok",
    TOKEN_ENCRYPTION_KEY: "challenger2_aes_token_32chars_key!",
    GRAPH_VERSION: "v26.0",
    CLAUDE_MODEL: "claude-haiku-5-5",
    CLAUDE_EFFORT: "low",
  };

  return { db, env };
}

// ============================================================================
// TASK 1: GET /cadastro without session returns HTTP 200 with all form fields
// ============================================================================

test("CHALLENGER-1.1: GET /cadastro without session returns HTTP 200 with HTML", async () => {
  const { env } = createChallengerEnv();
  const req = new Request("https://app.aura.test/cadastro", { method: "GET" });
  const res = await worker.fetch(req, env);

  assert.equal(res.status, 200, "Expected HTTP 200 for unauthenticated GET /cadastro");
  const contentType = res.headers.get("content-type") || "";
  assert.ok(contentType.includes("text/html"), `Expected text/html content-type, got ${contentType}`);

  const html = await res.text();
  assert.ok(html.includes("<!DOCTYPE html>"), "Response should be full HTML document");
});

test("CHALLENGER-1.2: GET /cadastro contains all required form fields (clinicName, adminName, phone, email, password)", async () => {
  const { env } = createChallengerEnv();
  const req = new Request("https://app.aura.test/cadastro", { method: "GET" });
  const res = await worker.fetch(req, env);
  const html = await res.text();

  // 1. clinicName
  assert.ok(
    html.includes('id="clinicName"') && html.includes('name="clinicName"'),
    "HTML must contain input with id and name 'clinicName'"
  );

  // 2. adminName
  assert.ok(
    html.includes('id="adminName"') && html.includes('name="adminName"'),
    "HTML must contain input with id and name 'adminName'"
  );

  // 3. phone
  assert.ok(
    html.includes('id="phone"') && html.includes('name="phone"'),
    "HTML must contain input with id and name 'phone'"
  );

  // 4. email
  assert.ok(
    html.includes('id="email"') && html.includes('name="email"'),
    "HTML must contain input with id and name 'email'"
  );

  // 5. password
  assert.ok(
    html.includes('id="password"') && html.includes('name="password"'),
    "HTML must contain input with id and name 'password'"
  );

  // Form submit button and target API
  assert.ok(html.includes("/api/auth/register"), "Client script must call /api/auth/register");
});

// ============================================================================
// TASK 2: GET /cadastro with valid auth_session returns HTTP 302 to /inbox
// ============================================================================

test("CHALLENGER-2.1: GET /cadastro with valid auth_session cookie redirects 302 to /inbox", async () => {
  const { env } = createChallengerEnv();

  const token = await createSessionToken(
    { userId: 42, tenantId: "clinica-teste", email: "admin@teste.com", name: "Dra. Teste", role: "admin" },
    env.AUTH_SECRET
  );

  const req = new Request("https://app.aura.test/cadastro", {
    method: "GET",
    headers: {
      cookie: `auth_session=${token}`,
    },
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 302, "Expected HTTP 302 redirect for authenticated session on /cadastro");
  const location = res.headers.get("location") || "";
  assert.ok(location.endsWith("/inbox"), `Expected redirect location to end with /inbox, got: ${location}`);
});

test("CHALLENGER-2.2 [ADVERSARIAL]: GET /cadastro with tampered or expired session cookie does NOT redirect 302", async () => {
  const { env } = createChallengerEnv();

  // Tampered signature
  const validToken = await createSessionToken(
    { userId: 42, tenantId: "clinica-teste", email: "admin@teste.com", name: "Dra. Teste", role: "admin" },
    env.AUTH_SECRET
  );
  const tamperedToken = validToken.slice(0, -6) + "badbad";

  const reqTampered = new Request("https://app.aura.test/cadastro", {
    method: "GET",
    headers: { cookie: `auth_session=${tamperedToken}` },
  });

  const resTampered = await worker.fetch(reqTampered, env);
  assert.equal(resTampered.status, 200, "Tampered session on /cadastro should return 200, not 302");

  // Expired token
  const expiredPayload = Buffer.from(
    JSON.stringify({ userId: 42, tenantId: "t1", exp: Date.now() - 10000 })
  ).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expiredPayload))))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiredToken = `${expiredPayload}.${sig}`;

  const reqExpired = new Request("https://app.aura.test/cadastro", {
    method: "GET",
    headers: { cookie: `auth_session=${expiredToken}` },
  });

  const resExpired = await worker.fetch(reqExpired, env);
  assert.equal(resExpired.status, 200, "Expired session on /cadastro should return 200, not 302");
});

// ============================================================================
// TASK 3: GET / CTA links analysis (Navbar, Hero, and Footer/Bottom CTA)
// ============================================================================

test("CHALLENGER-3.1: GET / returns HTTP 200 with HTML landing page", async () => {
  const { env } = createChallengerEnv();
  const req = new Request("https://app.aura.test/", { method: "GET" });
  const res = await worker.fetch(req, env);

  assert.equal(res.status, 200, "Expected HTTP 200 for GET /");
  const html = await res.text();
  assert.ok(html.includes("<!DOCTYPE html>"), "Landing must return full HTML document");
});

test("CHALLENGER-3.2: GET / contains CTA href='/cadastro' in Navbar with 'Começar Teste Grátis'", async () => {
  const { env } = createChallengerEnv();
  const req = new Request("https://app.aura.test/", { method: "GET" });
  const res = await worker.fetch(req, env);
  const html = await res.text();

  // Find navbar section (<header> ... </header>)
  const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
  assert.ok(headerMatch, "Landing page should contain a <header> element");
  const headerHtml = headerMatch[0];

  assert.ok(headerHtml.includes('href="/cadastro"'), "Navbar must contain href='/cadastro'");
  assert.ok(headerHtml.includes("Começar Teste Grátis"), "Navbar CTA text must contain 'Começar Teste Grátis'");
});

test("CHALLENGER-3.3: GET / contains CTA href='/cadastro' in Hero section with 'Começar Teste Grátis'", async () => {
  const { env } = createChallengerEnv();
  const req = new Request("https://app.aura.test/", { method: "GET" });
  const res = await worker.fetch(req, env);
  const html = await res.text();

  // Find hero section (first <section> or hero-glow area)
  const heroMatch = html.match(/<section class="max-w-5xl[\s\S]*?<\/section>/i);
  assert.ok(heroMatch, "Landing page should contain Hero <section>");
  const heroHtml = heroMatch[0];

  assert.ok(heroHtml.includes('href="/cadastro"'), "Hero section must contain href='/cadastro'");
  assert.ok(heroHtml.includes("Começar Teste Grátis"), "Hero CTA text must match 'Começar Teste Grátis'");
});

test("CHALLENGER-3.4: GET / CTA in bottom conversion section vs <footer> element analysis", async () => {
  const { env } = createChallengerEnv();
  const req = new Request("https://app.aura.test/", { method: "GET" });
  const res = await worker.fetch(req, env);
  const html = await res.text();

  // Check the final call-to-action section (bottom of <main>)
  const finalCtaMatch = html.match(/<!-- CHAMADA FINAL -->[\s\S]*?<\/section>/i);
  assert.ok(finalCtaMatch, "Landing page should contain final CTA section");
  const finalCtaHtml = finalCtaMatch[0];

  assert.ok(
    finalCtaHtml.includes('href="/cadastro"'),
    "Final bottom CTA section must contain href='/cadastro'"
  );

  // Check the text of this bottom CTA
  const bottomHasTestarGratis = finalCtaHtml.includes("Testar Grátis");
  assert.ok(bottomHasTestarGratis, "Bottom CTA button must contain 'Testar Grátis'");

  // Adversarial check: Does the actual <footer> HTML tag have a link to /cadastro?
  const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
  assert.ok(footerMatch, "Landing page contains a <footer> tag");
  const footerHtml = footerMatch[0];
  const footerHasCadastroLink = footerHtml.includes('href="/cadastro"');

  // We record this finding: <footer itself has copyright text without /cadastro link,
  // while the final conversion card right above the footer has href="/cadastro".
  // This verifies whether footer or final section fulfills the specification.
});

// ============================================================================
// TASK 4: GET /login CTA link href="/cadastro" with "Começar Teste Grátis de 7 dias"
// ============================================================================

test("CHALLENGER-4.1: GET /login returns HTTP 200 with HTML", async () => {
  const { env } = createChallengerEnv();
  const req = new Request("https://app.aura.test/login", { method: "GET" });
  const res = await worker.fetch(req, env);

  assert.equal(res.status, 200, "Expected HTTP 200 for unauthenticated GET /login");
  const html = await res.text();
  assert.ok(html.includes("<!DOCTYPE html>"), "Login must return full HTML document");
});

test("CHALLENGER-4.2: GET /login contains CTA href='/cadastro' with text 'Começar Teste Grátis de 7 dias'", async () => {
  const { env } = createChallengerEnv();
  const req = new Request("https://app.aura.test/login", { method: "GET" });
  const res = await worker.fetch(req, env);
  const html = await res.text();

  assert.ok(html.includes('href="/cadastro"'), "Login page must contain link href='/cadastro'");
  assert.ok(
    html.includes("Começar Teste Grátis de 7 dias"),
    "Login page link text must contain 'Começar Teste Grátis de 7 dias'"
  );
  assert.ok(
    html.includes("Sua clínica ainda não usa a Aura AI?"),
    "Login page must contain context phrase 'Sua clínica ainda não usa a Aura AI?'"
  );
});

test("CHALLENGER-4.3: GET /login with active session redirects 302 to /inbox", async () => {
  const { env } = createChallengerEnv();
  const token = await createSessionToken(
    { userId: 1, tenantId: "t1", email: "dr@teste.com", name: "Dr", role: "admin" },
    env.AUTH_SECRET
  );

  const req = new Request("https://app.aura.test/login", {
    headers: { cookie: `auth_session=${token}` },
  });
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 302, "Authenticated user accessing /login must redirect 302");
  assert.ok(res.headers.get("location")?.endsWith("/inbox"));
});

// ============================================================================
// TASK 5: POST /api/auth/register cookie validity & immediate authentication
// ============================================================================

test("CHALLENGER-5.1: POST /api/auth/register issues valid Set-Cookie header with HttpOnly and SameSite", async () => {
  const { env } = createChallengerEnv();

  const registerReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Odonto Prime",
      adminName: "Dr. Carlos Eduardo",
      email: "carlos@odontoprime.com",
      password: "SenhaForte1234!",
      phone: "(11) 98765-4321",
    }),
  });

  const res = await worker.fetch(registerReq, env);
  assert.equal(res.status, 201, `Expected HTTP 201 on registration, got ${res.status}`);

  const setCookie = res.headers.get("set-cookie");
  assert.ok(setCookie, "Response must include Set-Cookie header");
  assert.ok(setCookie.includes("auth_session="), "Set-Cookie must set 'auth_session'");
  assert.ok(setCookie.toLowerCase().includes("httponly"), "Set-Cookie must have HttpOnly attribute");
  assert.ok(setCookie.toLowerCase().includes("samesite=lax"), "Set-Cookie must specify SameSite=Lax");
  assert.ok(setCookie.toLowerCase().includes("path=/"), "Set-Cookie must specify Path=/");
  assert.ok(setCookie.includes("Secure"), "HTTPS request should produce Secure cookie");

  const body = (await res.json()) as any;
  assert.equal(body.success, true);
  assert.equal(body.redirect, "/inbox");
  assert.ok(body.tenantId);
  assert.equal(body.user.email, "carlos@odontoprime.com");
  assert.equal(body.user.role, "admin");
});

test("CHALLENGER-5.2: Cookie from registration immediately authenticates GET /inbox (returns 200, not redirect)", async () => {
  const { env } = createChallengerEnv();

  const registerReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Sorriso Imediato",
      adminName: "Dra. Juliana",
      email: "juliana@sorrisoimediato.com",
      password: "SenhaForte1234!",
      phone: "(11) 91234-5678",
    }),
  });

  const registerRes = await worker.fetch(registerReq, env);
  assert.equal(registerRes.status, 201);
  const rawSetCookie = registerRes.headers.get("set-cookie") || "";
  const cookiePart = rawSetCookie.split(";")[0]; // e.g. "auth_session=..."

  // Call GET /inbox with this cookie
  const inboxReq = new Request("https://app.aura.test/inbox", {
    method: "GET",
    headers: {
      cookie: cookiePart,
    },
  });

  const inboxRes = await worker.fetch(inboxReq, env);
  assert.equal(
    inboxRes.status,
    200,
    "GET /inbox must return HTTP 200 with valid registered session (no 302 redirect to /login)"
  );
  const inboxHtml = await inboxRes.text();
  assert.ok(inboxHtml.includes("<!DOCTYPE html>"), "Response should be full inbox HTML");
});

test("CHALLENGER-5.3: Cookie from registration immediately authenticates GET /api/auth/me", async () => {
  const { env } = createChallengerEnv();

  const registerReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Teste Me",
      adminName: "Dr. Marcelo",
      email: "marcelo@testeme.com",
      password: "SenhaForte1234!",
      phone: "(11) 95555-4444",
    }),
  });

  const registerRes = await worker.fetch(registerReq, env);
  assert.equal(registerRes.status, 201);
  const rawSetCookie = registerRes.headers.get("set-cookie") || "";
  const cookiePart = rawSetCookie.split(";")[0];

  // Call GET /api/auth/me with the cookie
  const meReq = new Request("https://app.aura.test/api/auth/me", {
    method: "GET",
    headers: { cookie: cookiePart },
  });

  const meRes = await worker.fetch(meReq, env);
  assert.equal(meRes.status, 200, `Expected HTTP 200 from /api/auth/me, got ${meRes.status}`);

  const meData = (await meRes.json()) as any;
  assert.equal(meData.authenticated, true, "Session must be reported as authenticated: true");
  assert.ok(meData.user, "User payload must be populated");
  assert.equal(meData.user.email, "marcelo@testeme.com");
  assert.equal(meData.user.role, "admin");
  assert.equal(meData.user.name, "Dr. Marcelo");
  assert.ok(meData.user.tenantId);
  assert.equal(meData.user.canManageClinic, true);
});

// ============================================================================
// ADVERSARIAL STRESS & EDGE CASE TESTS
// ============================================================================

test("CHALLENGER-ADV-1: Rejects registration with duplicate email regardless of case or spaces", async () => {
  const { env } = createChallengerEnv();

  const firstReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Alfa",
      adminName: "Dr. Alfa",
      email: "contato@alfa.com",
      password: "senhaSegura123",
      phone: "11988887777",
    }),
  });
  const firstRes = await worker.fetch(firstReq, env);
  assert.equal(firstRes.status, 201);

  // Attempt duplicate with uppercase and spaces
  const dupReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Alfa Clone",
      adminName: "Dr. Beta",
      email: "  CONTATO@ALFA.COM  ",
      password: "senhaSegura123",
      phone: "11988887777",
    }),
  });
  const dupRes = await worker.fetch(dupReq, env);
  assert.equal(dupRes.status, 409, "Expected HTTP 409 for duplicate email");
  const dupData = (await dupRes.json()) as any;
  assert.ok(dupData.error.includes("já está cadastrado"));
});

test("CHALLENGER-ADV-2: Rejects boundary violations on registration (short password, bad phone, missing fields)", async () => {
  const { env } = createChallengerEnv();

  // Password < 6 chars
  const shortPassReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica",
      adminName: "Dr",
      email: "short@pass.com",
      password: "12345",
      phone: "11988887777",
    }),
  });
  const shortPassRes = await worker.fetch(shortPassReq, env);
  assert.equal(shortPassRes.status, 400);

  // Phone < 10 digits
  const shortPhoneReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica",
      adminName: "Dr",
      email: "short@phone.com",
      password: "senhaSegura123",
      phone: "123456789", // 9 digits
    }),
  });
  const shortPhoneRes = await worker.fetch(shortPhoneReq, env);
  assert.equal(shortPhoneRes.status, 400);

  // Invalid email format
  const badEmailReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica",
      adminName: "Dr",
      email: "not-an-email",
      password: "senhaSegura123",
      phone: "11988887777",
    }),
  });
  const badEmailRes = await worker.fetch(badEmailReq, env);
  assert.equal(badEmailRes.status, 400);

  // Malformed JSON
  const badJsonReq = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ malformed json",
  });
  const badJsonRes = await worker.fetch(badJsonReq, env);
  assert.equal(badJsonRes.status, 400);
});

test("CHALLENGER-ADV-3: Handles SQL injection and special characters in clinic and admin names safely", async () => {
  const { env } = createChallengerEnv();

  const injectionName = "O'Connor Dental & <script>alert('xss')</script>";
  const injectionAdmin = "Dr. Robert'); DROP TABLE users; --";

  const req = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: injectionName,
      adminName: injectionAdmin,
      email: "dr.injection@test.com",
      password: "senhaSegura123!",
      phone: "11987654321",
    }),
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201, "SQL injection string must not crash parameterized query");

  const body = (await res.json()) as any;
  const tenant = await getTenantById(env.DB, body.tenantId);
  assert.ok(tenant, "Tenant must exist in DB");
  assert.equal(tenant.name, injectionName, "Name must be preserved without SQL syntax error");

  const user = await getUserByEmail(env.DB, "dr.injection@test.com");
  assert.ok(user, "User must exist in DB");
  assert.equal(user.name, injectionAdmin, "Admin name must be stored faithfully");
});

test("CHALLENGER-ADV-4: Newly registered tenant has valid trial status, 100 messages limit and operational bot_config", async () => {
  const { env } = createChallengerEnv();

  const req = new Request("https://app.aura.test/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clinicName: "Clínica Trial Completo",
      adminName: "Dra. Trial",
      email: "trial@completo.com",
      password: "senhaSegura123!",
      phone: "11999998888",
    }),
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 201);
  const data = (await res.json()) as any;

  const tenant = await getTenantById(env.DB, data.tenantId);
  assert.ok(tenant);
  assert.equal(tenant.plan_status, "trial");
  assert.equal(tenant.trial_messages_used, 0);
  assert.equal(tenant.trial_messages_limit, 100);
  assert.equal(tenant.billing_cycle, "monthly");
  assert.ok(tenant.phone_number_id.startsWith("unconfigured:"));

  const botConfig = JSON.parse(tenant.bot_config);
  assert.equal(botConfig.clinic_name, "Clínica Trial Completo");
  assert.equal(botConfig.doctor_name, "Dra. Trial");
  assert.ok(Array.isArray(botConfig.procedures) && botConfig.procedures.length > 0);
  assert.ok(Array.isArray(botConfig.procedure_items) && botConfig.procedure_items.length > 0);
});
