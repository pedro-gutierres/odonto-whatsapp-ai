import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import worker from "../src/index";
import { hashPassword, verifyPassword, decryptTenantToken, encryptTenantToken } from "../src/auth";
import type { Env } from "../src/types";
import { MockD1Database } from "./d1-mock";

function createTestEnv(db: MockD1Database, overrides: Partial<Env> = {}): Env {
  return {
    DB: db as unknown as D1Database,
    INBOX: {
      send: async () => {},
      sendBatch: async () => {},
    } as unknown as Queue<any>,
    META_APP_SECRETS: "meta_app_secret_primary,meta_app_secret_secondary",
    WA_VERIFY_TOKEN: "verify_token_test",
    ANTHROPIC_API_KEY: "sk-ant-test",
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

async function seedClinicAndUsers(db: MockD1Database) {
  const adminHash = await hashPassword("secret123");
  const staffHash = await hashPassword("staff123");
  const otherHash = await hashPassword("other123");

  await db
    .prepare(
      `INSERT INTO tenants (id, name, phone_number_id, bot_config, active)
       VALUES
       ('clinica-a', 'Clínica Alpha', 'unconfigured:clinica-a', '{"clinic_name":"Clínica Alpha"}', 1),
       ('clinica-b', 'Clínica Beta', '999888777666', '{"clinic_name":"Clínica Beta"}', 1),
       ('lab', 'Clínica Teste', '1459702903890342', '{"clinic_name":"Clínica Teste"}', 1)`
    )
    .run();

  await db
    .prepare(
      `INSERT INTO users (tenant_id, email, password_hash, name, role, active)
       VALUES
       ('clinica-a', 'admin@alpha.com', ?1, 'Dra. Alpha', 'admin', 1),
       ('clinica-a', 'recepcao@alpha.com', ?2, 'Recepção Alpha', 'staff', 1),
       ('clinica-b', 'admin@beta.com', ?3, 'Dr. Beta', 'admin', 1)`
    )
    .bind(adminHash, staffHash, otherHash)
    .run();
}

async function loginAndGetCookie(env: Env, email: string, password: string): Promise<string> {
  const res = await worker.fetch(
    new Request("https://aura.test/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
    env
  );
  assert.equal(res.status, 200);
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/auth_session=([^;]+)/);
  assert.ok(match, "Expected auth_session cookie");
  return `auth_session=${match[1]}`;
}

test("Auth crypto: PBKDF2 password hashing and AES-256-GCM token encryption", async () => {
  const hash = await hashPassword("MinhaSenhaForte!");
  assert.ok(hash.startsWith("pbkdf2_v1:"));
  assert.equal(await verifyPassword("MinhaSenhaForte!", hash), true);
  assert.equal(await verifyPassword("SenhaErrada", hash), false);

  const enc = await encryptTenantToken("EAAG_TOKEN_SECRETO_123", "master_key_123");
  assert.ok(enc.startsWith("enc:v1:"));
  assert.notEqual(enc, "EAAG_TOKEN_SECRETO_123");
  assert.equal(await decryptTenantToken(enc, "master_key_123"), "EAAG_TOKEN_SECRETO_123");
  assert.equal(await decryptTenantToken(enc, "wrong_master_key"), null);
});

test("Clinic profile & own password update (PBKDF2) + bot_config sync", async () => {
  const db = new MockD1Database();
  db.applyMigrations(path.resolve("migrations"));
  await seedClinicAndUsers(db);
  const env = createTestEnv(db);

  const adminCookie = await loginAndGetCookie(env, "admin@alpha.com", "secret123");
  const staffCookie = await loginAndGetCookie(env, "recepcao@alpha.com", "staff123");

  // GET /api/clinic/profile
  const getRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/profile", { headers: { cookie: adminCookie } }),
    env
  );
  assert.equal(getRes.status, 200);
  const getData = (await getRes.json()) as any;
  assert.equal(getData.clinic.id, "clinica-a");
  assert.equal(getData.whatsapp.configured, false);
  assert.equal(getData.whatsapp.raw_phone_number_id, "unconfigured:clinica-a");
  assert.equal(getData.canManageClinic, true);

  // Staff cannot mutate clinic profile
  const staffPatchRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/profile", {
      method: "PATCH",
      headers: { cookie: staffCookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "Tentativa Indevida" }),
    }),
    env
  );
  assert.equal(staffPatchRes.status, 403);

  // Admin updates clinic profile and syncs bot_config.clinic_name
  const patchRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/profile", {
      method: "PATCH",
      headers: { cookie: adminCookie, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Clínica Alpha Premium",
        legal_name: "Alpha Odontologia LTDA",
        cnpj: "12.345.678/0001-99",
        responsible_name: "Dra. Alpha",
        admin_phone: "(11) 99999-0000",
        contact_email: "contato@alpha.com",
      }),
    }),
    env
  );
  assert.equal(patchRes.status, 200);
  const patchData = (await patchRes.json()) as any;
  assert.equal(patchData.clinic.name, "Clínica Alpha Premium");
  assert.equal(patchData.clinic.cnpj, "12.345.678/0001-99");

  const tenantRow = await db.prepare("SELECT name, bot_config FROM tenants WHERE id = 'clinica-a'").first<any>();
  assert.equal(tenantRow.name, "Clínica Alpha Premium");
  assert.equal(JSON.parse(tenantRow.bot_config).clinic_name, "Clínica Alpha Premium");

  // Staff CAN change their own password
  const badPwdRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/password", {
      method: "POST",
      headers: { cookie: staffCookie, "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: "wrong", newPassword: "newpassword123" }),
    }),
    env
  );
  assert.equal(badPwdRes.status, 400);

  const okPwdRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/password", {
      method: "POST",
      headers: { cookie: staffCookie, "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: "staff123", newPassword: "newpassword123" }),
    }),
    env
  );
  assert.equal(okPwdRes.status, 200);

  // Verify new PBKDF2 hash stored and login works with new password
  const staffUser = await db.prepare("SELECT password_hash FROM users WHERE email = 'recepcao@alpha.com'").first<any>();
  assert.ok(staffUser.password_hash.startsWith("pbkdf2_v1:"));
  await loginAndGetCookie(env, "recepcao@alpha.com", "newpassword123");
});

test("Clinic team management: strict tenant isolation, pausing blocks auth, last-admin guardrail", async () => {
  const db = new MockD1Database();
  db.applyMigrations(path.resolve("migrations"));
  await seedClinicAndUsers(db);
  const env = createTestEnv(db);

  const alphaAdminCookie = await loginAndGetCookie(env, "admin@alpha.com", "secret123");
  const betaAdminCookie = await loginAndGetCookie(env, "admin@beta.com", "other123");

  // Alpha admin creates new staff user
  const createRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/users", {
      method: "POST",
      headers: { cookie: alphaAdminCookie, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Atendente 2",
        email: "atendente2@alpha.com",
        password: "user1234",
        role: "staff",
      }),
    }),
    env
  );
  assert.equal(createRes.status, 200);
  const created = (await createRes.json()) as any;
  assert.ok(created.id > 0);

  // Beta admin cannot see or modify Alpha users (cross-tenant isolation)
  const betaListRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/users", { headers: { cookie: betaAdminCookie } }),
    env
  );
  const betaList = (await betaListRes.json()) as any;
  assert.equal(betaList.users.length, 1);
  assert.equal(betaList.users[0].email, "admin@beta.com");

  const crossPatch = await worker.fetch(
    new Request("https://aura.test/api/clinic/users", {
      method: "PATCH",
      headers: { cookie: betaAdminCookie, "content-type": "application/json" },
      body: JSON.stringify({ id: created.id, active: false }),
    }),
    env
  );
  assert.equal(crossPatch.status, 404);

  // Alpha admin pauses atendente2 -> login and /api/auth/me must block
  const atendenteCookie = await loginAndGetCookie(env, "atendente2@alpha.com", "user1234");
  const pauseRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/users", {
      method: "PATCH",
      headers: { cookie: alphaAdminCookie, "content-type": "application/json" },
      body: JSON.stringify({ id: created.id, active: false }),
    }),
    env
  );
  assert.equal(pauseRes.status, 200);

  const pausedLogin = await worker.fetch(
    new Request("https://aura.test/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "atendente2@alpha.com", password: "user1234" }),
    }),
    env
  );
  assert.equal(pausedLogin.status, 403);

  const pausedMe = await worker.fetch(
    new Request("https://aura.test/api/auth/me", { headers: { cookie: atendenteCookie } }),
    env
  );
  assert.equal(pausedMe.status, 401);

  // Cannot delete self or last active admin
  const alphaUsersRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/users", { headers: { cookie: alphaAdminCookie } }),
    env
  );
  const alphaUsers = ((await alphaUsersRes.json()) as any).users;
  const selfAdmin = alphaUsers.find((u: any) => u.email === "admin@alpha.com");

  const selfDeleteRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/users", {
      method: "DELETE",
      headers: { cookie: alphaAdminCookie, "content-type": "application/json" },
      body: JSON.stringify({ id: selfAdmin.id }),
    }),
    env
  );
  assert.equal(selfDeleteRes.status, 400);

  // Delete atendente2 cleanly
  const delRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/users", {
      method: "DELETE",
      headers: { cookie: alphaAdminCookie, "content-type": "application/json" },
      body: JSON.stringify({ id: created.id }),
    }),
    env
  );
  assert.equal(delRes.status, 200);
});

test("WhatsApp Meta Embedded Signup, AES-256-GCM storage, duplicate conflict, diagnostics & disconnect", async () => {
  const db = new MockD1Database();
  db.applyMigrations(path.resolve("migrations"));
  await seedClinicAndUsers(db);
  const env = createTestEnv(db);

  const alphaCookie = await loginAndGetCookie(env, "admin@alpha.com", "secret123");

  // 1. Diagnosis before connecting must show unconfigured and NEVER fallback to 'lab'
  const diagBeforeRes = await worker.fetch(
    new Request("https://aura.test/api/clinic/whatsapp/diagnose", {
      method: "POST",
      headers: { cookie: alphaCookie },
    }),
    env
  );
  assert.equal(diagBeforeRes.status, 200);
  const diagBefore = (await diagBeforeRes.json()) as any;
  assert.equal(diagBefore.summary, "error");
  assert.equal(diagBefore.whatsapp.configured, false);
  assert.equal(diagBefore.whatsapp.raw_phone_number_id, "unconfigured:clinica-a");

  // 2. Mock Meta Graph API responses for Embedded Signup flow
  const originalFetch = globalThis.fetch;
  const calledUrls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calledUrls.push(`${init?.method || "GET"} ${url}`);

    if (url.includes("/oauth/access_token")) {
      return new Response(JSON.stringify({ access_token: "EAAG_NEW_CLIENT_TOKEN", token_type: "bearer" }), { status: 200 });
    }
    if (url.includes("/debug_token")) {
      return new Response(
        JSON.stringify({
          data: {
            is_valid: true,
            granular_scopes: [{ scope: "whatsapp_business_management", target_ids: ["111222333444"] }],
          },
        }),
        { status: 200 }
      );
    }
    if (url.includes("/111222333444/phone_numbers")) {
      return new Response(
        JSON.stringify({
          data: [{ id: "555666777888", display_phone_number: "+55 11 98765-4321", verified_name: "Clínica Alpha Odonto" }],
        }),
        { status: 200 }
      );
    }
    if (url.includes("/555666777888?fields=")) {
      return new Response(
        JSON.stringify({
          id: "555666777888",
          display_phone_number: "+55 11 98765-4321",
          verified_name: "Clínica Alpha Odonto",
          quality_rating: "GREEN",
          code_verification_status: "VERIFIED",
        }),
        { status: 200 }
      );
    }
    if (url.includes("/111222333444/subscribed_apps") && init?.method === "POST") {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (url.includes("/111222333444/subscribed_apps")) {
      return new Response(
        JSON.stringify({ data: [{ whatsapp_business_api_data: { id: "123456789012345", name: "Aura AI" } }] }),
        { status: 200 }
      );
    }
    if (url.includes("/555666777888/register") && init?.method === "POST") {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: { message: "Unexpected Graph URL: " + url } }), { status: 404 });
  }) as typeof fetch;

  try {
    // 3. Embedded Signup without explicit waba_id/phone_number_id (tests debug_token + phone_numbers discovery!)
    const esRes = await worker.fetch(
      new Request("https://aura.test/api/clinic/whatsapp/embedded-signup", {
        method: "POST",
        headers: { cookie: alphaCookie, "content-type": "application/json" },
        body: JSON.stringify({ code: "meta_oauth_code_123", pin: "123456" }),
      }),
      env
    );
    assert.equal(esRes.status, 200);
    const esData = (await esRes.json()) as any;
    assert.equal(esData.success, true);
    assert.equal(esData.steps.tokenExchanged, true);
    assert.equal(esData.steps.webhookSubscribed, true);
    assert.equal(esData.steps.phoneRegistered, true);
    assert.equal(esData.whatsapp.configured, true);
    assert.equal(esData.whatsapp.phone_number_id, "555666777888");
    assert.equal(esData.whatsapp.waba_id, "111222333444");
    assert.equal(esData.whatsapp.token_source, "custom_encrypted");
    assert.equal(esData.whatsapp.display_phone_number, "+55 11 98765-4321");

    // Verify token stored in D1 is encrypted in AES-256-GCM and decrypts back cleanly
    const dbTenant = await db
      .prepare("SELECT phone_number_id, waba_id, access_token_enc, whatsapp_diagnosed_at FROM tenants WHERE id = 'clinica-a'")
      .first<any>();
    assert.ok(dbTenant.whatsapp_diagnosed_at);
    assert.ok(dbTenant.access_token_enc.startsWith("enc:v1:"));
    assert.equal(
      await decryptTenantToken(dbTenant.access_token_enc, env.TOKEN_ENCRYPTION_KEY!),
      "EAAG_NEW_CLIENT_TOKEN"
    );

    // 4. Duplicate phone_number_id owned by clinica-b must return 409 Conflict
    const dupRes = await worker.fetch(
      new Request("https://aura.test/api/clinic/whatsapp/embedded-signup", {
        method: "POST",
        headers: { cookie: alphaCookie, "content-type": "application/json" },
        body: JSON.stringify({
          code: "meta_oauth_code_456",
          waba_id: "111222333444",
          phone_number_id: "999888777666",
        }),
      }),
      env
    );
    assert.equal(dupRes.status, 409);

    // 5. Diagnose after connection returns 'ok'
    const diagAfterRes = await worker.fetch(
      new Request("https://aura.test/api/clinic/whatsapp/diagnose", {
        method: "POST",
        headers: { cookie: alphaCookie },
      }),
      env
    );
    assert.equal(diagAfterRes.status, 200);
    const diagAfter = (await diagAfterRes.json()) as any;
    assert.equal(diagAfter.summary, "ok");

    // 6. Disconnect resets phone_number_id to unconfigured:clinica-a and clears token
    const discRes = await worker.fetch(
      new Request("https://aura.test/api/clinic/whatsapp/disconnect", {
        method: "POST",
        headers: { cookie: alphaCookie },
      }),
      env
    );
    assert.equal(discRes.status, 200);
    const discData = (await discRes.json()) as any;
    assert.equal(discData.whatsapp.configured, false);
    assert.equal(discData.whatsapp.raw_phone_number_id, "unconfigured:clinica-a");
    assert.equal(discData.whatsapp.has_custom_token, false);
    assert.equal((await db.prepare("SELECT whatsapp_diagnosed_at FROM tenants WHERE id='clinica-a'").first<any>()).whatsapp_diagnosed_at,null);

    // 7. Manual WhatsApp connection requires own token for regular clinics & encrypts it
    const manualMissingTokenRes = await worker.fetch(
      new Request("https://aura.test/api/clinic/whatsapp/manual", {
        method: "POST",
        headers: { cookie: alphaCookie, "content-type": "application/json" },
        body: JSON.stringify({ phoneNumberId: "555666777888", wabaId: "111222333444" }),
      }),
      env
    );
    assert.equal(manualMissingTokenRes.status, 400);

    const manualOkRes = await worker.fetch(
      new Request("https://aura.test/api/clinic/whatsapp/manual", {
        method: "POST",
        headers: { cookie: alphaCookie, "content-type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: "555666777888",
          wabaId: "111222333444",
          accessToken: "EAAG_MANUAL_TOKEN_999",
        }),
      }),
      env
    );
    assert.equal(manualOkRes.status, 200);
    const manualOkData = (await manualOkRes.json()) as any;
    assert.equal(manualOkData.success, true);
    assert.equal(manualOkData.whatsapp.configured, true);
    assert.equal(manualOkData.whatsapp.token_source, "custom_encrypted");
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Verify /inbox serves the 4th module HTML and settings.js script tag
  const inboxRes = await worker.fetch(
    new Request("https://aura.test/inbox", { headers: { cookie: alphaCookie } }),
    env
  );
  assert.equal(inboxRes.status, 200);
  const inboxHtml = await inboxRes.text();
  assert.ok(inboxHtml.includes('id="viewSettings"'));
  assert.ok(inboxHtml.includes('/js/inbox/settings.js'));

  assert.ok(calledUrls.some((u) => u.includes("/oauth/access_token")));
  assert.ok(calledUrls.some((u) => u.includes("/subscribed_apps")));
  assert.ok(calledUrls.some((u) => u.includes("/register")));
});
