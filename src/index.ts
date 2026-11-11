// Ponto de entrada do Cloudflare Worker.
// Portas de entrada:
//   fetch     -> Landing Page (/), Login (/login), Painel (/inbox), Webhooks da Meta e APIs REST autenticadas
//   queue     -> Processa cada mensagem recebida (busca clínica, checa pausa da IA, chama Claude, responde no WhatsApp)
//   scheduled -> Cron diário (23:00 UTC / 20h Brasília) para confirmações de véspera multi-tenant
import type { BotConfig, Env, InboundJob } from "./types";
import { extractJobs, sendText, verifySignature } from "./whatsapp";
import { askClaude } from "./claude";
import { buildSystemPrompt } from "./prompt";
import {
  claimInbound,
  getTenantById,
  getTenantByPhoneNumberId,
  isConfiguredPhoneNumberId,
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
  getUserById,
  listAppointments,
  createAppointment,
  updateAppointmentDetails,
  getUpcomingAppointments,
  confirmUpcomingAppointmentForContact,
  deleteAppointment,
  getTenantConfig,
  updateTenantConfig,
  isCrucialConfigComplete,
  listAdminOverview,
  createTenantWithOptionalUser,
  updateTenantAdminSettings,
  createClinicUser,
  resetUserPassword,
  type AppointmentRecord,
} from "./db";
import {
  getSessionFromRequest,
  createSessionToken,
  hashPassword,
  verifyPassword,
  makeSessionCookie,
  makeLogoutCookie,
  resolveTenantAccessToken,
  encryptTenantTokenForEnv,
  isSuperAdminAuthorized,
  type SessionUser,
} from "./auth";
import { LANDING_HTML } from "./views/landing";
import { LOGIN_HTML } from "./views/login";
import { INBOX_HTML } from "./views/inbox";
import { ADMIN_HTML } from "./views/admin";

const MSG_SO_TEXTO = "Por enquanto consigo ler apenas mensagens de texto. Pode escrever sua dúvida? 😊";
const MSG_FALHA_IA = "Vou encaminhar sua mensagem para a nossa equipe, que responde assim que possível. Obrigada pela paciência!";

const DEFAULT_CONFIG_TEMPLATE: BotConfig = {
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

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...SECURITY_HEADERS,
    },
  });
}

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

async function requireSession(request: Request, env: Env): Promise<{ session: SessionUser } | { response: Response }> {
  const session = await getSessionFromRequest(request, env.AUTH_SECRET);
  if (!session) {
    return { response: jsonResponse({ error: "Não autenticado" }, 401) };
  }
  return { session };
}

async function requireSuperAdmin(
  request: Request,
  env: Env,
  isHtml = false
): Promise<{ session: SessionUser } | { response: Response }> {
  const url = new URL(request.url);
  const session = await getSessionFromRequest(request, env.AUTH_SECRET);
  if (!session) {
    return {
      response: isHtml
        ? Response.redirect(`${url.origin}/login`, 302)
        : jsonResponse({ error: "Não autenticado" }, 401),
    };
  }

  const dbUser = await getUserById(env.DB, session.userId);
  if (!dbUser || !isSuperAdminAuthorized(dbUser.email, dbUser.role, env)) {
    if (isHtml) {
      return {
        response: htmlResponse(
          `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:sans-serif;background:#0b0f17;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h2>Acesso restrito ao Super Admin</h2><p style="color:#94a3b8">Sua conta não possui permissão administrativa global.</p><a href="/inbox" style="color:#34d399">Voltar ao Painel</a></div></body></html>`,
          403
        ),
      };
    }
    return { response: jsonResponse({ error: "Acesso restrito ao Super Admin." }, 403) };
  }

  return { session: { ...session, email: dbUser.email, role: dbUser.role, name: dbUser.name } };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isSecure = url.protocol === "https:";

    if (url.pathname === "/health") {
      return new Response("ok", { headers: SECURITY_HEADERS });
    }

    // 1) PÁGINA INICIAL / LANDING INSTITUCIONAL
    if (url.pathname === "/") {
      return htmlResponse(LANDING_HTML);
    }

    // 2) TELA DE LOGIN
    if (url.pathname === "/login") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      if (session) {
        return Response.redirect(`${url.origin}/inbox`, 302);
      }
      return htmlResponse(LOGIN_HTML);
    }

    // 3) PAINEL DA CLÍNICA (WhatsApp Inbox + CRM de Agendamentos) - PROTEGIDO POR SESSÃO
    if (url.pathname === "/inbox" || url.pathname === "/painel") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      if (!session) {
        return Response.redirect(`${url.origin}/login`, 302);
      }
      return htmlResponse(INBOX_HTML);
    }

    // 4) PAINEL GLOBAL SUPER ADMIN - PROTEGIDO POR SESSÃO + ROLE SUPERADMIN + ALLOWLIST
    if (url.pathname === "/admin") {
      const auth = await requireSuperAdmin(request, env, true);
      if ("response" in auth) return auth.response;
      return htmlResponse(ADMIN_HTML);
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
          return jsonResponse({ error: "E-mail e senha são obrigatórios." }, 400);
        }

        const user = await getUserByEmail(env.DB, email);
        if (!user) {
          return jsonResponse({ error: "Credenciais inválidas. Verifique seu e-mail e senha." }, 401);
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
          return jsonResponse({ error: "Credenciais inválidas. Verifique seu e-mail e senha." }, 401);
        }

        const token = await createSessionToken(
          {
            userId: user.id,
            tenantId: user.tenant_id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          env.AUTH_SECRET
        );

        return jsonResponse(
          {
            success: true,
            user: { name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id },
          },
          200,
          { "Set-Cookie": makeSessionCookie(token, isSecure) }
        );
      } catch (err) {
        console.error("Erro em /api/auth/login:", String(err));
        return jsonResponse({ error: "Erro interno ao autenticar." }, 500);
      }
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return jsonResponse({ success: true }, 200, { "Set-Cookie": makeLogoutCookie(isSecure) });
    }

    if (url.pathname === "/api/auth/me") {
      const session = await getSessionFromRequest(request, env.AUTH_SECRET);
      if (!session) {
        return jsonResponse({ authenticated: false }, 401);
      }
      const dbUser = await getUserById(env.DB, session.userId);
      const isSuperAdmin = dbUser ? isSuperAdminAuthorized(dbUser.email, dbUser.role, env) : false;
      return jsonResponse({
        authenticated: true,
        user: {
          ...session,
          name: dbUser?.name ?? session.name,
          email: dbUser?.email ?? session.email,
          role: dbUser?.role ?? session.role,
          isSuperAdmin,
        },
      });
    }

    // -------------------------------------------------------------------------
    // APIS DO SUPER ADMIN (VISÃO GLOBAL DO SAAS & GESTÃO DE TENANTS/USUÁRIOS)
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/admin/overview" && request.method === "GET") {
      const auth = await requireSuperAdmin(request, env);
      if ("response" in auth) return auth.response;

      try {
        const overview = await listAdminOverview(env.DB);
        return jsonResponse(overview);
      } catch (err) {
        console.error("Erro em /api/admin/overview:", String(err));
        return jsonResponse({ error: "Erro ao carregar visão global." }, 500);
      }
    }

    if (url.pathname === "/api/admin/tenants") {
      const auth = await requireSuperAdmin(request, env);
      if ("response" in auth) return auth.response;

      if (request.method === "POST") {
        try {
          const body = (await request.json()) as {
            tenantId?: string;
            name?: string;
            phoneNumberId?: string | null;
            wabaId?: string | null;
            accessToken?: string | null;
            adminName?: string;
            adminEmail?: string;
            adminPassword?: string;
          };

          const tenantId = body.tenantId?.trim().toLowerCase() || "";
          const name = body.name?.trim() || "";
          if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(tenantId)) {
            return jsonResponse({ error: "ID da clínica inválido (use apenas letras minúsculas, números e hífen)." }, 400);
          }
          if (!name) {
            return jsonResponse({ error: "Nome da clínica é obrigatório." }, 400);
          }

          const hasAnyUserField = Boolean(body.adminName?.trim() || body.adminEmail?.trim() || body.adminPassword);
          let adminUser: { name: string; email: string; passwordHash: string } | undefined;
          if (hasAnyUserField) {
            if (!body.adminName?.trim() || !body.adminEmail?.trim() || !body.adminPassword || body.adminPassword.length < 6) {
              return jsonResponse({ error: "Para criar o usuário inicial, informe nome, e-mail e senha (mín. 6 caracteres)." }, 400);
            }
            adminUser = {
              name: body.adminName.trim(),
              email: body.adminEmail.trim().toLowerCase(),
              passwordHash: await hashPassword(body.adminPassword),
            };
          }

          const encryptedToken = body.accessToken?.trim()
            ? await encryptTenantTokenForEnv(body.accessToken.trim(), env)
            : null;

          await createTenantWithOptionalUser(env.DB, {
            tenantId,
            name,
            phoneNumberId: body.phoneNumberId?.trim() || null,
            wabaId: body.wabaId?.trim() || null,
            accessTokenEnc: encryptedToken,
            adminUser,
          });

          return jsonResponse({ success: true, tenantId });
        } catch (err) {
          const msg = String(err);
          if (msg.includes("UNIQUE")) {
            return jsonResponse({ error: "ID da clínica, Phone Number ID ou E-mail já cadastrado." }, 409);
          }
          console.error("Erro em POST /api/admin/tenants:", msg);
          return jsonResponse({ error: "Erro ao criar clínica." }, 500);
        }
      }

      if (request.method === "PATCH") {
        try {
          const body = (await request.json()) as {
            tenantId?: string;
            name?: string;
            active?: boolean;
            phoneNumberId?: string;
            wabaId?: string;
            accessToken?: string;
            clearToken?: boolean;
          };

          const tenantId = body.tenantId?.trim();
          if (!tenantId) {
            return jsonResponse({ error: "tenantId obrigatório" }, 400);
          }

          const encryptedToken = body.accessToken?.trim()
            ? await encryptTenantTokenForEnv(body.accessToken.trim(), env)
            : undefined;

          const updated = await updateTenantAdminSettings(env.DB, tenantId, {
            name: body.name,
            active: body.active,
            phoneNumberId: typeof body.phoneNumberId === "string" ? body.phoneNumberId : undefined,
            wabaId: typeof body.wabaId === "string" ? body.wabaId : undefined,
            accessTokenEnc: encryptedToken,
            clearToken: body.clearToken,
          });

          if (!updated) {
            return jsonResponse({ error: "Clínica não encontrada ou sem alterações." }, 404);
          }
          return jsonResponse({ success: true });
        } catch (err) {
          const msg = String(err);
          if (msg.includes("UNIQUE")) {
            return jsonResponse({ error: "Este Phone Number ID já está vinculado a outra clínica." }, 409);
          }
          console.error("Erro em PATCH /api/admin/tenants:", msg);
          return jsonResponse({ error: "Erro ao atualizar clínica." }, 500);
        }
      }

      return jsonResponse({ error: "Método não permitido" }, 405);
    }

    if (url.pathname === "/api/admin/users" && request.method === "POST") {
      const auth = await requireSuperAdmin(request, env);
      if ("response" in auth) return auth.response;

      try {
        const body = (await request.json()) as {
          tenantId?: string;
          name?: string;
          email?: string;
          password?: string;
          role?: "admin" | "staff";
        };

        const tenantId = body.tenantId?.trim();
        const name = body.name?.trim();
        const email = body.email?.trim().toLowerCase();
        const password = body.password || "";

        if (!tenantId || !name || !email || password.length < 6) {
          return jsonResponse({ error: "Clínica, nome, e-mail e senha (mín. 6 caracteres) são obrigatórios." }, 400);
        }

        const tenant = await getTenantById(env.DB, tenantId);
        if (!tenant) {
          return jsonResponse({ error: "Clínica não encontrada." }, 404);
        }

        const id = await createClinicUser(env.DB, {
          tenantId,
          name,
          email,
          passwordHash: await hashPassword(password),
          role: body.role === "staff" ? "staff" : "admin",
        });

        return jsonResponse({ success: true, id });
      } catch (err) {
        const msg = String(err);
        if (msg.includes("UNIQUE")) {
          return jsonResponse({ error: "Já existe um usuário com este e-mail." }, 409);
        }
        console.error("Erro em POST /api/admin/users:", msg);
        return jsonResponse({ error: "Erro ao criar usuário." }, 500);
      }
    }

    if (url.pathname === "/api/admin/users/password" && request.method === "PATCH") {
      const auth = await requireSuperAdmin(request, env);
      if ("response" in auth) return auth.response;

      try {
        const body = (await request.json()) as { userId?: number; newPassword?: string };
        if (!body.userId || !body.newPassword || body.newPassword.length < 6) {
          return jsonResponse({ error: "userId e nova senha (mín. 6 caracteres) são obrigatórios." }, 400);
        }
        const ok = await resetUserPassword(env.DB, body.userId, await hashPassword(body.newPassword));
        if (!ok) {
          return jsonResponse({ error: "Usuário não encontrado." }, 404);
        }
        return jsonResponse({ success: true });
      } catch (err) {
        console.error("Erro em PATCH /api/admin/users/password:", String(err));
        return jsonResponse({ error: "Erro ao redefinir senha." }, 500);
      }
    }

    // -------------------------------------------------------------------------
    // APIS DO CRM DE AGENDAMENTOS E PRÉ-AGENDAMENTOS (AUTENTICADAS)
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/appointments") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;
      const tenantId = auth.session.tenantId;

      if (request.method === "GET") {
        const appointments = await listAppointments(env.DB, tenantId);
        return jsonResponse({ appointments });
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
            duration?: string;
          };

          const pName = body.patientName || body.patient_name || body.name || "Paciente sem nome";
          const pPhone = body.contactWaId || body.contact_wa_id || body.phone || "";
          const pProc = body.procedure || "Avaliação Geral";
          const pSched = body.scheduledAt || body.scheduled_at || "A combinar";
          const pStatus = body.status || "pre_agendado";
          const pNotes = body.notes || "";
          const pDuration = body.duration || "30 min";

          const res = await createAppointment(env.DB, tenantId, pPhone, pName, pProc, pSched, pStatus, pNotes, pDuration);

          if (!res.success && res.conflict) {
            return jsonResponse({ error: res.message, conflict: true }, 409);
          }

          return jsonResponse({ success: true, id: res.id });
        } catch (err) {
          console.error("Erro em POST /api/appointments:", String(err));
          return jsonResponse({ error: "Erro ao criar agendamento." }, 500);
        }
      }

      if (request.method === "PATCH") {
        try {
          const body = (await request.json()) as {
            id: number;
            status?: string;
            notes?: string;
            procedure?: string;
            scheduledAt?: string;
            duration?: string;
          };
          if (!body.id) {
            return jsonResponse({ error: "id obrigatório" }, 400);
          }
          await updateAppointmentDetails(env.DB, tenantId, body.id, body);
          return jsonResponse({ success: true });
        } catch (err) {
          console.error("Erro em PATCH /api/appointments:", String(err));
          return jsonResponse({ error: "Erro ao atualizar agendamento." }, 500);
        }
      }

      if (request.method === "DELETE") {
        try {
          const body = (await request.json().catch(() => ({}))) as { id?: number };
          const id = body.id || parseInt(url.searchParams.get("id") || "0", 10);
          if (!id) {
            return jsonResponse({ error: "id obrigatório" }, 400);
          }
          await deleteAppointment(env.DB, tenantId, id);
          return jsonResponse({ success: true });
        } catch (err) {
          console.error("Erro em DELETE /api/appointments:", String(err));
          return jsonResponse({ error: "Erro ao excluir agendamento." }, 500);
        }
      }

      return jsonResponse({ error: "Método não permitido" }, 405);
    }

    // DISPARO MANUAL DAS CONFIRMAÇÕES DE VÉSPERA (RESTRITO À CLÍNICA LOGADA)
    if (url.pathname === "/api/appointments/run-confirmations" && request.method === "POST") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;

      try {
        const result = await runDayBeforeConfirmations(env, auth.session.tenantId);
        return jsonResponse({ success: true, ...result });
      } catch (err) {
        console.error("Erro em /api/appointments/run-confirmations:", String(err));
        return jsonResponse({ error: "Erro ao disparar confirmações." }, 500);
      }
    }

    // -------------------------------------------------------------------------
    // APIS DE CONFIGURAÇÃO & TREINAMENTO DA IA (AUTENTICADAS)
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/config") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;
      const tenantId = auth.session.tenantId;

      if (request.method === "GET") {
        let config = await getTenantConfig(env.DB, tenantId);
        if (!config) {
          config = DEFAULT_CONFIG_TEMPLATE;
        }
        return jsonResponse({ config });
      }

      if (request.method === "POST") {
        try {
          const body = (await request.json()) as { config?: BotConfig };
          if (!body.config) {
            return jsonResponse({ error: "config é obrigatório" }, 400);
          }
          await updateTenantConfig(env.DB, tenantId, body.config);
          return jsonResponse({ success: true });
        } catch (err) {
          console.error("Erro em POST /api/config:", String(err));
          return jsonResponse({ error: "Erro ao salvar configuração da clínica." }, 500);
        }
      }

      return jsonResponse({ error: "Método não permitido" }, 405);
    }

    // -------------------------------------------------------------------------
    // APIS DO ATENDIMENTO WHATSAPP MULTI-CHAT (AUTENTICADAS)
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/time") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;
      return jsonResponse(
        {
          server_time: new Date().toISOString(),
          timezone: "America/Sao_Paulo",
        },
        200,
        { "cache-control": "no-cache" }
      );
    }

    if (url.pathname === "/api/conversations") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;

      try {
        const conversations = await listConversations(env.DB, auth.session.tenantId);
        return jsonResponse({ conversations, server_time: new Date().toISOString() });
      } catch (err) {
        console.error("Erro em /api/conversations:", String(err));
        return jsonResponse({ error: "Erro ao carregar conversas.", conversations: [], server_time: new Date().toISOString() }, 500);
      }
    }

    if (url.pathname === "/api/messages") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;

      try {
        const phone = url.searchParams.get("phone");
        if (!phone) {
          return jsonResponse({ error: "phone obrigatório" }, 400);
        }
        const messages = await getConversationMessages(env.DB, auth.session.tenantId, phone);
        const aiPaused = await isAiPaused(env.DB, auth.session.tenantId, phone);
        return jsonResponse({ messages, ai_paused: aiPaused, server_time: new Date().toISOString() });
      } catch (err) {
        console.error("Erro em /api/messages:", String(err));
        return jsonResponse(
          { error: "Erro ao carregar mensagens.", messages: [], ai_paused: false, server_time: new Date().toISOString() },
          500
        );
      }
    }

    // Checagem ultra-leve de 1 row read para polling (economiza 99% das cotas do D1)
    if (url.pathname === "/api/sync-check") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;

      try {
        const activePhone = url.searchParams.get("active_phone") || null;
        const lastId = parseInt(url.searchParams.get("last_id") || "0", 10);
        const lastActiveMsgId = parseInt(url.searchParams.get("active_msg_id") || "0", 10);

        const state = await getSyncState(env.DB, auth.session.tenantId, activePhone);

        return jsonResponse(
          {
            has_new_global: state.latestId > lastId,
            has_new_active: activePhone ? state.activeLatestId > lastActiveMsgId : false,
            latest_id: state.latestId,
            active_latest_id: state.activeLatestId,
            active_ai_paused: state.activeAiPaused,
            server_time: new Date().toISOString(),
          },
          200,
          { "cache-control": "no-cache" }
        );
      } catch (err) {
        console.error("Erro em /api/sync-check:", String(err));
        return jsonResponse(
          {
            has_new_global: false,
            has_new_active: false,
            latest_id: 0,
            active_latest_id: 0,
            active_ai_paused: false,
            server_time: new Date().toISOString(),
          },
          200,
          { "cache-control": "no-cache" }
        );
      }
    }

    // Inicialização manual de tabelas e índices (protegida por sessão; uso exclusivo de setup)
    if (url.pathname === "/api/init-perf") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;

      try {
        await ensureAuthAndAppointments(env.DB);
        return jsonResponse({ status: "indexes and tables ensured" });
      } catch (err) {
        console.error("Erro em /api/init-perf:", String(err));
        return jsonResponse({ error: "Erro ao garantir estrutura do banco." }, 500);
      }
    }

    // Envio manual de resposta da recepcionista (usa phone_number_id e token da clínica logada)
    if (url.pathname === "/api/send" && request.method === "POST") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;
      const tenantId = auth.session.tenantId;

      try {
        const body = (await request.json()) as { phone?: string; text?: string };
        const phone = body.phone?.trim();
        const text = body.text?.trim();
        if (!phone || !text) {
          return jsonResponse({ error: "phone e text são obrigatórios" }, 400);
        }

        const tenant = await getTenantById(env.DB, tenantId);
        const token = await resolveTenantAccessToken(tenant, env);
        const hasValidPhoneId = isConfiguredPhoneNumberId(tenant?.phone_number_id);

        let sentId: string | null = null;
        let whatsappSent = false;
        let warning: string | undefined;

        if (tenant && hasValidPhoneId && token) {
          try {
            sentId = await sendText(env, tenant.phone_number_id, token, phone, text);
            whatsappSent = true;
          } catch (e) {
            warning = "Mensagem salva no painel, mas o envio pelo WhatsApp falhou.";
            console.warn(`Aviso ao enviar manual no WhatsApp (tenant=${tenantId}):`, String(e));
          }
        } else {
          warning = "Clínica sem phone_number_id ou token WhatsApp configurado; mensagem salva apenas no painel.";
          console.warn(`[SEND] ${warning} (tenant=${tenantId})`);
        }

        await saveHumanOutbound(env.DB, tenantId, phone, text, sentId);
        // Sempre que a recepcionista envia mensagem manual, a IA é pausada para este contato
        await setAiPaused(env.DB, tenantId, phone, true);

        return jsonResponse({
          success: true,
          ai_paused: true,
          whatsapp_sent: whatsappSent,
          ...(warning ? { warning } : {}),
        });
      } catch (err) {
        console.error("Erro em /api/send:", String(err));
        return jsonResponse({ error: "Erro ao enviar mensagem." }, 500);
      }
    }

    // Ligar / Desligar IA para um paciente específico (Human Takeover)
    if (url.pathname === "/api/toggle-ai" && request.method === "POST") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;

      try {
        const body = (await request.json()) as { phone?: string; paused?: boolean };
        if (!body.phone) {
          return jsonResponse({ error: "phone obrigatório" }, 400);
        }
        await setAiPaused(env.DB, auth.session.tenantId, body.phone, !!body.paused);
        return jsonResponse({ success: true, ai_paused: !!body.paused });
      } catch (err) {
        console.error("Erro em /api/toggle-ai:", String(err));
        return jsonResponse({ error: "Erro ao alterar status da IA." }, 500);
      }
    }

    // Limpar conversa específica da clínica logada
    if (url.pathname === "/api/clear-chat" && request.method === "POST") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;

      try {
        const body = (await request.json()) as { phone?: string };
        if (!body.phone) {
          return jsonResponse({ error: "phone obrigatório" }, 400);
        }
        await clearConversation(env.DB, auth.session.tenantId, body.phone);
        return jsonResponse({ status: "cleared" });
      } catch (err) {
        console.error("Erro em /api/clear-chat:", String(err));
        return jsonResponse({ error: "Erro ao limpar conversa." }, 500);
      }
    }

    // -------------------------------------------------------------------------
    // WEBHOOK OFICIAL DA META (WHATSAPP CLOUD API)
    // -------------------------------------------------------------------------
    if (url.pathname !== "/webhook") {
      return new Response("not found", { status: 404, headers: SECURITY_HEADERS });
    }

    // 1) Verificação inicial da Meta
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token && env.WA_VERIFY_TOKEN && token === env.WA_VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200, headers: { "content-type": "text/plain", ...SECURITY_HEADERS } });
      }
      return new Response("forbidden", { status: 403, headers: SECURITY_HEADERS });
    }

    // 2) Mensagens oficiais recebidas da Meta
    if (request.method === "POST") {
      const raw = await request.arrayBuffer();

      const ok = await verifySignature(raw, request.headers.get("x-hub-signature-256"), env.META_APP_SECRETS);
      if (!ok) return new Response("invalid signature", { status: 401, headers: SECURITY_HEADERS });

      let payload: unknown;
      try {
        payload = JSON.parse(new TextDecoder().decode(raw));
      } catch {
        return new Response("bad json", { status: 400, headers: SECURITY_HEADERS });
      }

      const jobs = extractJobs(payload);
      if (jobs.length) {
        await env.INBOX.sendBatch(jobs.map((body) => ({ body })));
      }
      return new Response("ok", { status: 200, headers: SECURITY_HEADERS });
    }

    return new Response("method not allowed", { status: 405, headers: SECURITY_HEADERS });
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

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    console.log("[CRON] Executando rotina de confirmações automáticas de véspera às 20h...");
    const result = await runDayBeforeConfirmations(env);
    console.log("[CRON] Confirmações finalizadas:", JSON.stringify(result));
  },
} satisfies ExportedHandler<Env, InboundJob>;

interface AppointmentWithTenant extends AppointmentRecord {
  phone_number_id: string;
  access_token_enc: string | null;
}

export async function runDayBeforeConfirmations(
  env: Env,
  targetTenantId?: string
): Promise<{ total: number; sent: number; skipped: number; failed: number }> {
  // Data de amanhã no fuso de Brasília (YYYY-MM-DD)
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);

  // Busca agendamentos de amanhã ainda não confirmados de TODAS as clínicas ativas (ou de uma clínica específica)
  const query = targetTenantId
    ? `SELECT a.*, t.phone_number_id, t.access_token_enc
       FROM appointments a
       INNER JOIN tenants t ON t.id = a.tenant_id
       WHERE t.active = 1
         AND a.tenant_id = ?2
         AND a.scheduled_at LIKE ?1
         AND a.status IN ('agendado', 'pre_agendado')`
    : `SELECT a.*, t.phone_number_id, t.access_token_enc
       FROM appointments a
       INNER JOIN tenants t ON t.id = a.tenant_id
       WHERE t.active = 1
         AND a.scheduled_at LIKE ?1
         AND a.status IN ('agendado', 'pre_agendado')`;

  const stmt = targetTenantId
    ? env.DB.prepare(query).bind(`${tomorrowDateStr}%`, targetTenantId)
    : env.DB.prepare(query).bind(`${tomorrowDateStr}%`);

  const { results } = await stmt.all<AppointmentWithTenant>();

  const list = results || [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const app of list) {
    const contactPhone = app.contact_wa_id?.trim();
    if (!contactPhone || !isConfiguredPhoneNumberId(app.phone_number_id)) {
      skipped++;
      continue;
    }

    const token = await resolveTenantAccessToken({ access_token_enc: app.access_token_enc }, env);
    if (!token) {
      console.warn(`[CRON] Clínica ${app.tenant_id} sem token WhatsApp configurado; pulando confirmação.`);
      skipped++;
      continue;
    }

    const patientName = app.patient_name || "Paciente";
    const proc = app.procedure || "sua consulta";
    const timePart = app.scheduled_at.includes(" ") ? app.scheduled_at.split(" ")[1] : app.scheduled_at;

    const msgText = `Olá, ${patientName}! 😊\nPassando para confirmar seu horário de *${proc}* amanhã (${tomorrowDateStr}) às *${timePart}*.\n\nVocê confirma sua presença? Por favor, responda com *SIM* para confirmar.`;

    try {
      const sentId = await sendText(env, app.phone_number_id, token, contactPhone, msgText);
      await saveOutbound(env.DB, app.tenant_id, contactPhone, msgText, sentId);
      sent++;
    } catch (e) {
      console.error(`[CRON] Falha ao enviar confirmação para ${contactPhone} (tenant=${app.tenant_id}):`, String(e));
      failed++;
    }
  }

  return { total: list.length, sent, skipped, failed };
}

async function processJob(job: InboundJob, env: Env): Promise<void> {
  const tenant = await getTenantByPhoneNumberId(env.DB, job.phoneNumberId);
  if (!tenant || !tenant.active || !isConfiguredPhoneNumberId(tenant.phone_number_id)) {
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
    console.log(`[HUMAN_TAKEOVER] IA pausada para o contato ${job.from} (tenant=${tenant.id}).`);
    await markAnswered(env.DB, job.waMessageId);
    return;
  }

  let parsedCfg: BotConfig | null = null;
  try {
    parsedCfg = JSON.parse(tenant.bot_config) as BotConfig;
  } catch {
    parsedCfg = null;
  }

  if (!isCrucialConfigComplete(parsedCfg)) {
    console.log(`[TRAINING_INCOMPLETE] Treinamento crucial incompleto para tenant ${tenant.id}. IA desligada até completar os dados.`);
    await markAnswered(env.DB, job.waMessageId);
    return;
  }

  const token = await resolveTenantAccessToken(tenant, env);
  if (!token) {
    throw new Error(`Token WhatsApp não configurado para a clínica ${tenant.id}`);
  }

  let reply: string;
  let freshHistory: { role: "user" | "assistant"; content: string }[] = [];
  if (!job.text) {
    reply = MSG_SO_TEXTO;
  } else {
    const cfg = parsedCfg as BotConfig;
    freshHistory = await loadHistory(env.DB, tenant.id, job.from);

    // Obtém data/hora atual no fuso oficial de Brasília
    const nowBrasiliaStr = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    // Obtém agendamentos futuros para a IA respeitar a grade e evitar qualquer conflito
    const upcoming = await getUpcomingAppointments(env.DB, tenant.id);
    const existingAppointments = upcoming.map((a) => ({
      scheduled_at: a.scheduled_at,
      procedure: a.procedure || "Consulta",
      duration: a.duration || "30 min",
    }));

    const systemPrompt = buildSystemPrompt(cfg, {
      nowBrasiliaStr,
      existingAppointments,
    });

    reply = (await askClaude(env, systemPrompt, freshHistory)) ?? MSG_FALHA_IA;
  }

  // 1. Processa comando de agendamento automático feito pela IA durante a conversa
  const agendarRegex = /<<<AGENDAR:\s*({[\s\S]*?})\s*>>>/gi;
  const confirmarRegex = /<<<CONFIRMAR:\s*({[\s\S]*?})\s*>>>/gi;
  const matchAgendar = /<<<AGENDAR:\s*({[\s\S]*?})\s*>>>/i.exec(reply);

  if (matchAgendar) {
    let scheduledAt = "o horário escolhido";
    let procedure = "sua consulta";
    let bookingSucceeded = false;
    let conflictReason = "";

    try {
      const data = JSON.parse(matchAgendar[1]);
      const patientName = data.patient_name || job.contactName || "Paciente";
      procedure = data.procedure || "Consulta / Avaliação";
      scheduledAt = data.scheduled_at || "A combinar";
      const duration = data.duration || "30 min";
      const notes = data.notes || "Agendado via IA WhatsApp";

      const res = await createAppointment(env.DB, tenant.id, job.from, patientName, procedure, scheduledAt, "agendado", notes, duration);
      if (res.success) {
        bookingSucceeded = true;
        console.log(`[AGENDAMENTO_IA] Agendamento criado com sucesso para ${patientName} em ${scheduledAt}`);
      } else {
        conflictReason = res.message || "Horário já ocupado na grade.";
        console.warn(`[AGENDAMENTO_IA_CONFLITO] Não foi possível agendar para ${patientName} em ${scheduledAt}: ${conflictReason}`);
      }
    } catch (e) {
      conflictReason = "Não foi possível validar os dados do horário solicitado.";
      console.error("Erro ao processar tag <<<AGENDAR>>>:", e);
    }

    reply = reply.replace(agendarRegex, "").trim();

    // Se houve conflito ou erro ao gravar na agenda, NUNCA envia falso positivo ("Agendei!").
    // Recalcula a grade atualizada e pede à IA uma resposta natural oferecendo alternativas livres.
    if (!bookingSucceeded) {
      const fallbackConflictMsg = `Desculpe! O horário de ${scheduledAt} para ${procedure} acabou de ser preenchido na nossa agenda. 😕\n\nQual outro dia ou horário ficaria melhor para você?`;
      let correctedReply: string | null = null;

      if (job.text && parsedCfg && freshHistory.length > 0) {
        try {
          const latestUpcoming = await getUpcomingAppointments(env.DB, tenant.id);
          const nowBrasiliaStr = new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date());

          const retrySystemPrompt =
            buildSystemPrompt(parsedCfg, {
              nowBrasiliaStr,
              existingAppointments: latestUpcoming.map((a) => ({
                scheduled_at: a.scheduled_at,
                procedure: a.procedure || "Consulta",
                duration: a.duration || "30 min",
              })),
            }) +
            `\n\nATENÇÃO CRÍTICA DO SISTEMA:\n` +
            `- A tentativa de registrar o agendamento em "${scheduledAt}" (${procedure}) FALHOU por conflito na grade (${conflictReason}).\n` +
            `- NÃO diga que o horário foi agendado ou reservado.\n` +
            `- NÃO inclua a tag <<<AGENDAR>>> nem <<<CONFIRMAR>>> nesta resposta.\n` +
            `- Peça desculpas com naturalidade, avise que esse horário acabou de ser preenchido e sugira opções livres respeitando a grade atualizada acima.`;

          correctedReply = await askClaude(env, retrySystemPrompt, freshHistory);
          if (correctedReply) {
            correctedReply = correctedReply
              .replace(agendarRegex, "")
              .replace(confirmarRegex, "")
              .trim();
          }
        } catch (retryErr) {
          console.warn("Aviso: falha ao regenerar resposta de conflito via Claude, usando fallback padrão:", String(retryErr));
        }
      }

      reply = correctedReply || fallbackConflictMsg;
    }
  }

  // 2. Processa confirmação de consulta pelo paciente via IA
  const matchConfirmar = /<<<CONFIRMAR:\s*({[\s\S]*?})\s*>>>/i.exec(reply);
  if (matchConfirmar) {
    try {
      const confirmed = await confirmUpcomingAppointmentForContact(env.DB, tenant.id, job.from);
      if (confirmed) {
        console.log(`[CONFIRMACAO_IA] Consulta confirmada com sucesso para contato ${job.from}`);
      } else {
        console.warn(`[CONFIRMACAO_IA] Nenhum agendamento pendente encontrado para confirmar (contato=${job.from}, tenant=${tenant.id})`);
      }
    } catch (e) {
      console.error("Erro ao processar tag <<<CONFIRMAR>>>:", e);
    }
    reply = reply.replace(confirmarRegex, "").trim();
  }

  reply = reply.slice(0, 4000);

  let sentId: string | null = null;
  try {
    sentId = await sendText(env, tenant.phone_number_id, token, job.from, reply);
  } catch (err) {
    console.warn("Aviso: WhatsApp não entregou (ex: restrição geográfica ou token/janela Meta):", String(err));
  }

  await saveOutbound(env.DB, tenant.id, job.from, reply, sentId);
  await markAnswered(env.DB, job.waMessageId);
}
