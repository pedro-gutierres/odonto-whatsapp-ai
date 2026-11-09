// Ponto de entrada do Cloudflare Worker.
// Portas de entrada:
//   fetch -> Landing Page (/), Login (/login), Simulador (/simulador), Painel (/inbox), Webhooks e APIs REST
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
  getSyncState,
  ensureAuthAndAppointments,
  getUserByEmail,
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  getTenantConfig,
  updateTenantConfig,
} from "./db";
import {
  getSessionFromRequest,
  createSessionToken,
  verifyPassword,
  makeSessionCookie,
  makeLogoutCookie,
} from "./auth";
import { LANDING_HTML } from "./views/landing";
import { LOGIN_HTML } from "./views/login";
import { INBOX_HTML } from "./views/inbox";
import { SIMULATOR_HTML } from "./views/simulator";

const MSG_SO_TEXTO = "Por enquanto consigo ler apenas mensagens de texto. Pode escrever sua dúvida? 😊";
const MSG_FALHA_IA = "Vou encaminhar sua mensagem para a nossa equipe, que responde assim que possível. Obrigada pela paciência!";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") return new Response("ok");

    // 1) PÁGINA INICIAL / LANDING INSTITUCIONAL
    if (url.pathname === "/") {
      return new Response(LANDING_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // 2) TELA DE LOGIN
    if (url.pathname === "/login") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      if (session) {
        return Response.redirect(`${url.origin}/inbox`, 302);
      }
      return new Response(LOGIN_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // 3) PAINEL DA CLÍNICA (WhatsApp Inbox + CRM de Agendamentos) - PROTEGIDO POR SESSÃO
    if (url.pathname === "/inbox" || url.pathname === "/painel") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      if (!session) {
        return Response.redirect(`${url.origin}/login`, 302);
      }
      return new Response(INBOX_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // 4) SIMULADOR DO PACIENTE NO CELULAR
    if (url.pathname === "/simulador" || url.pathname === "/chat") {
      return new Response(SIMULATOR_HTML, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // -------------------------------------------------------------------------
    // APIS DE AUTENTICAÇÃO
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      try {
        const body = (await request.json()) as { email?: string; password?: string };
        const email = body.email?.trim().toLowerCase();
        const password = body.password ?? "";

        if (!email || !password) {
          return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios." }), {
            status: 400,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }

        // Garante que as tabelas de auth e usuário inicial existam
        await ensureAuthAndAppointments(env.DB);

        const user = await getUserByEmail(env.DB, email);
        if (!user) {
          return new Response(JSON.stringify({ error: "Credenciais inválidas. Verifique seu e-mail e senha." }), {
            status: 401,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
          return new Response(JSON.stringify({ error: "Credenciais inválidas. Verifique seu e-mail e senha." }), {
            status: 401,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }

        const token = await createSessionToken(
          {
            userId: user.id,
            tenantId: user.tenant_id,
            email: user.email,
            name: user.name,
          },
          env.AUTH_SECRET
        );

        return new Response(
          JSON.stringify({
            success: true,
            user: { name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "Set-Cookie": makeSessionCookie(token),
            },
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "Set-Cookie": makeLogoutCookie(),
        },
      });
    }

    if (url.pathname === "/api/auth/me") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      if (!session) {
        return new Response(JSON.stringify({ authenticated: false }), {
          status: 401,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }
      return new Response(JSON.stringify({ authenticated: true, user: session }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // -------------------------------------------------------------------------
    // APIS DO CRM DE AGENDAMENTOS E PRÉ-AGENDAMENTOS
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/appointments") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      const tenantId = session?.tenantId ?? url.searchParams.get("tenant") ?? "lab";

      if (request.method === "GET") {
        await ensureAuthAndAppointments(env.DB);
        const appointments = await listAppointments(env.DB, tenantId);
        return new Response(JSON.stringify({ appointments }), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      if (request.method === "POST") {
        try {
          const body = (await request.json()) as {
            patientName?: string;
            patient_name?: string;
            contactWaId?: string;
            contact_wa_id?: string;
            phone?: string;
            name?: string;
            procedure?: string;
            scheduledAt?: string;
            scheduled_at?: string;
            status?: string;
            notes?: string;
          };

          const pName = body.patientName || body.patient_name || body.name || "Paciente sem nome";
          const pPhone = body.contactWaId || body.contact_wa_id || body.phone || "";
          const pProc = body.procedure || "Avaliação Geral";
          const pSched = body.scheduledAt || body.scheduled_at || "A combinar";
          const pStatus = body.status || "pre_agendado";
          const pNotes = body.notes || "";

          await ensureAuthAndAppointments(env.DB);
          await createAppointment(env.DB, tenantId, pPhone, pName, pProc, pSched, pStatus, pNotes);

          return new Response(JSON.stringify({ success: true }), {
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
        }
      }

      if (request.method === "PATCH") {
        try {
          const body = (await request.json()) as { id: number; status: string };
          if (!body.id || !body.status) {
            return new Response(JSON.stringify({ error: "id e status obrigatórios" }), { status: 400 });
          }
          await ensureAuthAndAppointments(env.DB);
          await updateAppointmentStatus(env.DB, tenantId, body.id, body.status);
          return new Response(JSON.stringify({ success: true }), {
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
        }
      }
    }

    // -------------------------------------------------------------------------
    // APIS DE CONFIGURAÇÃO & TREINAMENTO DA IA (ODONTO & ESTÉTICA)
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/config") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      const tenantId = session?.tenantId ?? url.searchParams.get("tenant") ?? "lab";

      if (request.method === "GET") {
        let config = await getTenantConfig(env.DB, tenantId);
        if (!config) {
          // Template padrão rico para Odonto & Estética
          config = {
            clinic_name: "Clínica Sorriso & Estética Integrada",
            doctor_name: "Dra. Fernanda Alves",
            doctor_cro: "CRO-SP 102.450 / Harmonização Orofacial",
            specialties: ["Harmonização Orofacial", "Odontologia Estética", "Reabilitação Oral"],
            tone: "acolhedor",
            procedures: [
              "Limpeza & Profilaxia",
              "Clareamento Dental a Laser",
              "Alinhadores Invisíveis",
              "Lentes de Resina e Porcelana",
              "Toxina Botulínica (Botox)",
              "Preenchimento Labial & Facial",
              "Bioestimulador de Colágeno (Sculptra)",
            ],
            custom_procedures: [
              { name: "Lipoaspiração Enzimática de Papada", category: "Estética", duration: "45 min", note: "Requer avaliação anatômica prévia" },
            ],
            price_strategy: "avaliacao",
            prices_note: "Não passamos orçamentos fechados sem avaliação presencial com o especialista.",
            payment_methods: "À vista no Pix com 10% de desconto ou em até 12x sem juros no cartão.",
            insurance: "Atendimento particular exclusivo. Fornecemos nota fiscal detalhada e relatório para reembolso.",
            address: "Av. Paulista, 1800, Conjunto 124 - Bela Vista, São Paulo/SP",
            parking: "Estacionamento conveniado com manobrista no próprio edifício.",
            hours: "Segunda a Sexta das 08h às 19h | Sábados das 08h às 13h",
            delay_tolerance: "Tolerância de até 15 minutos para pontualidade dos atendimentos.",
            emergency_contact: "Em caso de dor aguda, avise a equipe para encaixe de urgência no mesmo dia.",
            clinical_rules: "Gestantes e lactantes não realizam procedimentos injetáveis. Proibido fornecer atestados ou receitas pelo WhatsApp.",
            extra: "Clínica equipada com tecnologia 3D e escaneamento digital intraoral.",
          };
        }
        return new Response(JSON.stringify({ config }), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      if (request.method === "POST") {
        try {
          const body = (await request.json()) as { config: BotConfig };
          if (!body.config) {
            return new Response(JSON.stringify({ error: "config é obrigatório" }), { status: 400 });
          }
          await updateTenantConfig(env.DB, tenantId, body.config);
          return new Response(JSON.stringify({ success: true }), {
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
        }
      }
    }

    // -------------------------------------------------------------------------
    // APIS DO ATENDIMENTO WHATSAPP (MULTI-CHAT)
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/conversations") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      const tenantId = session?.tenantId ?? url.searchParams.get("tenant") ?? "lab";
      const conversations = await listConversations(env.DB, tenantId);
      return new Response(JSON.stringify({ conversations }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/messages") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      const tenantId = session?.tenantId ?? url.searchParams.get("tenant") ?? "lab";
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

    // Checagem ultra-leve de 1 row read para polling (economiza 99% das cotas do D1)
    if (url.pathname === "/api/sync-check") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      const tenantId = session?.tenantId ?? url.searchParams.get("tenant") ?? "lab";
      const activePhone = url.searchParams.get("active_phone") || null;
      const lastId = parseInt(url.searchParams.get("last_id") || "0", 10);
      const lastActiveMsgId = parseInt(url.searchParams.get("active_msg_id") || "0", 10);

      const state = await getSyncState(env.DB, tenantId, activePhone);

      const hasNewGlobal = state.latestId > lastId;
      const hasNewActive = activePhone ? state.activeLatestId > lastActiveMsgId : false;

      return new Response(
        JSON.stringify({
          has_new_global: hasNewGlobal,
          has_new_active: hasNewActive,
          latest_id: state.latestId,
          active_latest_id: state.activeLatestId,
          active_ai_paused: state.activeAiPaused,
        }),
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-cache",
          },
        },
      );
    }

    // Inicialização única de tabelas e índices
    if (url.pathname === "/api/init-perf") {
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages (tenant_id, id);").run();
      await ensureAuthAndAppointments(env.DB);
      return new Response(JSON.stringify({ status: "indexes and tables ensured" }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // Envio manual de resposta da recepcionista
    if (url.pathname === "/api/send" && request.method === "POST") {
      try {
        const session = await getSessionFromRequest(request, env.AUTH_SECRET);
        const body = (await request.json()) as { phone: string; text: string; tenant?: string };
        const tenantId = session?.tenantId ?? body.tenant ?? "lab";
        if (!body.phone || !body.text) {
          return new Response(JSON.stringify({ error: "phone e text são obrigatórios" }), { status: 400 });
        }

        await saveHumanOutbound(env.DB, tenantId, body.phone, body.text);

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
        const session = await getSessionFromRequest(request, env.AUTH_SECRET);
        const body = (await request.json()) as { phone: string; paused: boolean; tenant?: string };
        const tenantId = session?.tenantId ?? body.tenant ?? "lab";
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
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      const body = (await request.json()) as { phone: string; tenant?: string };
      const tenantId = session?.tenantId ?? body.tenant ?? "lab";
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
