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

    // Interface visual de chat (estilo WhatsApp) na raiz do site
    if (url.pathname === "/" || url.pathname === "/chat") {
      return new Response(CHAT_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    // Botão para limpar o histórico do teste
    if (url.pathname === "/clear") {
      await env.DB.prepare("DELETE FROM messages WHERE tenant_id = 'lab'").run();
      return new Response(JSON.stringify({ status: "Histórico limpo com sucesso!" }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

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

const CHAT_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simulador WhatsApp - Clínica Odontológica</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: #d1d7db; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 10px; }
    .chat-app { width: 100%; max-width: 500px; height: 92vh; background: #efeae2; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    .header { background: #008069; color: white; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
    .header-info { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 42px; height: 42px; background: #e9edef; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .title { font-size: 16px; font-weight: 600; }
    .subtitle { font-size: 12px; opacity: 0.85; }
    .btn-clear { background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
    .btn-clear:hover { background: rgba(255,255,255,0.3); }
    .messages-container { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; background-image: radial-gradient(#d3cbbe 1px, transparent 1px); background-size: 20px 20px; }
    .bubble { max-width: 80%; padding: 8px 12px; border-radius: 8px; font-size: 14.2px; line-height: 1.4; word-wrap: break-word; position: relative; box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); white-space: pre-wrap; }
    .bubble.in { background: #d9fdd3; align-self: flex-end; border-top-right-radius: 0; }
    .bubble.out { background: #ffffff; align-self: flex-start; border-top-left-radius: 0; }
    .bubble .time { font-size: 10px; color: #667781; text-align: right; margin-top: 4px; }
    .bubble.typing { font-style: italic; color: #667781; }
    .footer { background: #f0f2f5; padding: 10px 12px; display: flex; gap: 8px; align-items: center; }
    .footer input { flex: 1; padding: 11px 16px; border: 1px solid #e9edef; border-radius: 20px; font-size: 14.5px; outline: none; background: #ffffff; }
    .footer input:focus { border-color: #008069; }
    .footer button { background: #008069; color: white; border: none; border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; transition: transform 0.1s; flex-shrink: 0; }
    .footer button:hover { background: #006a57; }
    .footer button:active { transform: scale(0.95); }
  </style>
</head>
<body>
  <div class="chat-app">
    <div class="header">
      <div class="header-info">
        <div class="avatar">🦷</div>
        <div>
          <div class="title">Clínica Sorriso Teste</div>
          <div class="subtitle">Atendente Virtual IA (Claude) • 24h</div>
        </div>
      </div>
      <button class="btn-clear" onclick="clearHistory()">Limpar chat</button>
    </div>
    <div class="messages-container" id="chat"></div>
    <form class="footer" onsubmit="sendMessage(event)">
      <input type="text" id="userInput" placeholder="Escreva como paciente e aperte Enter..." autocomplete="off" />
      <button type="submit" id="sendBtn">➤</button>
    </form>
  </div>

  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('userInput');
    let lastIds = new Set();

    async function loadHistory() {
      try {
        const res = await fetch('/history');
        const data = await res.json();
        // Ordena por id crescente para mostrar as mais antigas no topo
        data.sort((a, b) => a.id - b.id);
        
        chat.innerHTML = '';
        data.forEach(m => {
          const div = document.createElement('div');
          div.className = 'bubble ' + m.direction;
          div.innerText = m.body;
          const time = document.createElement('div');
          time.className = 'time';
          time.innerText = new Date(m.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          div.appendChild(time);
          chat.appendChild(div);
        });
        chat.scrollTop = chat.scrollHeight;
      } catch (err) {
        console.error(err);
      }
    }

    async function sendMessage(e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      // Mostra mensagem do paciente na hora
      const userBubble = document.createElement('div');
      userBubble.className = 'bubble in';
      userBubble.innerText = text;
      chat.appendChild(userBubble);

      // Mostra aviso digitando
      const typing = document.createElement('div');
      typing.className = 'bubble out typing';
      typing.id = 'typingBubble';
      typing.innerText = 'Digitando...';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;

      // Dispara simulação
      await fetch('/simulate?q=' + encodeURIComponent(text));

      // Fica checando o histórico a cada 1.5s até o Claude responder
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        await loadHistory();
        if (!document.getElementById('typingBubble') || attempts > 8) {
          clearInterval(interval);
        }
      }, 1500);
    }

    async function clearHistory() {
      if (confirm('Deseja apagar o histórico de conversa de teste?')) {
        await fetch('/clear');
        loadHistory();
      }
    }

    loadHistory();
  </script>
</body>
</html>`;
