// Ponto de entrada do Cloudflare Worker.
// Portas de entrada:
//   fetch -> Webhook da Meta, Simulador do Paciente (/), Painel da Recepcionista (/inbox) e APIs REST
//   queue -> Processa cada mensagem (busca clínica, checa se IA está pausada, chama Claude, responde no WhatsApp)
import type { BotConfig, Env, InboundJob } from "./types";
import { extractJobs, sendText, verifySignature } from "./whatsapp";
import { askClaude } from "./claude";
import { buildSystemPrompt } from "./prompt";
import {
  claimInbound,
  getTenantByPhoneNumberId,
  loadHistory,
  markAnswered,
  saveOutbound,
  isAiPaused,
  setAiPaused,
  listConversations,
  getConversationMessages,
  saveHumanOutbound,
  clearConversation,
} from "./db";

const MSG_SO_TEXTO = "Por enquanto consigo ler apenas mensagens de texto. Pode escrever sua dúvida? 😊";
const MSG_FALHA_IA = "Vou encaminhar sua mensagem para a nossa equipe, que responde assim que possível. Obrigada pela paciência!";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") return new Response("ok");

    // 1) PAINEL DA RECEPCIONISTA (Multi-Chat estilo WhatsApp Web em tempo real)
    if (url.pathname === "/inbox" || url.pathname === "/painel") {
      return new Response(INBOX_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    // 2) SIMULADOR DO PACIENTE NO CELULAR (Para testar o fluxo de ponta a ponta)
    if (url.pathname === "/" || url.pathname === "/chat") {
      return new Response(PATIENT_CHAT_HTML, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    // APIs REST PARA O PAINEL DA RECEPCIONISTA
    if (url.pathname === "/api/conversations") {
      const tenantId = url.searchParams.get("tenant") ?? "lab";
      const conversations = await listConversations(env.DB, tenantId);
      return new Response(JSON.stringify({ conversations }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/messages") {
      const tenantId = url.searchParams.get("tenant") ?? "lab";
      const phone = url.searchParams.get("phone");
      if (!phone) {
        return new Response(JSON.stringify({ error: "phone obrigatório" }), { status: 400 });
      }
      const messages = await getConversationMessages(env.DB, tenantId, phone);
      const aiPaused = await isAiPaused(env.DB, tenantId, phone);
      return new Response(JSON.stringify({ messages, ai_paused: aiPaused }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // Envio manual de resposta da recepcionista
    if (url.pathname === "/api/send" && request.method === "POST") {
      try {
        const body = (await request.json()) as { phone: string; text: string; tenant?: string };
        const tenantId = body.tenant ?? "lab";
        if (!body.phone || !body.text) {
          return new Response(JSON.stringify({ error: "phone e text são obrigatórios" }), { status: 400 });
        }

        // Grava no banco com status 'human' para diferenciar visualmente na tela
        await saveHumanOutbound(env.DB, tenantId, body.phone, body.text);

        // Se houver token configurado, tenta entregar de verdade no WhatsApp do paciente
        const token = env.WA_LAB_TOKEN;
        if (token) {
          try {
            await sendText(env, "1459702903890342", token, body.phone, body.text);
          } catch (e) {
            console.warn("Aviso ao enviar manual no WhatsApp:", String(e));
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    // Ligar / Desligar IA para um paciente específico (Human Takeover)
    if (url.pathname === "/api/toggle-ai" && request.method === "POST") {
      try {
        const body = (await request.json()) as { phone: string; paused: boolean; tenant?: string };
        const tenantId = body.tenant ?? "lab";
        if (!body.phone) {
          return new Response(JSON.stringify({ error: "phone obrigatório" }), { status: 400 });
        }
        await setAiPaused(env.DB, tenantId, body.phone, !!body.paused);
        return new Response(JSON.stringify({ success: true, ai_paused: !!body.paused }), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    // Simular mensagem vinda de qualquer paciente
    if (url.pathname === "/api/simulate-patient" && request.method === "POST") {
      try {
        const body = (await request.json()) as { phone?: string; name?: string; text: string };
        if (!body.text) {
          return new Response(JSON.stringify({ error: "text obrigatório" }), { status: 400 });
        }
        const phone = body.phone || "5521973401655";
        const name = body.name || "Pedro (Paciente Teste)";
        const job: InboundJob = {
          phoneNumberId: "1459702903890342",
          from: phone,
          contactName: name,
          waMessageId: "sim_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          type: "text",
          text: body.text,
        };
        await env.INBOX.send(job);
        return new Response(JSON.stringify({ status: "queued", phone, text: body.text }), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    // Limpar conversa específica
    if (url.pathname === "/api/clear-chat" && request.method === "POST") {
      const body = (await request.json()) as { phone: string; tenant?: string };
      const tenantId = body.tenant ?? "lab";
      if (body.phone) {
        await clearConversation(env.DB, tenantId, body.phone);
      }
      return new Response(JSON.stringify({ status: "cleared" }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // Botão para limpar todo o histórico do laboratório
    if (url.pathname === "/clear") {
      await env.DB.prepare("DELETE FROM messages WHERE tenant_id = 'lab'").run();
      return new Response(JSON.stringify({ status: "Histórico limpo com sucesso!" }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // Rota legada de simulação rápida por URL
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

    // Rota para visualizar o histórico raw em JSON
    if (url.pathname === "/history") {
      const { results } = await env.DB.prepare(
        "SELECT id, tenant_id, contact_name, direction, body, status, created_at FROM messages ORDER BY id DESC LIMIT 20",
      ).all();
      return new Response(JSON.stringify(results, null, 2), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (url.pathname !== "/webhook") return new Response("not found", { status: 404 });

    // 1) Verificação inicial da Meta
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token && token === env.WA_VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
      }
      return new Response("forbidden", { status: 403 });
    }

    // 2) Mensagens oficiais recebidas da Meta
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
  const tenant = await getTenantByPhoneNumberId(env.DB, job.phoneNumberId);
  if (!tenant || !tenant.active) {
    console.warn("número sem clínica ativa:", job.phoneNumberId);
    return;
  }

  const state = await claimInbound(env.DB, tenant.id, job);
  if (state === "done") return;

  // VERIFICAÇÃO DE INTERVENÇÃO HUMANA:
  // Se a recepcionista pausou a IA para este paciente, gravamos a mensagem dele no histórico,
  // mas NÃO chamamos o Claude nem disparamos resposta automática.
  const paused = await isAiPaused(env.DB, tenant.id, job.from);
  if (paused) {
    console.log(`[HUMAN_TAKEOVER] IA pausada para o contato ${job.from}. Mensagem recebida sem resposta automática.`);
    await markAnswered(env.DB, job.waMessageId);
    return;
  }

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

  reply = reply.slice(0, 4000);

  let sentId: string | null = null;
  try {
    sentId = await sendText(env, job.phoneNumberId, token, job.from, reply);
  } catch (err) {
    console.warn("Aviso: WhatsApp não entregou (ex: restrição geográfica de número de teste da Meta):", String(err));
  }

  await saveOutbound(env.DB, tenant.id, job.from, reply, sentId);
  await markAnswered(env.DB, job.waMessageId);
}

// -----------------------------------------------------------------------------
// INTERFACE 1: PAINEL DA RECEPCIONISTA (WhatsApp Web Profissional 3 Colunas)
// -----------------------------------------------------------------------------
const INBOX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Central de Atendimento • Clínica Sorriso</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .wa-bg {
      background-color: #efeae2;
      background-image: radial-gradient(#d4cdc4 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>
</head>
<body class="bg-slate-100 h-screen flex flex-col overflow-hidden text-slate-800">

  <!-- BARRA SUPERIOR -->
  <header class="bg-[#008069] text-white px-5 py-2.5 flex items-center justify-between shadow-md shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">🦷</div>
      <div>
        <h1 class="text-sm font-semibold tracking-wide">Clínica Sorriso Teste</h1>
        <p class="text-xs text-white/80 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
          Central de Atendimento 24h • Recepção Web
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <a href="/" target="_blank" class="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition">
        <i class="fa-solid fa-mobile-screen"></i>
        <span>Simulador Paciente</span>
      </a>
      <button onclick="openNewPatientModal()" class="text-xs bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition shadow-sm">
        <i class="fa-solid fa-user-plus"></i>
        <span>+ Simular Novo Paciente</span>
      </button>
      <button onclick="refreshAll()" title="Atualizar agora" class="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs transition">
        <i class="fa-solid fa-rotate" id="refreshIcon"></i>
      </button>
    </div>
  </header>

  <!-- ÁREA PRINCIPAL (3 COLUNAS) -->
  <main class="flex-1 flex overflow-hidden">

    <!-- COLUNA 1: LISTA DE CONVERSAS (ESQUERDA) -->
    <section class="w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <!-- Busca e Filtros -->
      <div class="p-3 border-b border-slate-100 bg-slate-50/50">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
          <input type="text" id="searchInput" oninput="filterChats()" placeholder="Pesquisar conversa ou telefone..." 
            class="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008069] transition">
        </div>
        <div class="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-500 font-medium">
          <span id="chatCount">0 conversas</span>
          <span class="text-emerald-700 font-semibold flex items-center gap-1">
            <i class="fa-solid fa-robot"></i> IA Ativa 24h
          </span>
        </div>
      </div>

      <!-- Lista de Chats -->
      <div id="chatList" class="flex-1 overflow-y-auto custom-scroll divide-y divide-slate-100">
        <div class="p-6 text-center text-slate-400 text-xs">Carregando conversas...</div>
      </div>
    </section>

    <!-- COLUNA 2: JANELA DO CHAT ATIVO (CENTRO) -->
    <section class="flex-1 flex flex-col bg-white overflow-hidden">
      
      <!-- Cabeçalho do Chat Selecionado -->
      <div id="chatHeader" class="h-14 border-b border-slate-200 px-5 flex items-center justify-between bg-slate-50 shrink-0 hidden">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm" id="activeAvatar">P</div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-semibold text-slate-900" id="activeName">Paciente</h2>
              <span id="activeAiBadge" class="text-[10px] px-2 py-0.5 rounded-full font-medium"></span>
            </div>
            <p class="text-xs text-slate-500" id="activePhone">552199999999</p>
          </div>
        </div>

        <!-- Botão de Intervenção Humana (Human Takeover) -->
        <div class="flex items-center gap-2">
          <button id="toggleAiBtn" onclick="toggleActiveAi()" class="text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm">
            <!-- Preenchido via JS -->
          </button>
        </div>
      </div>

      <!-- Área das Mensagens (Scroll) -->
      <div id="messagesArea" class="flex-1 overflow-y-auto p-4 space-y-3 wa-bg custom-scroll">
        <div class="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
          <div class="w-14 h-14 rounded-full bg-white/70 shadow-sm flex items-center justify-center text-2xl mb-2 text-slate-400">💬</div>
          <p class="font-medium text-slate-600 text-sm">Nenhuma conversa selecionada</p>
          <p class="text-slate-400 mt-1">Selecione uma conversa à esquerda para visualizar e intervir.</p>
        </div>
      </div>

      <!-- Barra de Envio da Recepcionista -->
      <div id="chatFooter" class="p-3 bg-slate-50 border-t border-slate-200 shrink-0 hidden">
        <form onsubmit="handleSendHuman(event)" class="flex items-center gap-2">
          <input type="text" id="humanInput" placeholder="Digite uma resposta manual como recepcionista (Enter para enviar)..." 
            class="flex-1 px-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#008069] transition" autocomplete="off" />
          <button type="submit" class="bg-[#008069] hover:bg-[#006a57] text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm">
            <i class="fa-solid fa-paper-plane"></i>
            <span>Enviar</span>
          </button>
        </form>
        <div class="mt-1.5 px-1 text-[11px] text-slate-400">
          <span>Dica: Ao enviar mensagem manual, o paciente recebe como atendente humano.</span>
        </div>
      </div>

    </section>

    <!-- COLUNA 3: DADOS DO PACIENTE & AÇÕES RÁPIDAS (DIREITA) -->
    <section id="patientSidebar" class="w-72 lg:w-80 bg-slate-50 border-l border-slate-200 p-4 flex flex-col shrink-0 hidden">
      <div class="text-center pb-4 border-b border-slate-200">
        <div class="w-16 h-16 rounded-full bg-[#008069]/10 text-[#008069] font-bold text-xl flex items-center justify-center mx-auto mb-2" id="sideAvatar">P</div>
        <h3 class="text-sm font-bold text-slate-800" id="sideName">Nome</h3>
        <p class="text-xs text-slate-500" id="sidePhone">Telefone</p>
      </div>

      <!-- Mini CRM & Status -->
      <div class="py-4 space-y-3 flex-1 overflow-y-auto text-xs">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status do Atendimento</label>
          <div class="mt-1 p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span id="sideAiStatusIcon"><i class="fa-solid fa-robot text-emerald-600"></i></span>
              <span class="font-medium text-slate-700" id="sideAiStatusText">IA Ativa</span>
            </div>
            <button onclick="toggleActiveAi()" class="text-[11px] text-[#008069] hover:underline font-semibold" id="sideToggleLink">Pausar</button>
          </div>
        </div>

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Procedimento de Interesse</label>
          <div class="mt-1 p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium" id="sideInterest">
            Avaliação Inicial / Botox
          </div>
        </div>

        <!-- SIMULADOR RÁPIDO DO PACIENTE -->
        <div class="pt-2 border-t border-slate-200">
          <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 mb-1">
            <i class="fa-solid fa-vial"></i> Testar como este Paciente
          </label>
          <p class="text-[11px] text-slate-400 mb-2">Simule uma nova pergunta vinda deste número para ver a IA respondendo:</p>
          <form onsubmit="handleSimulateForCurrent(event)" class="space-y-2">
            <input type="text" id="simQuestionInput" placeholder="Ex: Qual o preço do clareamento?" 
              class="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#008069]" required />
            <button type="submit" class="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[11px] font-medium transition flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-play text-[10px]"></i>
              <span>Simular Envio do Paciente</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Botão de Apagar Conversa -->
      <div class="pt-3 border-t border-slate-200">
        <button onclick="handleClearCurrentChat()" class="w-full py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium transition border border-rose-200 flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-trash-can"></i>
          <span>Limpar Histórico Deste Chat</span>
        </button>
      </div>
    </section>

  </main>

  <!-- MODAL: SIMULAR NOVO PACIENTE -->
  <div id="newPatientModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 hidden">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5 border border-slate-100">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-user-plus text-[#008069]"></i>
          <span>Simular Novo Paciente no WhatsApp</span>
        </h3>
        <button onclick="closeNewPatientModal()" class="text-slate-400 hover:text-slate-600 text-sm">✕</button>
      </div>

      <form onsubmit="handleCreateNewPatient(event)" class="space-y-3 text-xs">
        <div>
          <label class="block font-medium text-slate-700 mb-1">Nome do Paciente</label>
          <input type="text" id="newPatientName" placeholder="Ex: Mariana Silveira (Harmonização)" required
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#008069]" />
        </div>
        <div>
          <label class="block font-medium text-slate-700 mb-1">Telefone WhatsApp</label>
          <input type="text" id="newPatientPhone" placeholder="Ex: 5521988887777" required
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#008069]" />
        </div>
        <div>
          <label class="block font-medium text-slate-700 mb-1">Primeira Mensagem do Paciente</label>
          <textarea id="newPatientText" rows="2" placeholder="Ex: Olá! Gostaria de saber os horários para botox nesta sexta-feira." required
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#008069]"></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onclick="closeNewPatientModal()" class="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold">Iniciar Conversa</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let conversations = [];
    let activePhone = null;
    let activeAiPaused = false;
    let isPollingBusy = false;
    const messageCache = {};

    // Inicialização
    async function init() {
      await loadConversations(false);

      // Polling a cada 3s para sincronizar novas mensagens sem conflito
      setInterval(async () => {
        if (isPollingBusy) return;
        isPollingBusy = true;
        try {
          await loadConversations(true);
          if (activePhone) {
            await loadMessages(activePhone, true);
          }
        } catch (err) {
          console.error("Erro no polling:", err);
        } finally {
          isPollingBusy = false;
        }
      }, 3000);
    }

    async function fetchMessages(phone) {
      try {
        const res = await fetch('/api/messages?phone=' + encodeURIComponent(phone));
        const data = await res.json();
        if (data && data.messages) {
          messageCache[String(phone)] = data.messages;
        }
        return data || { messages: [], ai_paused: false };
      } catch (err) {
        console.error("Erro ao buscar mensagens de " + phone, err);
        return { messages: messageCache[String(phone)] || [], ai_paused: false };
      }
    }

    async function loadConversations(isBackground = false) {
      try {
        const res = await fetch('/api/conversations');
        const data = await res.json();
        conversations = data.conversations || [];
        renderConversationList();

        // Se nenhum chat ativo foi selecionado ainda, abre o primeiro
        if (!activePhone && conversations.length > 0 && !isBackground) {
          await selectChat(conversations[0].contact_wa_id);
        }

        // PRE-CACHE AUTOMÁTICO EM SEGUNDO PLANO:
        // Ao carregar a tela, pré-carrega as mensagens dos outros contatos em segundo plano
        // para que a troca entre chats seja 100% instantânea (0ms)!
        if (!isBackground && conversations.length > 0) {
          for (const c of conversations) {
            const p = String(c.contact_wa_id);
            if (!messageCache[p]) {
              fetchMessages(p).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar conversas:", err);
      }
    }

    function renderConversationList() {
      const container = document.getElementById('chatList');
      const countEl = document.getElementById('chatCount');
      const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();

      const filtered = conversations.filter(c => 
        (c.contact_name && c.contact_name.toLowerCase().includes(search)) ||
        String(c.contact_wa_id).includes(search) ||
        (c.last_body && c.last_body.toLowerCase().includes(search))
      );

      countEl.innerText = \`\${filtered.length} conversa\${filtered.length === 1 ? '' : 's'}\`;

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="p-8 text-center text-slate-400 text-xs">
            <i class="fa-regular fa-comment-dots text-2xl mb-2 text-slate-300"></i>
            <p>Nenhuma conversa encontrada</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(c => {
        const isSelected = String(c.contact_wa_id) === String(activePhone);
        const name = c.contact_name || c.contact_wa_id;
        const initial = name.charAt(0).toUpperCase();
        const time = formatTime(c.last_created_at);
        const isPaused = c.ai_paused === 1;

        return \`
          <div onclick="selectChat('\${c.contact_wa_id}')" 
            class="p-3.5 flex items-start gap-3 cursor-pointer transition hover:bg-slate-50 \${isSelected ? 'bg-slate-100 border-l-4 border-[#008069]' : ''}">
            <div class="w-10 h-10 rounded-full \${isSelected ? 'bg-[#008069] text-white' : 'bg-slate-200 text-slate-600'} font-bold flex items-center justify-center shrink-0 text-sm">
              \${initial}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <h4 class="text-xs font-semibold text-slate-900 truncate">\${escapeHtml(name)}</h4>
                <span class="text-[10px] text-slate-400 shrink-0 ml-1">\${time}</span>
              </div>
              <p class="text-[11px] text-slate-500 truncate mb-1">
                \${c.last_direction === 'out' ? '<span class="text-slate-400 font-medium">Você: </span>' : ''}\${escapeHtml(c.last_body || '')}
              </p>
              <div class="flex items-center gap-1.5">
                \${isPaused 
                  ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold flex items-center gap-1"><i class="fa-solid fa-pause text-[8px]"></i> IA Pausada</span>'
                  : '<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1"><i class="fa-solid fa-robot text-[8px]"></i> IA Ativa</span>'
                }
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function selectChat(phone) {
      if (!phone) return;
      const p = String(phone);
      activePhone = p;

      renderConversationList();

      document.getElementById('chatHeader').classList.remove('hidden');
      document.getElementById('chatFooter').classList.remove('hidden');
      document.getElementById('patientSidebar').classList.remove('hidden');

      const conv = conversations.find(c => String(c.contact_wa_id) === p);
      const name = conv ? (conv.contact_name || conv.contact_wa_id) : p;

      document.getElementById('activeName').innerText = name;
      document.getElementById('activePhone').innerText = p;
      document.getElementById('activeAvatar').innerText = name.charAt(0).toUpperCase();

      document.getElementById('sideName').innerText = name;
      document.getElementById('sidePhone').innerText = p;
      document.getElementById('sideAvatar').innerText = name.charAt(0).toUpperCase();

      // 1. TRANSIÇÃO INSTANTÂNEA: Se já temos mensagens no cache, renderiza NA MESMA HORA (0ms)
      if (messageCache[p] && messageCache[p].length > 0) {
        renderMessagesToContainer(messageCache[p]);
        detectInterest(messageCache[p]);
      } else {
        // Se ainda não estava no cache, exibe indicador sutil
        document.getElementById('messagesArea').innerHTML = \`
          <div class="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <i class="fa-solid fa-circle-notch fa-spin text-xl text-[#008069] mb-2"></i>
            <p class="font-medium text-slate-500">Carregando conversa...</p>
          </div>
        \`;
      }

      // 2. Busca mensagens mais atualizadas da API e atualiza a tela
      await loadMessages(p, false);
    }

    async function loadMessages(phone, isPolling = false) {
      if (!phone) return;
      const p = String(phone);
      const data = await fetchMessages(p);
      const msgs = data.messages || [];

      // Só atualiza a tela se o usuário ainda estiver com este chat aberto
      if (activePhone === p) {
        activeAiPaused = !!data.ai_paused;
        updateAiButtons(activeAiPaused);
        detectInterest(msgs);
        renderMessagesToContainer(msgs, isPolling);
      }
    }

    function renderMessagesToContainer(msgs, isPolling = false) {
      const container = document.getElementById('messagesArea');
      const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;

      if (!msgs || msgs.length === 0) {
        container.innerHTML = \`
          <div class="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <i class="fa-regular fa-comment-dots text-2xl mb-2 text-slate-300"></i>
            <p class="font-medium text-slate-600">Nenhuma mensagem neste chat ainda</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = msgs.map(m => renderBubble(m)).join('');

      if (!isPolling || wasAtBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }

    function renderBubble(m) {
      const isPatient = m.direction === 'in';
      const isHuman = m.direction === 'out' && m.status === 'human';
      const time = formatTime(m.created_at);

      if (isPatient) {
        return \`
          <div class="flex justify-start">
            <div class="max-w-[78%] bg-white rounded-lg rounded-tl-none p-3 shadow-sm border border-slate-100 text-xs">
              <p class="text-slate-800 whitespace-pre-wrap leading-relaxed">\${escapeHtml(m.body || '')}</p>
              <div class="text-[9px] text-slate-400 text-right mt-1">\${time}</div>
            </div>
          </div>
        \`;
      } else if (isHuman) {
        return \`
          <div class="flex justify-end">
            <div class="max-w-[78%] bg-sky-100 rounded-lg rounded-tr-none p-3 shadow-sm border border-sky-200 text-xs">
              <div class="text-[9px] text-sky-700 font-bold mb-1 flex items-center gap-1">
                <i class="fa-solid fa-user-tie"></i> Recepcionista (Atendimento Manual)
              </div>
              <p class="text-slate-800 whitespace-pre-wrap leading-relaxed">\${escapeHtml(m.body || '')}</p>
              <div class="text-[9px] text-sky-600/70 text-right mt-1">\${time}</div>
            </div>
          </div>
        \`;
      } else {
        return \`
          <div class="flex justify-end">
            <div class="max-w-[78%] bg-[#d9fdd3] rounded-lg rounded-tr-none p-3 shadow-sm text-xs border border-emerald-100">
              <div class="text-[9px] text-emerald-800 font-bold mb-1 flex items-center gap-1">
                <i class="fa-solid fa-robot"></i> Secretária IA (Claude 24h)
              </div>
              <p class="text-slate-800 whitespace-pre-wrap leading-relaxed">\${escapeHtml(m.body || '')}</p>
              <div class="text-[9px] text-emerald-700/70 text-right mt-1">\${time}</div>
            </div>
          </div>
        \`;
      }
    }

    function detectInterest(messages) {
      const allText = messages.map(m => (m.body || '').toLowerCase()).join(' ');
      let interest = 'Avaliação Geral';
      if (allText.includes('botox') || allText.includes('toxina')) interest = 'Botox / Toxina Botulínica';
      else if (allText.includes('clareamento')) interest = 'Clareamento Dental';
      else if (allText.includes('implante')) interest = 'Implantes Dentários';
      else if (allText.includes('aparelho') || allText.includes('ortodontia')) interest = 'Ortodontia / Aparelho';
      else if (allText.includes('harmoniz')) interest = 'Harmonização Facial';
      else if (allText.includes('sangramento') || allText.includes('dor') || allText.includes('urg')) interest = 'Urgência / Emergência';

      const el = document.getElementById('sideInterest');
      if (el) el.innerText = interest;
    }

    function updateAiButtons(paused) {
      const btn = document.getElementById('toggleAiBtn');
      const badge = document.getElementById('activeAiBadge');
      const sideIcon = document.getElementById('sideAiStatusIcon');
      const sideText = document.getElementById('sideAiStatusText');
      const sideToggle = document.getElementById('sideToggleLink');

      if (paused) {
        if (btn) {
          btn.className = "text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition";
          btn.innerHTML = '<i class="fa-solid fa-play"></i><span>Reativar IA neste Chat</span>';
        }
        if (badge) {
          badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold";
          badge.innerText = "⏸️ Atendimento Humano (IA Pausada)";
        }
        if (sideIcon) sideIcon.innerHTML = '<i class="fa-solid fa-user-check text-amber-600"></i>';
        if (sideText) sideText.innerText = "Atendimento Humano";
        if (sideToggle) sideToggle.innerText = "Reativar IA";
      } else {
        if (btn) {
          btn.className = "text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition";
          btn.innerHTML = '<i class="fa-solid fa-pause"></i><span>Pausar IA (Assumir)</span>';
        }
        if (badge) {
          badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold";
          badge.innerText = "🤖 IA Respondendo 24h";
        }
        if (sideIcon) sideIcon.innerHTML = '<i class="fa-solid fa-robot text-emerald-600"></i>';
        if (sideText) sideText.innerText = "IA Ativa 24h";
        if (sideToggle) sideToggle.innerText = "Pausar IA";
      }
    }

    async function toggleActiveAi() {
      if (!activePhone) return;
      const targetState = !activeAiPaused;
      try {
        const res = await fetch('/api/toggle-ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, paused: targetState })
        });
        if (!res.ok) throw new Error("Erro no servidor: " + res.status);
        activeAiPaused = targetState;
        updateAiButtons(activeAiPaused);
        await loadConversations(true);
      } catch (err) {
        console.error("Erro ao alterar status da IA:", err);
      }
    }

    async function handleSendHuman(e) {
      e.preventDefault();
      const input = document.getElementById('humanInput');
      const text = input.value.trim();
      if (!text || !activePhone) return;
      input.value = '';

      // Atualização otimista imediata na tela
      messageCache[activePhone] = messageCache[activePhone] || [];
      messageCache[activePhone].push({
        direction: 'out',
        status: 'human',
        body: text,
        created_at: new Date().toISOString()
      });
      renderMessagesToContainer(messageCache[activePhone]);

      try {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, text: text })
        });
        if (!res.ok) throw new Error("Erro no servidor: " + res.status);
        await loadMessages(activePhone, false);
        await loadConversations(true);
      } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
      }
    }

    async function handleSimulateForCurrent(e) {
      e.preventDefault();
      const input = document.getElementById('simQuestionInput');
      const text = input.value.trim();
      if (!text || !activePhone) return;
      input.value = '';

      const conv = conversations.find(c => String(c.contact_wa_id) === String(activePhone));
      const name = conv ? conv.contact_name : "Paciente";

      await fetch('/api/simulate-patient', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: activePhone, name: name, text: text })
      });

      // Recarrega as mensagens após 1.8 segundos
      setTimeout(async () => {
        await loadMessages(activePhone, false);
        await loadConversations(true);
      }, 1800);
    }

    async function handleClearCurrentChat() {
      if (!activePhone) return;
      if (confirm(\`Deseja apagar o histórico de mensagens de \${activePhone}?\`)) {
        delete messageCache[activePhone];
        await fetch('/api/clear-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone })
        });
        await loadConversations();
        if (conversations.length > 0) {
          selectChat(conversations[0].contact_wa_id);
        } else {
          location.reload();
        }
      }
    }

    function openNewPatientModal() {
      document.getElementById('newPatientModal').classList.remove('hidden');
    }

    function closeNewPatientModal() {
      document.getElementById('newPatientModal').classList.add('hidden');
    }

    async function handleCreateNewPatient(e) {
      e.preventDefault();
      const name = document.getElementById('newPatientName').value.trim();
      const phone = document.getElementById('newPatientPhone').value.trim().replace(/\\D/g, '');
      const text = document.getElementById('newPatientText').value.trim();

      if (!name || !phone || !text) return;

      closeNewPatientModal();

      await fetch('/api/simulate-patient', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: phone, name: name, text: text })
      });

      setTimeout(async () => {
        await loadConversations();
        selectChat(phone);
      }, 2000);
    }

    async function refreshAll() {
      const icon = document.getElementById('refreshIcon');
      icon.classList.add('fa-spin');
      await loadConversations();
      if (activePhone) await loadMessages(activePhone, false);
      setTimeout(() => icon.classList.remove('fa-spin'), 600);
    }

    function filterChats() {
      renderConversationList();
    }

    function formatTime(isoString) {
      if (!isoString) return '';
      try {
        const normalized = isoString.replace(' ', 'T') + (isoString.endsWith('Z') ? '' : 'Z');
        const d = new Date(normalized);
        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    }

    function escapeHtml(text) {
      if (!text) return '';
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    init();
  </script>
</body>
</html>`;

// -----------------------------------------------------------------------------
// INTERFACE 2: SIMULADOR DO PACIENTE NO CELULAR (Rota / e /chat)
// -----------------------------------------------------------------------------
const PATIENT_CHAT_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp • Clínica Sorriso</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: #d1d7db; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; padding: 10px; }
    .top-banner { width: 100%; max-width: 480px; background: #ffffff; padding: 8px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .top-banner a { color: #008069; font-weight: 600; text-decoration: none; }
    .chat-app { width: 100%; max-width: 480px; height: 88vh; background: #efeae2; display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
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
    .bubble.human { background: #e0f2fe; border-left: 3px solid #0284c7; }
    .bubble .author { font-size: 10px; font-weight: bold; margin-bottom: 2px; }
    .bubble.out .author { color: #008069; }
    .bubble.human .author { color: #0284c7; }
    .bubble .time { font-size: 10px; color: #667781; text-align: right; margin-top: 4px; }
    .bubble.typing { font-style: italic; color: #667781; }
    .footer { background: #f0f2f5; padding: 10px 12px; display: flex; gap: 8px; align-items: center; }
    .footer input { flex: 1; padding: 11px 16px; border: 1px solid #e9edef; border-radius: 20px; font-size: 14.5px; outline: none; background: #ffffff; }
    .footer input:focus { border-color: #008069; }
    .footer button { background: #008069; color: white; border: none; border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; transition: transform 0.1s; flex-shrink: 0; }
    .footer button:hover { background: #006a57; }
  </style>
</head>
<body>
  <div class="top-banner">
    <span>📱 Modo Visão do Paciente</span>
    <a href="/inbox">👉 Abrir Painel da Recepção (Central)</a>
  </div>

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
    let lastLoadedCount = 0;

    function renderMessages(messages) {
      chat.innerHTML = '';
      messages.forEach(m => {
        const div = document.createElement('div');
        const isHuman = m.direction === 'out' && m.status === 'human';
        div.className = 'bubble ' + m.direction + (isHuman ? ' human' : '');

        if (m.direction === 'out') {
          const auth = document.createElement('div');
          auth.className = 'author';
          auth.innerText = isHuman ? '👤 Recepcionista' : '🤖 Secretária IA';
          div.appendChild(auth);
        }

        const textSpan = document.createElement('span');
        textSpan.innerText = m.body;
        div.appendChild(textSpan);

        const time = document.createElement('div');
        time.className = 'time';
        time.innerText = new Date((m.created_at || '').endsWith('Z') ? m.created_at : m.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.appendChild(time);

        chat.appendChild(div);
      });
      chat.scrollTop = chat.scrollHeight;
      lastLoadedCount = messages.length;
    }

    async function loadHistory() {
      try {
        const res = await fetch('/api/messages?phone=5521973401655');
        const data = await res.json();
        renderMessages(data.messages || []);
      } catch (err) {
        console.error(err);
      }
    }

    async function sendMessage(e) {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      const userBubble = document.createElement('div');
      userBubble.className = 'bubble in';
      userBubble.innerText = text;
      chat.appendChild(userBubble);

      const typing = document.createElement('div');
      typing.className = 'bubble out typing';
      typing.id = 'typingBubble';
      typing.innerText = 'Digitando...';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;

      const targetCount = lastLoadedCount + 2;

      await fetch('/simulate?q=' + encodeURIComponent(text));

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch('/api/messages?phone=5521973401655');
          const data = await res.json();
          const msgs = data.messages || [];

          if (msgs.length >= targetCount || attempts >= 8) {
            clearInterval(pollInterval);
            renderMessages(msgs);
          }
        } catch (err) {
          console.error(err);
        }
      }, 1000);
    }

    async function clearHistory() {
      if (confirm('Deseja apagar o histórico de conversa de teste?')) {
        await fetch('/clear');
        lastLoadedCount = 0;
        loadHistory();
      }
    }

    loadHistory();
    // Atualiza periodicamente para ver respostas manuais da recepcionista
    setInterval(loadHistory, 3000);
  </script>
</body>
</html>`;
