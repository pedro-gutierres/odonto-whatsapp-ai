import assert from "node:assert/strict";
import test from "node:test";
import { askClaude, ClaudeRequestError } from "../src/claude";
import { buildSystemPromptParts } from "../src/prompt";
import { askPatientSimulation, askSupportAssistant, redactSupportText } from "../src/support-ai";
import type { Env, Tenant } from "../src/types";

const tenant: Tenant = {
  id: "tenant-private", name: "Clínica Fictícia", phone_number_id: "100000000000001",
  waba_id: "private-waba-id", access_token_enc: "private-encrypted-token", active: 1,
  paddle_customer_id: "private-paddle-id", responsible_name: "Dado Pessoal",
  bot_config: JSON.stringify({
    clinic_name: "Clínica Fictícia", hours: "Terça a sexta", initial_consultation: { duration: "45 min", price: "R$ 100" },
    tone: "acolhedor", procedure_items: [{ name: "Avaliação", checked: true, duration: "45 min" }],
    internal_token: "out-of-scope",
  }),
};

const env = {
  ANTHROPIC_API_KEY: "whatsapp-test-key",
  ANTHROPIC_SUPPORT_API_KEY: "support-test-key",
  CLAUDE_MODEL: "claude-haiku-5-5",
  CLAUDE_EFFORT: "low",
  DB: { prepare: () => ({ bind: () => ({ first: async () => ({
    checked_at: '2026-11-13T12:00:00.000Z', checks_json: '{"waba_webhook":"warn","phone_number_id":"ok"}',
  }) }) }) },
} as unknown as Env;

type MockReply = Record<string, unknown> | Response;
function mockClaude(reply: (body: any, headers: Headers, callNumber: number) => MockReply) {
  let calls = 0;
  let mockError: unknown;
  const previous = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    try {
      assert.ok(init?.signal);
      const next = reply(JSON.parse(String(init?.body)), new Headers(init?.headers), ++calls);
      return next instanceof Response ? next : Response.json(next);
    } catch (error) {
      mockError = error;
      throw error;
    }
  }) as typeof fetch;
  return { restore: () => { globalThis.fetch = previous; if (mockError) throw mockError; }, calls: () => calls };
}

test("support and simulation fail closed without the dedicated support key", async () => {
  const noKey = { ...env, ANTHROPIC_SUPPORT_API_KEY: undefined };
  const history = [{ role: "user" as const, content: "Olá" }];
  const notConfigured = (error: Error) => error instanceof ClaudeRequestError && error.code === "CLAUDE_SUPPORT_NOT_CONFIGURED";
  await assert.rejects(askSupportAssistant(noKey, history), notConfigured);
  await assert.rejects(askPatientSimulation(noKey, tenant, history), notConfigured);
});

test("simulation reuses saved contact behavior without real booking tags or tools", async () => {
  const network = mockClaude((body, headers) => {
    const prompt = body.system.map((block: any) => block.text).join("\n");
    assert.equal(headers.get("x-api-key"), "support-test-key");
    assert.equal(body.model, "claude-haiku-5-5");
    assert.equal(body.tools, undefined);
    assert.match(prompt, /Terça a sexta/);
    assert.match(prompt, /45 min/);
    assert.match(prompt, /paciente fictício/);
    assert.doesNotMatch(prompt, /<<<AGENDAR|GRADE DE HORÁRIOS ATUALIZADA|out-of-scope/);
    return { stop_reason: "end_turn", content: [{ type: "text", text: "Este horário é um exemplo. <<<AGENDAR: {}>>> " }] };
  });
  try {
    assert.equal(await askPatientSimulation(env, tenant, [{ role: "user", content: "Quero agendar" }]),
      "Este horário é um exemplo.");
  } finally { network.restore(); }
});

test("prompt asks for natural, simple WhatsApp language without deliberate spelling errors", () => {
  const prompt = buildSystemPromptParts(JSON.parse(tenant.bot_config), { simulation: true }).staticPrompt;
  assert.match(prompt, /português brasileiro simples, natural e correto/);
  assert.match(prompt, /Use maiúsculas normalmente/);
  assert.match(prompt, /Não tire acentos nem escreva palavras com erros de propósito/);
  assert.match(prompt, /Convide para agendar quando isso fizer sentido/);
  assert.match(prompt, /Seja persuasiva com clareza/);
  assert.match(prompt, /SEGURANÇA CLÍNICA E LIMITES/);
  assert.doesNotMatch(prompt, /referência em Odontologia e Estética Avançada no Brasil/);
});

test("real WhatsApp retains vision and booking protocol without patient procedure context", async () => {
  const config = JSON.parse(tenant.bot_config);
  const appointments = [{ scheduled_at: "2026-11-24 14:00", duration: "45 min", procedure: "PRIVATE PROCEDURE" }];
  const prompt = buildSystemPromptParts(config, { existingAppointments: appointments });
  const network = mockClaude((body, headers) => {
    assert.equal(headers.get("x-api-key"), "whatsapp-test-key");
    assert.equal(headers.get("anthropic-version"), "2023-06-01");
    assert.match(body.system[0].text, /<<<AGENDAR:/);
    assert.match(body.system[1].text, /2026-11-24 14:00/);
    assert.doesNotMatch(body.system[1].text, /PRIVATE PROCEDURE/);
    assert.equal(body.messages.at(-1).content[0].source.media_type, "image/jpeg");
    return { content: [{ type: "text", text: "Recebido." }] };
  });
  try {
    assert.equal(await askClaude(env, prompt, [{ role: "user", content: "Foto" }], { mimeType: "image/jpg", base64Data: "AA==" }), "Recebido.");
  } finally { network.restore(); }
});

test("support redacts common pasted identifiers before storing or sending text", () => {
  const input = "Minha senha é segredo\nToken: sk-ant-fakeKeyABCDEFG\nNome da paciente: Pessoa Fictícia\nE-mail: exemplo@example.invalid\nTelefone: +55 (11) 99999-9999\nCPF 999.999.999-99";
  const clean = redactSupportText(input);
  for (const raw of ["segredo", "sk-ant-", "Pessoa Fictícia", "exemplo@", "99999-9999", "999.999.999-99"]) assert.ok(!clean.includes(raw));
  assert.equal(redactSupportText(clean), clean);
  assert.equal(redactSupportText("Onde posso trocar a senha?"), "Onde posso trocar a senha?");
});

test("support answers without tools or clinic data", async () => {
  const network = mockClaude((body, headers) => {
    assert.equal(headers.get("x-api-key"), "support-test-key");
    assert.equal(body.tools, undefined);
    assert.doesNotMatch(JSON.stringify(body), /tenant-private|out-of-scope|fake-secret-123/);
    return { content: [{ type: "text", text: "Abra Agenda." }], stop_reason: "end_turn" };
  });
  try {
    assert.equal(await askSupportAssistant(env, [{ role: "user", content: "Onde vejo a agenda? token: fake-secret-123" }]), "Abra Agenda.");
    assert.equal(network.calls(), 1);
  } finally { network.restore(); }
});
