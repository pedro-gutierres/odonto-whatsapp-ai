// Ponto de entrada. Um único Worker com duas "portas":
//   fetch -> recebe o webhook da Meta (rápido: valida, enfileira, responde 200)
//   queue -> processa cada mensagem (busca clínica, chama Claude, responde no WhatsApp)
import type { BotConfig, Env, InboundJob } from "./types";
import { extractJobs, sendText, verifySignature } from "./whatsapp";
import { askClaude } from "./claude";
import { buildSystemPrompt } from "./prompt";
import { claimInbound, getTenantByPhoneNumberId, loadHistory, markAnswered, saveOutbound } from "./db";

const MSG_SO_TEXTO = "Por enquanto consigo ler apenas mensagens de texto. Pode escrever sua dúvida? 😊";
const MSG_FALHA_IA = "Vou encaminhar sua mensagem para a nossa equipe, que responde assim que possível. Obrigada pela paciência!";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") return new Response("ok");

    // Rota de simulação para testar o fluxo de ponta a ponta sem depender do bloqueio dos EUA da Meta
    if (url.pathname === "/simulate") {
      const q = url.searchParams.get("q") ?? "Olá! Gostaria de saber os procedimentos que vocês fazem e o horário de atendimento.";
      const job: InboundJob = {
        phoneNumberId: "1459702903890342",
        from: "5521973401655",
        contactName: "Pedro (Paciente Teste)",
        waMessageId: "sim_" + Date.now(),
        type: "text",
        text: q,
      };
      await env.INBOX.send(job);
      return new Response(
        JSON.stringify(
          {
            status: "Mensagem do paciente recebida e enfileirada!",
            paciente: "Pedro (Paciente Teste)",
            pergunta: q,
            dica: "Acesse /history em 2 segundos para ver a resposta que o Claude gerou e gravou no banco D1.",
          },
          null,
          2,
        ),
        { headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    // Rota para visualizar o histórico de conversas gravadas no banco D1
    if (url.pathname === "/history") {
      const { results } = await env.DB.prepare(
        "SELECT id, tenant_id, contact_name, direction, body, status, created_at FROM messages ORDER BY id DESC LIMIT 20",
      ).all();
      return new Response(JSON.stringify(results, null, 2), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (url.pathname !== "/webhook") return new Response("not found", { status: 404 });

    // 1) Verificação inicial: a Meta pergunta "esse endereço é seu?" e espera o desafio de volta.
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token && token === env.WA_VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
      }
      return new Response("forbidden", { status: 403 });
    }

    // 2) Mensagens de verdade.
    if (request.method === "POST") {
      const raw = await request.arrayBuffer();

      const ok = await verifySignature(raw, request.headers.get("x-hub-signature-256"), env.META_APP_SECRETS);
      if (!ok) return new Response("invalid signature", { status: 401 });

      let payload: unknown;
      try {
        payload = JSON.parse(new TextDecoder().decode(raw));
      } catch {
        return new Response("bad json", { status: 400 });
      }

      const jobs = extractJobs(payload);
      if (jobs.length) {
        // Se falhar aqui, devolvemos erro e a Meta tenta entregar de novo.
        await env.INBOX.sendBatch(jobs.map((body) => ({ body })));
      }
      return new Response("ok", { status: 200 });
    }

    return new Response("method not allowed", { status: 405 });
  },

  async queue(batch: MessageBatch<InboundJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await processJob(msg.body, env);
        msg.ack();
      } catch (err) {
        console.error("falha ao processar mensagem", msg.body.waMessageId, String(err));
        msg.retry({ delaySeconds: Math.min(30 * msg.attempts, 300) });
      }
    }
  },
} satisfies ExportedHandler<Env, InboundJob>;

async function processJob(job: InboundJob, env: Env): Promise<void> {
  // Quem é a clínica dona deste número?
  const tenant = await getTenantByPhoneNumberId(env.DB, job.phoneNumberId);
  if (!tenant || !tenant.active) {
    console.warn("número sem clínica ativa:", job.phoneNumberId);
    return;
  }

  const state = await claimInbound(env.DB, tenant.id, job);
  if (state === "done") return;

  // Fase laboratório: um token só. Na fase Tech Provider, cada clínica terá o seu (tenant.access_token_enc).
  const token = env.WA_LAB_TOKEN;
  if (!token) throw new Error("WA_LAB_TOKEN não configurado");

  let reply: string;
  if (!job.text) {
    reply = MSG_SO_TEXTO;
  } else {
    const cfg = JSON.parse(tenant.bot_config) as BotConfig;
    const history = await loadHistory(env.DB, tenant.id, job.from);
    reply = (await askClaude(env, buildSystemPrompt(cfg), history)) ?? MSG_FALHA_IA;
  }

  reply = reply.slice(0, 4000); // limite do WhatsApp é 4096 caracteres

  let sentId: string | null = null;
  try {
    sentId = await sendText(env, job.phoneNumberId, token, job.from, reply);
  } catch (err) {
    console.warn("Aviso: WhatsApp não entregou (ex: restrição geográfica de número de teste da Meta):", String(err));
  }

  await saveOutbound(env.DB, tenant.id, job.from, reply, sentId);
  await markAnswered(env.DB, job.waMessageId);
}
