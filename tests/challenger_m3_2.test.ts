import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import worker, { runDayBeforeConfirmations } from "../src/index";
import { MockD1Database } from "./d1-mock";
import {
  listConversations,
  listAppointments,
  getTenantTrialInfo,
} from "../src/db";
import type { Env, Tenant } from "../src/types";

// ============================================================================
// CHALLENGER 2 HARNESS & FIXTURES
// ============================================================================

export class ChallengerMockClaude {
  private originalFetch: typeof globalThis.fetch | null = null;
  public calls: Array<{ url: string; body: any }> = [];
  public metaCalls: Array<{ url: string; body: any }> = [];
  private responseQueue: Array<string> = [];
  private defaultResponse = "Olá! Como posso ajudar você hoje?";

  install(): void {
    if (this.originalFetch) return;
    this.originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("graph.facebook.com")) {
        const parsedBody = init?.body ? (typeof init.body === "string" ? JSON.parse(init.body) : init.body) : {};
        this.metaCalls.push({ url, body: parsedBody });
        return new Response(JSON.stringify({ messages: [{ id: "wamid.mock" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("api.anthropic.com/v1/messages")) {
        const parsedBody = init?.body ? JSON.parse(init.body as string) : {};
        this.calls.push({ url, body: parsedBody });

        const replyText = this.responseQueue.shift() ?? this.defaultResponse;

        return new Response(
          JSON.stringify({
            id: "msg_mock_" + Math.random().toString(36).slice(2),
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: replyText }],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

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
    this.metaCalls = [];
    this.responseQueue = [];
  }

  queueReply(reply: string): void {
    this.responseQueue.push(reply);
  }
}

function createChallengerEnv(): { db: MockD1Database; env: Env } {
  const db = new MockD1Database();
  db.applyMigrations(path.resolve("migrations"));

  const env: Env = {
    DB: db as unknown as D1Database,
    INBOX: {
      send: async () => {},
      sendBatch: async () => {},
    } as unknown as Queue<any>,
    META_APP_SECRETS: "challenger_secret_1,challenger_secret_2",
    WA_VERIFY_TOKEN: "verify_token_test",
    ANTHROPIC_API_KEY: "sk-ant-challenger-key",
    WA_LAB_TOKEN: "wa_lab_fallback_token",
    AUTH_SECRET: "challenger_auth_secret_minimum_32chars_ok",
    TOKEN_ENCRYPTION_KEY: "challenger_aes_token_32chars_key!",
    GRAPH_VERSION: "v26.0",
    CLAUDE_MODEL: "claude-haiku-5-5",
    CLAUDE_EFFORT: "low",
  };

  return { db, env };
}

async function registerClinic(
  env: Env,
  data: { clinicName: string; adminName: string; email: string; password: string; phone: string }
): Promise<{ tenantId: string; cookie: string }> {
  const res = await worker.fetch(
    new Request("https://aura.test/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
    env
  );
  assert.equal(res.status, 201, "Registration must succeed with HTTP 201");
  const body = (await res.json()) as any;
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/auth_session=([^;]+)/);
  assert.ok(match, "Registration must set auth_session cookie");
  return { tenantId: body.tenantId, cookie: `auth_session=${match[1]}` };
}

// ============================================================================
// SUITE 1: DATA ISOLATION INVARIANTS
// ============================================================================

test("CHALLENGER-3.2-1: Data Isolation: 0 messages rows created across multiple simulator chat interactions", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Teste Zero Mensagens",
      adminName: "Dr. Zero",
      email: "zero@mensagens.com",
      password: "senhaSegura123",
      phone: "11988880001",
    });

    for (let i = 1; i <= 7; i++) {
      const res = await worker.fetch(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: `Mensagem de teste ${i} no simulador` }),
        }),
        env
      );
      assert.equal(res.status, 200, `Simulator turn ${i} must succeed`);
    }

    const rowGlobal = await db.prepare("SELECT COUNT(*) as cnt FROM messages").first<{ cnt: number }>();
    assert.equal(rowGlobal?.cnt, 0, "Global messages table must contain strictly 0 rows");

    const rowTenant = await db
      .prepare("SELECT COUNT(*) as cnt FROM messages WHERE tenant_id = ?1")
      .bind(tenantId)
      .first<{ cnt: number }>();
    assert.equal(rowTenant?.cnt, 0, "Tenant messages must contain strictly 0 rows");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-2: Data Isolation: 0 conversation_states rows created or modified by simulator", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie } = await registerClinic(env, {
      clinicName: "Clínica Sem Estados",
      adminName: "Dra. Estado",
      email: "estado@clinica.com",
      password: "senhaSegura123",
      phone: "11988880002",
    });

    const res = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Olá, quero atendimento" }),
      }),
      env
    );
    assert.equal(res.status, 200);

    const states = await db.prepare("SELECT COUNT(*) as cnt FROM conversation_states").first<{ cnt: number }>();
    assert.equal(states?.cnt, 0, "conversation_states table must have strictly 0 rows");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-3: Data Isolation: listConversations returns strictly empty array after simulator interactions", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Inbox Vazia",
      adminName: "Dr. Inbox",
      email: "inbox@vazia.com",
      password: "senhaSegura123",
      phone: "11988880003",
    });

    for (let i = 0; i < 4; i++) {
      await worker.fetch(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: `Interação ${i}` }),
        }),
        env
      );
    }

    const conversations = await listConversations(env.DB, tenantId);
    assert.ok(Array.isArray(conversations), "listConversations must return an array");
    assert.equal(conversations.length, 0, "listConversations must return strictly empty array (length 0)");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-4: Data Isolation: Meta Cloud API sendText is NEVER invoked during simulator chat", async () => {
  const { env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie } = await registerClinic(env, {
      clinicName: "Clínica Zero Meta Call",
      adminName: "Dr. Meta",
      email: "meta@nometa.com",
      password: "senhaSegura123",
      phone: "11988880004",
    });

    for (let i = 0; i < 5; i++) {
      const res = await worker.fetch(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: "Testando envio" }),
        }),
        env
      );
      assert.equal(res.status, 200);
    }

    assert.equal(mockClaude.metaCalls.length, 0, "Zero requests must be made to graph.facebook.com");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-5: Data Isolation: Simulator appointment tagged with contact_wa_id = 'simulador'", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Tag Simulador",
      adminName: "Dra. Tag",
      email: "tag@simulador.com",
      password: "senhaSegura123",
      phone: "11988880005",
    });

    mockClaude.queueReply(
      `Perfeito! Agendamento realizado com sucesso. <<<AGENDAR: {"patient_name":"Renato Silva","procedure":"Implante","scheduled_at":"2026-11-28 10:30","duration":"45 min"}>>> Qualquer dúvida estamos à disposição.`
    );

    const res = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Quero agendar meu implante com o Renato para dia 28/11 às 10:30" }),
      }),
      env
    );

    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.action?.type, "appointment_created");
    assert.ok(data.action?.appointmentId, "Must return created appointment ID");

    // Check DB record
    const app = await db
      .prepare("SELECT * FROM appointments WHERE id = ?1 AND tenant_id = ?2")
      .bind(data.action.appointmentId, tenantId)
      .first<any>();

    assert.ok(app, "Appointment row must exist in DB");
    assert.equal(app.contact_wa_id, "simulador", "Appointment contact_wa_id MUST be strictly 'simulador'");
    assert.equal(app.patient_name, "Renato Silva");
    assert.equal(app.procedure, "Implante");

    // Zero messages polluted
    const msgCount = await db.prepare("SELECT COUNT(*) as cnt FROM messages").first<{ cnt: number }>();
    assert.equal(msgCount?.cnt, 0, "Zero messages in messages table even after appointment creation");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-6: Data Isolation: runDayBeforeConfirmations skips appointments with contact_wa_id = 'simulador'", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Cron Safety",
      adminName: "Dr. Cron",
      email: "cron@safety.com",
      password: "senhaSegura123",
      phone: "11988880006",
    });

    // Compute tomorrow's date in America/Sao_Paulo (en-CA => YYYY-MM-DD)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(tomorrow);

    // 1. Create a simulator appointment for tomorrow
    mockClaude.queueReply(
      `Confirmado! <<<AGENDAR: {"patient_name":"Paciente Sim","procedure":"Avaliação","scheduled_at":"${tomorrowStr} 14:00"}>>>`
    );

    const simRes = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Marcar para amanhã às 14h" }),
      }),
      env
    );
    assert.equal(simRes.status, 200);

    // Verify appointment was created with contact_wa_id = 'simulador'
    const appointments = await listAppointments(env.DB, tenantId, tomorrowStr);
    assert.equal(appointments.length, 1);
    assert.equal(appointments[0].contact_wa_id, "simulador");

    // 2. Execute runDayBeforeConfirmations
    const result = await runDayBeforeConfirmations(env, tenantId);

    // Must have skipped the appointment
    assert.equal(result.total, 1, "Should have found 1 appointment for tomorrow");
    assert.equal(result.sent, 0, "Zero confirmations should have been sent");
    assert.equal(result.skipped, 1, "Simulator appointment must have been counted in skipped");
    assert.equal(result.failed, 0, "No failures expected");

    // Ensure no Meta outbound call occurred
    assert.equal(mockClaude.metaCalls.length, 0, "No Meta calls triggered by cron for simulator appointment");

    // Ensure no row in messages table
    const msgCount = await db.prepare("SELECT COUNT(*) as cnt FROM messages").first<{ cnt: number }>();
    assert.equal(msgCount?.cnt, 0, "messages table must remain at 0 rows");
  } finally {
    mockClaude.restore();
  }
});

// ============================================================================
// SUITE 2: MULTI-TENANT QUOTA ISOLATION
// ============================================================================

test("CHALLENGER-3.2-7: Quota Isolation: Clinic A message usage does not affect Clinic B", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const clinicA = await registerClinic(env, {
      clinicName: "Clínica Alpha",
      adminName: "Dr. Alpha",
      email: "alpha@clinica.com",
      password: "senhaSegura123",
      phone: "11977770001",
    });

    const clinicB = await registerClinic(env, {
      clinicName: "Clínica Beta",
      adminName: "Dr. Beta",
      email: "beta@clinica.com",
      password: "senhaSegura123",
      phone: "11977770002",
    });

    // Send 12 messages from Clinic A
    for (let i = 1; i <= 12; i++) {
      const res = await worker.fetch(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie: clinicA.cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: `Msg ${i} from Alpha` }),
        }),
        env
      );
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.trial.trial_messages_used, i);
    }

    // Verify Clinic B in database has still exactly 0 messages used
    const tenantB = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(clinicB.tenantId)
      .first<{ trial_messages_used: number }>();
    assert.equal(tenantB?.trial_messages_used, 0, "Clinic B must have 0 used messages");

    // Send 3 messages from Clinic B
    for (let i = 1; i <= 3; i++) {
      const res = await worker.fetch(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie: clinicB.cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: `Msg ${i} from Beta` }),
        }),
        env
      );
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.trial.trial_messages_used, i);
    }

    // Verify Clinic A is still 12, Clinic B is 3
    const tenantA_final = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(clinicA.tenantId)
      .first<{ trial_messages_used: number }>();
    const tenantB_final = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(clinicB.tenantId)
      .first<{ trial_messages_used: number }>();

    assert.equal(tenantA_final?.trial_messages_used, 12, "Clinic A must remain at 12");
    assert.equal(tenantB_final?.trial_messages_used, 3, "Clinic B must remain at 3");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-8: Quota Isolation: Clinic A exhausted does not block Clinic B", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const clinicA = await registerClinic(env, {
      clinicName: "Clínica Esgotada",
      adminName: "Dr. Esgotado",
      email: "esgotado@clinica.com",
      password: "senhaSegura123",
      phone: "11977770003",
    });

    const clinicB = await registerClinic(env, {
      clinicName: "Clínica Saudável",
      adminName: "Dr. Saudável",
      email: "saudavel@clinica.com",
      password: "senhaSegura123",
      phone: "11977770004",
    });

    // Manually set Clinic A to 100 messages used (exhausted limit)
    await db
      .prepare("UPDATE tenants SET trial_messages_used = 100 WHERE id = ?1")
      .bind(clinicA.tenantId)
      .run();

    // Verify Clinic A is blocked
    const resA = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie: clinicA.cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem 101 da clínica A" }),
      }),
      env
    );
    assert.equal(resA.status, 403, "Clinic A must be blocked with HTTP 403");
    const dataA = (await resA.json()) as any;
    assert.equal(dataA.code, "TRIAL_LIMIT_EXCEEDED");

    // Clinic B must NOT be blocked and must succeed
    const resB = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie: clinicB.cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem normal da clínica B" }),
      }),
      env
    );
    assert.equal(resB.status, 200, "Clinic B must succeed with HTTP 200");
    const dataB = (await resB.json()) as any;
    assert.equal(dataB.trial.trial_messages_used, 1);
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-9: Quota Isolation: Client cannot spoof or inject tenantId in body/query to affect other clinics", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const victim = await registerClinic(env, {
      clinicName: "Clínica Vítima",
      adminName: "Dr. Vítima",
      email: "vitima@clinica.com",
      password: "senhaSegura123",
      phone: "11977770005",
    });

    const attacker = await registerClinic(env, {
      clinicName: "Clínica Atacante",
      adminName: "Dr. Hacker",
      email: "hacker@clinica.com",
      password: "senhaSegura123",
      phone: "11977770006",
    });

    // Attacker sends request attempting to inject victim's tenantId in JSON body and URL query
    const res = await worker.fetch(
      new Request(`https://aura.test/api/simulator/chat?tenantId=${victim.tenantId}`, {
        method: "POST",
        headers: { cookie: attacker.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          message: "Tentativa de debitar cota de outra clínica",
          tenantId: victim.tenantId,
          tenant_id: victim.tenantId,
        }),
      }),
      env
    );
    assert.equal(res.status, 200);

    // Victim's quota must remain strictly 0
    const victimInfo = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(victim.tenantId)
      .first<{ trial_messages_used: number }>();
    assert.equal(victimInfo?.trial_messages_used, 0, "Victim tenant quota must remain untouched (0)");

    // Attacker's own quota must be debited
    const attackerInfo = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(attacker.tenantId)
      .first<{ trial_messages_used: number }>();
    assert.equal(attackerInfo?.trial_messages_used, 1, "Attacker's own quota must be debited (1)");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-10: Quota Isolation: Appointments created in simulator do not leak across clinics", async () => {
  const { env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const clinicA = await registerClinic(env, {
      clinicName: "Clínica A Agenda",
      adminName: "Dr. A",
      email: "agendaA@clinica.com",
      password: "senhaSegura123",
      phone: "11977770007",
    });

    const clinicB = await registerClinic(env, {
      clinicName: "Clínica B Agenda",
      adminName: "Dr. B",
      email: "agendaB@clinica.com",
      password: "senhaSegura123",
      phone: "11977770008",
    });

    mockClaude.queueReply(
      `Agendado! <<<AGENDAR: {"patient_name":"Paciente Exclusivo A","procedure":"Clareamento","scheduled_at":"2026-11-25 15:00"}>>>`
    );

    const resA = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie: clinicA.cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Marcar clareamento" }),
      }),
      env
    );
    assert.equal(resA.status, 200);

    // Clinic A has 1 appointment
    const appointmentsA = await listAppointments(env.DB, clinicA.tenantId);
    assert.equal(appointmentsA.length, 1);
    assert.equal(appointmentsA[0].patient_name, "Paciente Exclusivo A");

    // Clinic B has 0 appointments
    const appointmentsB = await listAppointments(env.DB, clinicB.tenantId);
    assert.equal(appointmentsB.length, 0, "Clinic B calendar must remain completely empty");
  } finally {
    mockClaude.restore();
  }
});

// ============================================================================
// SUITE 3: CONCURRENCY & BOUNDARY STRESS TESTS
// ============================================================================

test("CHALLENGER-3.2-11: High-concurrency race condition: 15 parallel simulator calls increment quota atomically", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Concorrência",
      adminName: "Dr. Paralelo",
      email: "paralelo@clinica.com",
      password: "senhaSegura123",
      phone: "11966660001",
    });

    const CONCURRENT_REQUESTS = 15;
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, idx) =>
      worker.fetch(
        new Request("https://aura.test/api/simulator/chat", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ message: `Mensagem concorrente #${idx + 1}` }),
        }),
        env
      )
    );

    const responses = await Promise.all(promises);
    for (let i = 0; i < responses.length; i++) {
      assert.equal(responses[i].status, 200, `Concurrent request ${i + 1} must return HTTP 200`);
    }

    const tenant = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(tenantId)
      .first<{ trial_messages_used: number }>();

    assert.equal(
      tenant?.trial_messages_used,
      CONCURRENT_REQUESTS,
      `Expected exactly ${CONCURRENT_REQUESTS} trial messages used after concurrent calls`
    );

    // Assert messages table is still strictly 0
    const msgCount = await db.prepare("SELECT COUNT(*) as cnt FROM messages").first<{ cnt: number }>();
    assert.equal(msgCount?.cnt, 0, "Messages table must remain at 0 rows");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-12: Boundary transition 99 -> 100 -> 101 strictly transitions and blocks at 100", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Fronteira",
      adminName: "Dr. Limite",
      email: "limite@clinica.com",
      password: "senhaSegura123",
      phone: "11966660002",
    });

    // Preset quota to 99 messages used
    await db
      .prepare("UPDATE tenants SET trial_messages_used = 99 WHERE id = ?1")
      .bind(tenantId)
      .run();

    // Request 100 (the final allowed message)
    const res100 = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem de número 100" }),
      }),
      env
    );
    assert.equal(res100.status, 200, "100th message must be accepted");
    const data100 = (await res100.json()) as any;
    assert.equal(data100.trial.trial_messages_used, 100);
    assert.equal(data100.trial.is_limit_reached, true);
    assert.equal(data100.trial.can_send_messages, false);

    const callsBefore101 = mockClaude.calls.length;

    // Request 101 (must be immediately rejected without calling Claude)
    const res101 = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem de número 101" }),
      }),
      env
    );
    assert.equal(res101.status, 403, "101st message must be rejected with HTTP 403");
    const data101 = (await res101.json()) as any;
    assert.equal(data101.code, "TRIAL_LIMIT_EXCEEDED");
    assert.equal(mockClaude.calls.length, callsBefore101, "Claude must NOT be called for blocked request");

    // Quota counter must NOT increment to 101 or beyond
    const finalTenant = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(tenantId)
      .first<{ trial_messages_used: number }>();
    assert.equal(finalTenant?.trial_messages_used, 100, "Counter must remain pegged at 100");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-13: Plan status matrix: active plan bypasses limits, past_due/canceled blocked", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Planos",
      adminName: "Dr. Planos",
      email: "planos@clinica.com",
      password: "senhaSegura123",
      phone: "11966660003",
    });

    // 1. Set to 'active' with 150 used (> limit 100)
    await db
      .prepare("UPDATE tenants SET plan_status = 'active', trial_messages_used = 150 WHERE id = ?1")
      .bind(tenantId)
      .run();

    const resActive = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Atendimento no plano ativo" }),
      }),
      env
    );
    assert.equal(resActive.status, 200, "Active plan should not be restricted by trial limit");

    // 2. Set to 'past_due'
    await db.prepare("UPDATE tenants SET plan_status = 'past_due' WHERE id = ?1").bind(tenantId).run();

    const resPastDue = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Tentativa past_due" }),
      }),
      env
    );
    assert.equal(resPastDue.status, 403, "Past_due must be blocked with HTTP 403");

    // 3. Set to 'canceled'
    await db.prepare("UPDATE tenants SET plan_status = 'canceled' WHERE id = ?1").bind(tenantId).run();

    const resCanceled = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Tentativa canceled" }),
      }),
      env
    );
    assert.equal(resCanceled.status, 403, "Canceled must be blocked with HTTP 403");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-14: Zero quota consumption on client validation errors (HTTP 400)", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Validação",
      adminName: "Dr. Validação",
      email: "validacao@clinica.com",
      password: "senhaSegura123",
      phone: "11966660004",
    });

    // Test empty message
    const res1 = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "" }),
      }),
      env
    );
    assert.equal(res1.status, 400);

    // Test whitespace-only message
    const res2 = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "   \n\t  " }),
      }),
      env
    );
    assert.equal(res2.status, 400);

    // Test malformed JSON
    const res3 = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: "not a json string{{{",
      }),
      env
    );
    assert.equal(res3.status, 400);

    // Ensure quota counter remains strictly 0
    const tenant = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(tenantId)
      .first<{ trial_messages_used: number }>();
    assert.equal(tenant?.trial_messages_used, 0, "Errors must NOT consume trial quota");
    assert.equal(mockClaude.calls.length, 0, "Claude must NOT be invoked on invalid requests");
  } finally {
    mockClaude.restore();
  }
});


// ============================================================================
// SUITE 4: ADDITIONAL ADVERSARIAL STRESS TESTS
// ============================================================================

test("CHALLENGER-3.2-15: Adversarial Date Expiration: Expired trial date blocks requests without Claude invocation", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Data Expirada",
      adminName: "Dr. Expirado",
      email: "dataexpirada@clinica.com",
      password: "senhaSegura123",
      phone: "11955550001",
    });

    // Set trial expiration to 2 days in the past
    await db
      .prepare("UPDATE tenants SET trial_ends_at = datetime('now', '-2 days') WHERE id = ?1")
      .bind(tenantId)
      .run();

    const res = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Tentando enviar após data expirar" }),
      }),
      env
    );

    assert.equal(res.status, 403, "Must return HTTP 403 for expired trial date");
    const data = (await res.json()) as any;
    assert.equal(data.code, "TRIAL_LIMIT_EXCEEDED");
    assert.equal(data.trial.is_expired, true);
    assert.equal(data.trial.can_send_messages, false);
    assert.equal(mockClaude.calls.length, 0, "Claude must not be called when trial date is expired");

    // Quota counter must not have incremented
    const tenant = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(tenantId)
      .first<{ trial_messages_used: number }>();
    assert.equal(tenant?.trial_messages_used, 0, "Quota must remain at 0");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-16: Adversarial Conflict Detection: Conflicting slot prevents duplicate appointment and avoids message pollution", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Conflito",
      adminName: "Dr. Ocupado",
      email: "ocupado@clinica.com",
      password: "senhaSegura123",
      phone: "11955550002",
    });

    // Seed existing appointment at 2026-11-20 15:00
    await db
      .prepare(
        `INSERT INTO appointments (tenant_id, contact_wa_id, patient_name, procedure, scheduled_at, status, duration)
         VALUES (?1, '5511999990000', 'Paciente Existente', 'Limpeza', '2026-11-20 15:00', 'agendado', '30 min')`
      )
      .bind(tenantId)
      .run();

    // Claude attempts to schedule on the exact same occupied slot
    mockClaude.queueReply(
      `Agendando! <<<AGENDAR: {"patient_name":"Paciente Novo","procedure":"Avaliação","scheduled_at":"2026-11-20 15:00","duration":"30 min"}>>>`
    );

    const res = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Marcar para dia 20 às 15h" }),
      }),
      env
    );
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;

    assert.equal(data.action?.type, "appointment_conflict");
    assert.ok(data.action?.message.includes("Conflito"));

    // Total appointments in DB for this tenant must still be 1 (the original one)
    const count = await db
      .prepare("SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ?1")
      .bind(tenantId)
      .first<{ cnt: number }>();
    assert.equal(count?.cnt, 1, "Duplicate conflicting appointment must NOT be inserted");

    // Zero messages in messages table
    const msgCount = await db.prepare("SELECT COUNT(*) as cnt FROM messages").first<{ cnt: number }>();
    assert.equal(msgCount?.cnt, 0);
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-17: Adversarial Inactive User: Inactive user (users.active = 0) blocked immediately without quota deduction", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Usuário Inativo",
      adminName: "Dr. Inativo",
      email: "inativo@clinica.com",
      password: "senhaSegura123",
      phone: "11955550003",
    });

    // Deactivate user in database
    await db.prepare("UPDATE users SET active = 0 WHERE tenant_id = ?1").bind(tenantId).run();

    const res = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem com usuário inativo" }),
      }),
      env
    );
    assert.equal(res.status, 403, "Inactive user must be blocked with HTTP 403");

    assert.equal(mockClaude.calls.length, 0, "Claude must not be called");
    const tenant = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(tenantId)
      .first<{ trial_messages_used: number }>();
    assert.equal(tenant?.trial_messages_used, 0, "Quota must remain 0");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-18: Adversarial Inactive Tenant: Inactive tenant (tenants.active = 0) blocked immediately without quota deduction", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Tenant Inativo",
      adminName: "Dr. TenantInativo",
      email: "tenantinativo@clinica.com",
      password: "senhaSegura123",
      phone: "11955550004",
    });

    // Deactivate tenant in database
    await db.prepare("UPDATE tenants SET active = 0 WHERE id = ?1").bind(tenantId).run();

    const res = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Mensagem com tenant inativo" }),
      }),
      env
    );
    assert.equal(res.status, 403, "Inactive tenant must be blocked with HTTP 403");

    assert.equal(mockClaude.calls.length, 0, "Claude must not be called");
    const tenant = await db
      .prepare("SELECT trial_messages_used FROM tenants WHERE id = ?1")
      .bind(tenantId)
      .first<{ trial_messages_used: number }>();
    assert.equal(tenant?.trial_messages_used, 0, "Quota must remain 0");
  } finally {
    mockClaude.restore();
  }
});

test("CHALLENGER-3.2-19: Unconfigured WhatsApp credentials: clinic operates 100% in simulator without Meta token", async () => {
  const { db, env } = createChallengerEnv();
  const mockClaude = new ChallengerMockClaude();
  mockClaude.install();

  try {
    const { cookie, tenantId } = await registerClinic(env, {
      clinicName: "Clínica Sem WhatsApp",
      adminName: "Dr. Sem Zap",
      email: "semzap@clinica.com",
      password: "senhaSegura123",
      phone: "11955550005",
    });

    // Verify tenant has unconfigured phone_number_id and null token
    const tenant = await db
      .prepare("SELECT phone_number_id, access_token_enc FROM tenants WHERE id = ?1")
      .bind(tenantId)
      .first<Tenant>();
    assert.ok(tenant?.phone_number_id.startsWith("unconfigured:"));
    assert.equal(tenant?.access_token_enc, null);

    // Call simulator
    const res = await worker.fetch(
      new Request("https://aura.test/api/simulator/chat", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ message: "Test drive inicial da clínica recém-criada" }),
      }),
      env
    );
    assert.equal(res.status, 200, "Simulator must work smoothly without any Meta config");
    const data = (await res.json()) as any;
    assert.ok(data.reply);
    assert.equal(data.trial.trial_messages_used, 1);
  } finally {
    mockClaude.restore();
  }
});
