// Ponto de entrada do Cloudflare Worker.
// Portas de entrada:
//   fetch     -> Landing Page (/), Login (/login), Painel (/inbox), Webhooks da Meta e APIs REST autenticadas
//   queue     -> Processa cada mensagem recebida (busca clínica, checa pausa da IA, chama Claude, responde no WhatsApp)
//   scheduled -> Cron diário (23:00 UTC / 20h Brasília) para confirmações de véspera multi-tenant
import type { BotConfig, Env, InboundJob, ProfessionalRecord } from "./types";
import { arrayBufferToBase64, downloadWhatsAppMedia, extractJobs, sendText, verifySignature } from "./whatsapp";
import { askClaude, type ImageAttachment } from "./claude";
import { buildSystemPromptParts } from "./prompt";
import {
  claimInbound,
  getInboundMessageByWaId,
  updateInboundMessageMediaAndBody,
  getMessageMediaForTenant,
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
  getAppointmentById,
  checkAppointmentConflict,
  createAppointment,
  updateAppointmentDetails,
  getUpcomingAppointments,
  confirmUpcomingAppointmentForContact,
  deleteAppointment,
  listProfessionals,
  getProfessionalById,
  createProfessional,
  updateProfessional,
  deleteProfessional,
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

const MSG_MIDIA_NAO_SUPORTADA = "Por enquanto consigo atender por texto, áudio ou foto. Pode escrever ou enviar um áudio com sua dúvida? 😊";
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
    // APIS DE PROFISSIONAIS (DENTISTAS / ESTETICISTAS DA CLÍNICA LOGADA)
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/professionals") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;
      const tenantId = auth.session.tenantId;

      if (request.method === "GET") {
        const activeOnly = url.searchParams.get("active_only") === "1";
        const professionals = await listProfessionals(env.DB, tenantId, activeOnly);
        return jsonResponse({ professionals });
      }

      if (request.method === "POST") {
        try {
          const body = (await request.json()) as {
            name?: string;
            specialty?: string;
            croCrm?: string;
            workingDays?: number[];
            startHour?: string;
            endHour?: string;
            breakStart?: string | null;
            breakEnd?: string | null;
            procedures?: string[];
            color?: string;
            active?: boolean;
          };

          const name = body.name?.trim();
          if (!name) {
            return jsonResponse({ error: "Nome do profissional é obrigatório." }, 400);
          }

          const startHour = body.startHour?.trim() || "08:00";
          const endHour = body.endHour?.trim() || "18:00";
          if (!/^\d{2}:\d{2}$/.test(startHour) || !/^\d{2}:\d{2}$/.test(endHour) || startHour >= endHour) {
            return jsonResponse({ error: "Horário de expediente inválido (início deve ser menor que fim)." }, 400);
          }

          const breakStart = body.breakStart?.trim() || null;
          const breakEnd = body.breakEnd?.trim() || null;
          if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) {
            return jsonResponse({ error: "Informe início e fim do intervalo de almoço ou deixe ambos vazios." }, 400);
          }
          if (breakStart && breakEnd && (!/^\d{2}:\d{2}$/.test(breakStart) || !/^\d{2}:\d{2}$/.test(breakEnd) || breakStart >= breakEnd)) {
            return jsonResponse({ error: "Horário de intervalo inválido." }, 400);
          }

          const workingDays = Array.isArray(body.workingDays)
            ? body.workingDays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
            : [1, 2, 3, 4, 5];
          if (workingDays.length === 0) {
            return jsonResponse({ error: "Selecione pelo menos 1 dia de atendimento." }, 400);
          }

          const id = await createProfessional(env.DB, tenantId, {
            name,
            specialty: body.specialty,
            croCrm: body.croCrm,
            workingDays,
            startHour,
            endHour,
            breakStart,
            breakEnd,
            procedures: Array.isArray(body.procedures) ? body.procedures : [],
            color: body.color,
            active: body.active,
          });
          return jsonResponse({ success: true, id });
        } catch (err) {
          console.error("Erro em POST /api/professionals:", String(err));
          return jsonResponse({ error: "Erro ao cadastrar profissional." }, 500);
        }
      }

      if (request.method === "PATCH") {
        try {
          const body = (await request.json()) as {
            id?: number;
            name?: string;
            specialty?: string | null;
            croCrm?: string | null;
            workingDays?: number[];
            startHour?: string;
            endHour?: string;
            breakStart?: string | null;
            breakEnd?: string | null;
            procedures?: string[];
            color?: string;
            active?: boolean;
          };
          if (!body.id) {
            return jsonResponse({ error: "id obrigatório" }, 400);
          }

          if (body.startHour && body.endHour && body.startHour >= body.endHour) {
            return jsonResponse({ error: "Horário de início deve ser menor que fim." }, 400);
          }
          if (body.breakStart && body.breakEnd && body.breakStart >= body.breakEnd) {
            return jsonResponse({ error: "Intervalo inválido." }, 400);
          }
          if (Array.isArray(body.workingDays) && body.workingDays.length === 0) {
            return jsonResponse({ error: "Selecione pelo menos 1 dia de atendimento." }, 400);
          }

          const updated = await updateProfessional(env.DB, tenantId, body.id, body);
          if (!updated) {
            return jsonResponse({ error: "Profissional não encontrado." }, 404);
          }
          return jsonResponse({ success: true });
        } catch (err) {
          console.error("Erro em PATCH /api/professionals:", String(err));
          return jsonResponse({ error: "Erro ao atualizar profissional." }, 500);
        }
      }

      if (request.method === "DELETE") {
        try {
          const body = (await request.json().catch(() => ({}))) as { id?: number };
          const id = body.id || parseInt(url.searchParams.get("id") || "0", 10);
          if (!id) {
            return jsonResponse({ error: "id obrigatório" }, 400);
          }
          await deleteProfessional(env.DB, tenantId, id);
          return jsonResponse({ success: true });
        } catch (err) {
          console.error("Erro em DELETE /api/professionals:", String(err));
          return jsonResponse({ error: "Erro ao excluir profissional." }, 500);
        }
      }

      return jsonResponse({ error: "Método não permitido" }, 405);
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
            professionalId?: number | string | null;
            professional_id?: number | string | null;
          };

          const pName = body.patientName || body.patient_name || body.name || "Paciente sem nome";
          const pPhone = body.contactWaId || body.contact_wa_id || body.phone || "";
          const pProc = body.procedure || "Avaliação Geral";
          const pSched = body.scheduledAt || body.scheduled_at || "A combinar";
          const pStatus = body.status || "pre_agendado";
          const pNotes = body.notes || "";
          const pDuration = body.duration || "30 min";

          const rawProfId = body.professionalId ?? body.professional_id;
          let profId: number | null = null;
          let profName: string | null = null;
          if (rawProfId !== null && rawProfId !== undefined && String(rawProfId).trim() !== "") {
            const parsedId = Number(rawProfId);
            if (!Number.isInteger(parsedId) || parsedId <= 0) {
              return jsonResponse({ error: "Profissional inválido." }, 400);
            }
            const prof = await getProfessionalById(env.DB, tenantId, parsedId);
            if (!prof) {
              return jsonResponse({ error: "Profissional não encontrado para esta clínica." }, 404);
            }
            profId = prof.id;
            profName = prof.name;
          }

          const res = await createAppointment(
            env.DB,
            tenantId,
            pPhone,
            pName,
            pProc,
            pSched,
            pStatus,
            pNotes,
            pDuration,
            profId,
            profName
          );

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
            professionalId?: number | string | null;
          };
          if (!body.id) {
            return jsonResponse({ error: "id obrigatório" }, 400);
          }

          const existing = await getAppointmentById(env.DB, tenantId, body.id);
          if (!existing) {
            return jsonResponse({ error: "Agendamento não encontrado." }, 404);
          }

          let nextProfId: number | null | undefined = undefined;
          let nextProfName: string | null | undefined = undefined;
          if (typeof body.professionalId !== "undefined") {
            if (body.professionalId === null || String(body.professionalId).trim() === "") {
              nextProfId = null;
              nextProfName = null;
            } else {
              const parsedId = Number(body.professionalId);
              if (!Number.isInteger(parsedId) || parsedId <= 0) {
                return jsonResponse({ error: "Profissional inválido." }, 400);
              }
              const prof = await getProfessionalById(env.DB, tenantId, parsedId);
              if (!prof) {
                return jsonResponse({ error: "Profissional não encontrado para esta clínica." }, 404);
              }
              nextProfId = prof.id;
              nextProfName = prof.name;
            }
          }

          const targetStatus = body.status ?? existing.status;
          const targetSched = body.scheduledAt ?? existing.scheduled_at;
          const targetDur = body.duration ?? existing.duration;
          const targetProfId = typeof nextProfId !== "undefined" ? nextProfId : (existing.professional_id ?? null);

          if (
            targetStatus !== "cancelado" &&
            (typeof body.scheduledAt !== "undefined" ||
              typeof body.duration !== "undefined" ||
              typeof body.professionalId !== "undefined" ||
              (existing.status === "cancelado" && targetStatus !== "cancelado"))
          ) {
            const conflictCheck = await checkAppointmentConflict(env.DB, tenantId, targetSched, targetDur, body.id, targetProfId);
            if (conflictCheck.conflict) {
              const msg =
                conflictCheck.reason ||
                (conflictCheck.conflictWith
                  ? `Conflito de horário com ${conflictCheck.conflictWith.patient_name} em ${conflictCheck.conflictWith.scheduled_at}.`
                  : "Conflito de horário na grade.");
              return jsonResponse({ error: msg, conflict: true }, 409);
            }
          }

          await updateAppointmentDetails(env.DB, tenantId, body.id, {
            status: body.status,
            notes: body.notes,
            procedure: body.procedure,
            scheduledAt: body.scheduledAt,
            duration: body.duration,
            professionalId: nextProfId,
            professionalName: nextProfName,
          });
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
        const mediaKeys = await clearConversation(env.DB, auth.session.tenantId, body.phone);
        if (env.MEDIA_BUCKET && mediaKeys.length > 0) {
          await Promise.allSettled(mediaKeys.map((k) => env.MEDIA_BUCKET!.delete(k)));
        }
        return jsonResponse({ status: "cleared" });
      } catch (err) {
        console.error("Erro em /api/clear-chat:", String(err));
        return jsonResponse({ error: "Erro ao limpar conversa." }, 500);
      }
    }

    // Entrega segura e isolada por clínica de fotos/áudios armazenados no R2 (com suporte a Range e download)
    if (url.pathname === "/api/media" && request.method === "GET") {
      const auth = await requireSession(request, env);
      if ("response" in auth) return auth.response;

      const msgId = parseInt(url.searchParams.get("msg_id") || "0", 10);
      if (!msgId) {
        return jsonResponse({ error: "msg_id obrigatório" }, 400);
      }

      const record = await getMessageMediaForTenant(env.DB, auth.session.tenantId, msgId);
      if (!record || !record.media_key) {
        return jsonResponse({ error: "Mídia não encontrada." }, 404);
      }
      if (!env.MEDIA_BUCKET) {
        return jsonResponse({ error: "Armazenamento de mídia (R2) indisponível." }, 503);
      }

      const rangeHeader = request.headers.get("range");
      const obj = await env.MEDIA_BUCKET.get(
        record.media_key,
        rangeHeader ? { range: request.headers } : undefined
      );
      if (!obj) {
        return jsonResponse({ error: "Mídia expirada (retenção de 30 dias)." }, 410);
      }

      const contentType = record.media_mime || obj.httpMetadata?.contentType || "application/octet-stream";
      const ext = mimeToExtension(contentType);
      const isDownload = url.searchParams.get("download") === "1";

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "private, max-age=3600");
      headers.set("X-Content-Type-Options", "nosniff");
      if (isDownload) {
        headers.set("Content-Disposition", `attachment; filename="aura-midia-${msgId}.${ext}"`);
      }

      const rangeInfo = obj.range as { offset?: number; length?: number } | undefined;
      if (rangeHeader && rangeInfo && typeof rangeInfo.offset === "number" && typeof rangeInfo.length === "number") {
        const start = rangeInfo.offset;
        const end = start + rangeInfo.length - 1;
        headers.set("Content-Range", `bytes ${start}-${end}/${obj.size}`);
        headers.set("Content-Length", String(rangeInfo.length));
        return new Response(obj.body, { status: 206, headers });
      }

      headers.set("Content-Length", String(obj.size));
      return new Response(obj.body, { status: 200, headers });
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

function mimeToExtension(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "audio/wav": "wav",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[base] || "bin";
}

async function processJob(job: InboundJob, env: Env): Promise<void> {
  const tenant = await getTenantByPhoneNumberId(env.DB, job.phoneNumberId);
  if (!tenant || !tenant.active || !isConfiguredPhoneNumberId(tenant.phone_number_id)) {
    console.warn("número sem clínica ativa:", job.phoneNumberId);
    return;
  }

  const state = await claimInbound(env.DB, tenant.id, job);
  if (state === "done") return;

  const token = await resolveTenantAccessToken(tenant, env);

  const isAudioJob = job.type === "audio" || job.type === "voice";
  const isImageJob = job.type === "image";

  let imageAttachment: ImageAttachment | null = null;
  let audioTranscriptReady = false;

  if ((isAudioJob || isImageJob) && job.mediaId) {
    const existing = state === "retry" ? await getInboundMessageByWaId(env.DB, job.waMessageId) : null;

    if (existing?.media_key) {
      // Retry: reaproveita mídia já salva no R2 e transcrição já gravada no D1
      if (isAudioJob) {
        audioTranscriptReady = Boolean(existing.body && existing.body.startsWith("[Áudio transcrito]:"));
      } else if (isImageJob && env.MEDIA_BUCKET) {
        try {
          const obj = await env.MEDIA_BUCKET.get(existing.media_key);
          if (obj) {
            const bytes = await obj.arrayBuffer();
            imageAttachment = {
              mimeType: existing.media_mime || job.mimeType || "image/jpeg",
              base64Data: arrayBufferToBase64(bytes),
            };
          }
        } catch (err) {
          console.warn("Aviso ao reler imagem do R2 em retry:", String(err));
        }
      }
    } else if (token) {
      try {
        const maxBytes = isImageJob ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
        const media = await downloadWhatsAppMedia(env, token, job.mediaId, maxBytes);
        const ext = mimeToExtension(media.mimeType);
        const yyyyMm = new Date().toISOString().slice(0, 7);
        const r2Key = `tenants/${tenant.id}/${yyyyMm}/${crypto.randomUUID()}.${ext}`;

        let savedMediaKey: string | null = null;
        if (env.MEDIA_BUCKET) {
          await env.MEDIA_BUCKET.put(r2Key, media.bytes, {
            httpMetadata: { contentType: media.mimeType },
          });
          savedMediaKey = r2Key;
        }

        if (isAudioJob) {
          let transcript = "";
          if (env.AI) {
            try {
              const aiRes = (await env.AI.run("@cf/openai/whisper-large-v3-turbo", {
                audio: arrayBufferToBase64(media.bytes),
                language: "pt",
                vad_filter: true,
              })) as { text?: string };
              transcript = aiRes?.text?.trim() || "";
            } catch (aiErr) {
              console.warn(`[WHISPER_ERR] Falha ao transcrever áudio (tenant=${tenant.id}):`, String(aiErr));
            }
          }
          audioTranscriptReady = Boolean(transcript);
          const storedBody = transcript ? `[Áudio transcrito]: ${transcript}` : "[Mensagem de áudio recebida]";
          await updateInboundMessageMediaAndBody(env.DB, job.waMessageId, storedBody, savedMediaKey, media.mimeType, "audio");
        } else if (isImageJob) {
          imageAttachment = {
            mimeType: media.mimeType,
            base64Data: arrayBufferToBase64(media.bytes),
          };
          const storedBody = job.text?.trim() ? job.text.trim() : "[Imagem enviada pelo paciente]";
          await updateInboundMessageMediaAndBody(env.DB, job.waMessageId, storedBody, savedMediaKey, media.mimeType, "image");
        }
      } catch (mediaErr) {
        console.warn(`[MEDIA_ERR] Erro ao processar mídia (${job.type}, tenant=${tenant.id}):`, String(mediaErr));
      }
    }
  }

  // VERIFICAÇÃO DE INTERVENÇÃO HUMANA:
  // Áudios já foram transcritos e fotos já foram salvas no R2 acima para que a recepcionista veja no painel.
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

  if (!token) {
    throw new Error(`Token WhatsApp não configurado para a clínica ${tenant.id}`);
  }

  let reply: string;
  let freshHistory: { role: "user" | "assistant"; content: string }[] = [];
  let activeProfessionals: ProfessionalRecord[] = [];
  const hasUsableContent =
    (job.type === "text" && Boolean(job.text?.trim())) ||
    (isAudioJob && audioTranscriptReady) ||
    (isImageJob && Boolean(imageAttachment));

  if (!hasUsableContent) {
    reply = MSG_MIDIA_NAO_SUPORTADA;
  } else {
    const cfg = parsedCfg as BotConfig;
    freshHistory = await loadHistory(env.DB, tenant.id, job.from);

    // Obtém data/hora atual no fuso oficial de Brasília
    const nowBrasiliaStr = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    // Obtém profissionais ativos e agendamentos futuros para a IA respeitar a grade por profissional
    const [upcoming, profs] = await Promise.all([
      getUpcomingAppointments(env.DB, tenant.id),
      listProfessionals(env.DB, tenant.id, true),
    ]);
    activeProfessionals = profs;

    const existingAppointments = upcoming.map((a) => ({
      scheduled_at: a.scheduled_at,
      procedure: a.procedure || "Consulta",
      duration: a.duration || "30 min",
      professional_id: a.professional_id ?? null,
      professional_name: a.professional_name ?? null,
    }));

    const systemParts = buildSystemPromptParts(cfg, {
      nowBrasiliaStr,
      existingAppointments,
      professionals: activeProfessionals,
    });

    reply = (await askClaude(env, systemParts, freshHistory, imageAttachment)) ?? MSG_FALHA_IA;
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

      let matchedProf: ProfessionalRecord | undefined;
      if (activeProfessionals.length > 0) {
        if (data.professional_id) {
          matchedProf = activeProfessionals.find((p) => p.id === Number(data.professional_id));
        }
        if (!matchedProf && data.professional_name) {
          const targetName = String(data.professional_name).toLowerCase().trim();
          matchedProf = activeProfessionals.find(
            (p) => p.name.toLowerCase().includes(targetName) || targetName.includes(p.name.toLowerCase())
          );
        }
        if (!matchedProf && activeProfessionals.length === 1) {
          matchedProf = activeProfessionals[0];
        }
      }

      const res = await createAppointment(
        env.DB,
        tenant.id,
        job.from,
        patientName,
        procedure,
        scheduledAt,
        "agendado",
        notes,
        duration,
        matchedProf?.id ?? null,
        matchedProf?.name ?? null
      );
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

      if (hasUsableContent && parsedCfg && freshHistory.length > 0) {
        try {
          const latestUpcoming = await getUpcomingAppointments(env.DB, tenant.id);
          const nowBrasiliaStr = new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date());

          const retryParts = buildSystemPromptParts(parsedCfg, {
            nowBrasiliaStr,
            existingAppointments: latestUpcoming.map((a) => ({
              scheduled_at: a.scheduled_at,
              procedure: a.procedure || "Consulta",
              duration: a.duration || "30 min",
              professional_id: a.professional_id ?? null,
              professional_name: a.professional_name ?? null,
            })),
            professionals: activeProfessionals,
          });
          retryParts.dynamicContext +=
            `\n\nATENÇÃO CRÍTICA DO SISTEMA:\n` +
            `- A tentativa de registrar o agendamento em "${scheduledAt}" (${procedure}) FALHOU por conflito na grade (${conflictReason}).\n` +
            `- NÃO diga que o horário foi agendado ou reservado.\n` +
            `- NÃO inclua a tag <<<AGENDAR>>> nem <<<CONFIRMAR>>> nesta resposta.\n` +
            `- Peça desculpas com naturalidade, avise que esse horário acabou de ser preenchido e sugira opções livres respeitando a grade atualizada acima.`;

          correctedReply = await askClaude(env, retryParts, freshHistory);
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
