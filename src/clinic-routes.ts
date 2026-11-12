import type { ClinicWhatsAppStatus, Env, Tenant } from "./types";
import { jsonResponse } from "./http";
import {
  encryptTenantTokenForEnv,
  getPrimaryMetaAppSecret,
  getSessionFromRequest,
  hashPassword,
  isClinicAdminRole,
  isEncryptedTenantToken,
  makeLogoutCookie,
  resolveTenantAccessToken,
  verifyPassword,
} from "./auth";
import {
  countActiveClinicAdmins,
  createClinicUser,
  deleteClinicUser,
  disconnectTenantWhatsApp,
  getClinicUserById,
  getTenantById,
  getUserById,
  isConfiguredPhoneNumberId,
  isPhoneNumberIdTakenByOtherTenant,
  listClinicUsers,
  updateClinicProfile,
  updateClinicUser,
  updateOwnPassword,
  updateTenantWhatsAppConnection,
  type UserRecord,
} from "./db";
import {
  exchangeMetaOAuthCode,
  fetchMetaPhoneNumberInfo,
  getWabaSubscribedApps,
  inspectMetaDebugTokenWabaId,
  listWabaPhoneNumbers,
  registerWhatsAppPhoneNumber,
  subscribeAppToWaba,
} from "./whatsapp";

interface ActiveClinicAuth {
  dbUser: UserRecord;
  canManageClinic: boolean;
}

async function requireActiveClinicUser(
  request: Request,
  env: Env,
  adminOnly: boolean,
  isSecure: boolean
): Promise<{ auth: ActiveClinicAuth } | { response: Response }> {
  const session = await getSessionFromRequest(request, env.AUTH_SECRET);
  if (!session) {
    return { response: jsonResponse({ error: "Não autenticado" }, 401) };
  }

  const dbUser = await getUserById(env.DB, session.userId);
  if (!dbUser || dbUser.active === 0 || dbUser.tenant_id !== session.tenantId) {
    return {
      response: jsonResponse(
        { error: "Sessão encerrada ou usuário pausado pelo administrador." },
        401,
        { "Set-Cookie": makeLogoutCookie(isSecure) }
      ),
    };
  }

  const canManageClinic = isClinicAdminRole(dbUser.email, dbUser.role, env);
  if (adminOnly && !canManageClinic) {
    return {
      response: jsonResponse(
        { error: "Apenas administradores da clínica podem alterar esta configuração." },
        403
      ),
    };
  }

  return { auth: { dbUser, canManageClinic } };
}

export function buildClinicWhatsAppStatus(
  tenant: Tenant,
  env: Env,
  origin: string
): ClinicWhatsAppStatus {
  const configured = isConfiguredPhoneNumberId(tenant.phone_number_id);
  const rawToken = tenant.access_token_enc?.trim();
  const hasCustomToken = Boolean(rawToken);

  let tokenSource: ClinicWhatsAppStatus["token_source"] = "none";
  if (hasCustomToken) {
    tokenSource = isEncryptedTenantToken(rawToken) ? "custom_encrypted" : "custom_plain";
  } else if (env.WA_LAB_TOKEN?.trim()) {
    tokenSource = "lab_fallback";
  }

  const appId = env.META_APP_ID?.trim() || null;
  const configId = env.META_EMBEDDED_CONFIG_ID?.trim() || null;
  const appSecret = getPrimaryMetaAppSecret(env);

  const missingEnv: string[] = [];
  if (!appId) missingEnv.push("META_APP_ID");
  if (!configId) missingEnv.push("META_EMBEDDED_CONFIG_ID");
  if (!appSecret) missingEnv.push("META_APP_SECRET / META_APP_SECRETS");

  return {
    configured,
    phone_number_id: configured ? tenant.phone_number_id : null,
    raw_phone_number_id: tenant.phone_number_id,
    waba_id: tenant.waba_id || null,
    has_custom_token: hasCustomToken,
    token_source: tokenSource,
    display_phone_number: tenant.wa_display_phone || null,
    verified_name: tenant.wa_verified_name || null,
    connected_at: tenant.wa_connected_at || null,
    webhook_url: `${origin}/webhook`,
    verify_token_configured: Boolean(env.WA_VERIFY_TOKEN?.trim()),
    app_secrets_configured: Boolean(env.META_APP_SECRETS?.trim()),
    embedded_signup: {
      enabled: missingEnv.length === 0,
      app_id: appId,
      config_id: configId,
      graph_version: env.GRAPH_VERSION || "v26.0",
      missing_env: missingEnv,
    },
  };
}

function serializeClinicSummary(tenant: Tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    legal_name: tenant.legal_name ?? null,
    cnpj: tenant.cnpj ?? null,
    admin_phone: tenant.admin_phone ?? null,
    responsible_name: tenant.responsible_name ?? null,
    contact_email: tenant.contact_email ?? null,
    active: tenant.active === 1,
    created_at: tenant.created_at ?? null,
  };
}

export async function handleClinicRoutes(
  request: Request,
  env: Env,
  url: URL,
  isSecure: boolean
): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/clinic/")) {
    return null;
  }

  // 1) DADOS CADASTRAIS & PERFIL DA CLÍNICA
  if (url.pathname === "/api/clinic/profile") {
    if (request.method === "GET") {
      const check = await requireActiveClinicUser(request, env, false, isSecure);
      if ("response" in check) return check.response;
      const { dbUser, canManageClinic } = check.auth;

      const tenant = await getTenantById(env.DB, dbUser.tenant_id);
      if (!tenant) {
        return jsonResponse({ error: "Clínica não encontrada." }, 404);
      }

      return jsonResponse({
        clinic: serializeClinicSummary(tenant),
        whatsapp: buildClinicWhatsAppStatus(tenant, env, url.origin),
        canManageClinic,
      });
    }

    if (request.method === "PATCH") {
      const check = await requireActiveClinicUser(request, env, true, isSecure);
      if ("response" in check) return check.response;
      const { dbUser } = check.auth;

      try {
        const body = (await request.json()) as {
          name?: string;
          legal_name?: string | null;
          cnpj?: string | null;
          admin_phone?: string | null;
          responsible_name?: string | null;
          contact_email?: string | null;
        };

        if (typeof body.name === "string") {
          const cleanName = body.name.trim();
          if (!cleanName) {
            return jsonResponse({ error: "O nome da clínica não pode ficar vazio." }, 400);
          }
          if (cleanName.length > 120) {
            return jsonResponse({ error: "Nome da clínica muito longo (máx. 120 caracteres)." }, 400);
          }
        }

        if (typeof body.contact_email === "string" && body.contact_email.trim()) {
          const em = body.contact_email.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
            return jsonResponse({ error: "E-mail administrativo inválido." }, 400);
          }
        }

        const updated = await updateClinicProfile(env.DB, dbUser.tenant_id, {
          name: body.name,
          legalName: body.legal_name,
          cnpj: body.cnpj,
          adminPhone: body.admin_phone,
          responsibleName: body.responsible_name,
          contactEmail: body.contact_email,
        });

        if (!updated) {
          return jsonResponse({ error: "Clínica não encontrada ou sem alterações." }, 404);
        }

        const tenant = await getTenantById(env.DB, dbUser.tenant_id);
        return jsonResponse({
          success: true,
          clinic: tenant ? serializeClinicSummary(tenant) : null,
        });
      } catch (err) {
        console.error("Erro em PATCH /api/clinic/profile:", String(err));
        return jsonResponse({ error: "Erro ao atualizar dados cadastrais da clínica." }, 500);
      }
    }

    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  // 2) ALTERAR PRÓPRIA SENHA (PBKDF2)
  if (url.pathname === "/api/clinic/password" && request.method === "POST") {
    const check = await requireActiveClinicUser(request, env, false, isSecure);
    if ("response" in check) return check.response;
    const { dbUser } = check.auth;

    try {
      const body = (await request.json()) as {
        currentPassword?: string;
        newPassword?: string;
      };
      const currentPassword = body.currentPassword ?? "";
      const newPassword = body.newPassword ?? "";

      if (!currentPassword || !newPassword) {
        return jsonResponse({ error: "Informe a senha atual e a nova senha." }, 400);
      }
      if (newPassword.length < 6 || newPassword.length > 128) {
        return jsonResponse({ error: "A nova senha deve ter entre 6 e 128 caracteres." }, 400);
      }

      const validCurrent = await verifyPassword(currentPassword, dbUser.password_hash);
      if (!validCurrent) {
        return jsonResponse({ error: "Senha atual incorreta." }, 400);
      }

      const newHash = await hashPassword(newPassword);
      const ok = await updateOwnPassword(env.DB, dbUser.tenant_id, dbUser.id, newHash);
      if (!ok) {
        return jsonResponse({ error: "Não foi possível atualizar a senha." }, 500);
      }

      return jsonResponse({ success: true });
    } catch (err) {
      console.error("Erro em POST /api/clinic/password:", String(err));
      return jsonResponse({ error: "Erro ao alterar senha." }, 500);
    }
  }

  // 3) GESTÃO DE USUÁRIOS DA CLÍNICA (ESTRITO AO session.tenantId)
  if (url.pathname === "/api/clinic/users") {
    if (request.method === "GET") {
      const check = await requireActiveClinicUser(request, env, false, isSecure);
      if ("response" in check) return check.response;
      const { dbUser, canManageClinic } = check.auth;

      const users = await listClinicUsers(env.DB, dbUser.tenant_id);
      return jsonResponse({ users, currentUserId: dbUser.id, canManageClinic });
    }

    if (request.method === "POST") {
      const check = await requireActiveClinicUser(request, env, true, isSecure);
      if ("response" in check) return check.response;
      const { dbUser } = check.auth;

      try {
        const body = (await request.json()) as {
          name?: string;
          email?: string;
          password?: string;
          role?: string;
        };

        const name = body.name?.trim() || "";
        const email = body.email?.trim().toLowerCase() || "";
        const password = body.password || "";
        const role: "admin" | "staff" = body.role === "admin" ? "admin" : "staff";

        if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return jsonResponse({ error: "Nome e e-mail válido são obrigatórios." }, 400);
        }
        if (password.length < 6 || password.length > 128) {
          return jsonResponse({ error: "A senha deve ter entre 6 e 128 caracteres." }, 400);
        }

        const id = await createClinicUser(env.DB, {
          tenantId: dbUser.tenant_id,
          name,
          email,
          passwordHash: await hashPassword(password),
          role,
        });

        return jsonResponse({ success: true, id });
      } catch (err) {
        const msg = String(err);
        if (msg.includes("UNIQUE")) {
          return jsonResponse({ error: "Já existe um usuário cadastrado com este e-mail." }, 409);
        }
        console.error("Erro em POST /api/clinic/users:", msg);
        return jsonResponse({ error: "Erro ao criar usuário da clínica." }, 500);
      }
    }

    if (request.method === "PATCH") {
      const check = await requireActiveClinicUser(request, env, true, isSecure);
      if ("response" in check) return check.response;
      const { dbUser } = check.auth;

      try {
        const body = (await request.json()) as {
          id?: number;
          name?: string;
          role?: string;
          active?: boolean;
          newPassword?: string;
        };

        const targetId = Number(body.id);
        if (!Number.isInteger(targetId) || targetId <= 0) {
          return jsonResponse({ error: "id de usuário inválido." }, 400);
        }

        const target = await getClinicUserById(env.DB, dbUser.tenant_id, targetId);
        if (!target) {
          return jsonResponse({ error: "Usuário não encontrado nesta clínica." }, 404);
        }
        if (target.role === "superadmin") {
          return jsonResponse({ error: "Conta Super Admin não pode ser modificada aqui." }, 403);
        }

        const nextRole: "admin" | "staff" | undefined =
          body.role === "admin" ? "admin" : body.role === "staff" ? "staff" : undefined;

        if (target.id === dbUser.id && body.active === false) {
          return jsonResponse({ error: "Você não pode pausar sua própria conta." }, 400);
        }
        if (target.id === dbUser.id && nextRole === "staff" && target.role === "admin") {
          return jsonResponse({ error: "Você não pode remover seu próprio cargo de administrador." }, 400);
        }

        const willDeactivateAdmin =
          target.role === "admin" &&
          target.active === 1 &&
          (body.active === false || nextRole === "staff");

        if (willDeactivateAdmin) {
          const activeAdmins = await countActiveClinicAdmins(env.DB, dbUser.tenant_id);
          if (activeAdmins <= 1) {
            return jsonResponse({ error: "A clínica precisa manter pelo menos 1 administrador ativo." }, 400);
          }
        }

        let passwordHash: string | undefined;
        if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
          if (body.newPassword.length < 6 || body.newPassword.length > 128) {
            return jsonResponse({ error: "A nova senha deve ter entre 6 e 128 caracteres." }, 400);
          }
          passwordHash = await hashPassword(body.newPassword);
        }

        if (typeof body.name === "string" && !body.name.trim()) {
          return jsonResponse({ error: "O nome do usuário não pode ficar vazio." }, 400);
        }

        const ok = await updateClinicUser(env.DB, dbUser.tenant_id, targetId, {
          name: body.name,
          role: nextRole,
          active: typeof body.active === "boolean" ? body.active : undefined,
          passwordHash,
        });

        if (!ok) {
          return jsonResponse({ error: "Nenhuma alteração aplicada." }, 400);
        }

        return jsonResponse({ success: true });
      } catch (err) {
        console.error("Erro em PATCH /api/clinic/users:", String(err));
        return jsonResponse({ error: "Erro ao atualizar usuário." }, 500);
      }
    }

    if (request.method === "DELETE") {
      const check = await requireActiveClinicUser(request, env, true, isSecure);
      if ("response" in check) return check.response;
      const { dbUser } = check.auth;

      try {
        const body = (await request.json().catch(() => ({}))) as { id?: number };
        const targetId = Number(body.id || url.searchParams.get("id") || 0);
        if (!Number.isInteger(targetId) || targetId <= 0) {
          return jsonResponse({ error: "id de usuário inválido." }, 400);
        }

        const target = await getClinicUserById(env.DB, dbUser.tenant_id, targetId);
        if (!target) {
          return jsonResponse({ error: "Usuário não encontrado nesta clínica." }, 404);
        }
        if (target.role === "superadmin") {
          return jsonResponse({ error: "Conta Super Admin não pode ser removida." }, 403);
        }
        if (target.id === dbUser.id) {
          return jsonResponse({ error: "Você não pode remover sua própria conta." }, 400);
        }

        if (target.role === "admin" && target.active === 1) {
          const activeAdmins = await countActiveClinicAdmins(env.DB, dbUser.tenant_id);
          if (activeAdmins <= 1) {
            return jsonResponse({ error: "Não é possível remover o último administrador ativo da clínica." }, 400);
          }
        }

        await deleteClinicUser(env.DB, dbUser.tenant_id, targetId);
        return jsonResponse({ success: true });
      } catch (err) {
        console.error("Erro em DELETE /api/clinic/users:", String(err));
        return jsonResponse({ error: "Erro ao remover usuário." }, 500);
      }
    }

    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  // 4) STATUS DA CONEXÃO WHATSAPP DA CLÍNICA
  if (url.pathname === "/api/clinic/whatsapp/status" && request.method === "GET") {
    const check = await requireActiveClinicUser(request, env, false, isSecure);
    if ("response" in check) return check.response;
    const { dbUser, canManageClinic } = check.auth;

    const tenant = await getTenantById(env.DB, dbUser.tenant_id);
    if (!tenant) {
      return jsonResponse({ error: "Clínica não encontrada." }, 404);
    }

    return jsonResponse({
      whatsapp: buildClinicWhatsAppStatus(tenant, env, url.origin),
      canManageClinic,
    });
  }

  // 5) META EMBEDDED SIGNUP (TROCA OAUTH CODE + WABA + PHONE + AES-256-GCM + WEBHOOK)
  if (url.pathname === "/api/clinic/whatsapp/embedded-signup" && request.method === "POST") {
    const check = await requireActiveClinicUser(request, env, true, isSecure);
    if ("response" in check) return check.response;
    const { dbUser } = check.auth;
    const tenantId = dbUser.tenant_id;

    try {
      const body = (await request.json()) as {
        code?: string;
        waba_id?: string | null;
        phone_number_id?: string | null;
        pin?: string | null;
      };

      const code = body.code?.trim();
      if (!code) {
        return jsonResponse({ error: "Código OAuth (code) da Meta é obrigatório." }, 400);
      }

      const appId = env.META_APP_ID?.trim();
      const appSecret = getPrimaryMetaAppSecret(env);
      if (!appId || !appSecret) {
        return jsonResponse(
          {
            error:
              "Meta Embedded Signup não configurado no servidor (defina META_APP_ID, META_EMBEDDED_CONFIG_ID e META_APP_SECRETS).",
          },
          503
        );
      }

      const pin = body.pin?.trim() || "";
      if (pin && !/^\d{6}$/.test(pin)) {
        return jsonResponse({ error: "O PIN de registro da Cloud API deve ter exatamente 6 dígitos numéricos." }, 400);
      }

      // 1. Troca authorization code por access_token
      const accessToken = await exchangeMetaOAuthCode(env, appId, appSecret, code);

      // 2. Resolve WABA ID (recebido via postMessage WA_EMBEDDED_SIGNUP ou via /debug_token)
      let wabaId = body.waba_id?.trim() || "";
      if (!wabaId) {
        wabaId = (await inspectMetaDebugTokenWabaId(env, appId, appSecret, accessToken)) || "";
      }
      if (!wabaId) {
        return jsonResponse(
          {
            error:
              "Não foi possível identificar o WABA ID (WhatsApp Business Account) nesta autorização. Refaça o fluxo selecionando a conta do WhatsApp Business.",
          },
          400
        );
      }

      // 3. Resolve Phone Number ID e metadados do número
      let phoneNumberId = body.phone_number_id?.trim() || "";
      let displayPhone: string | null = null;
      let verifiedName: string | null = null;

      if (!phoneNumberId) {
        const numbers = await listWabaPhoneNumbers(env, accessToken, wabaId);
        if (numbers.length > 0) {
          phoneNumberId = numbers[0].id;
          displayPhone = numbers[0].display_phone_number || null;
          verifiedName = numbers[0].verified_name || null;
        }
      }

      if (!phoneNumberId) {
        return jsonResponse(
          {
            error:
              "Nenhum Phone Number ID foi selecionado ou encontrado na conta WhatsApp Business autorizada.",
          },
          400
        );
      }

      // 4. Garante isolamento multi-tenant antes de consultar/alterar recursos extras
      if (await isPhoneNumberIdTakenByOtherTenant(env.DB, phoneNumberId, tenantId)) {
        return jsonResponse(
          { error: "Este número WhatsApp (Phone Number ID) já está conectado a outra clínica na plataforma." },
          409
        );
      }

      if (!displayPhone || !verifiedName) {
        try {
          const phoneInfo = await fetchMetaPhoneNumberInfo(env, accessToken, phoneNumberId);
          displayPhone = phoneInfo.display_phone_number || displayPhone;
          verifiedName = phoneInfo.verified_name || verifiedName;
        } catch (infoErr) {
          console.warn("[EMBEDDED_SIGNUP] Aviso ao buscar metadados do número:", String(infoErr));
        }
      }

      // 5. Assina o app no webhook do WABA e (opcionalmente) registra o número com PIN de 6 dígitos
      const warnings: string[] = [];
      const subRes = await subscribeAppToWaba(env, accessToken, wabaId);
      if (!subRes.success && subRes.error) {
        warnings.push(subRes.error);
      }

      let phoneRegistered = false;
      if (pin) {
        const regRes = await registerWhatsAppPhoneNumber(env, accessToken, phoneNumberId, pin);
        phoneRegistered = regRes.success;
        if (!regRes.success && regRes.error) {
          warnings.push(regRes.error);
        }
      }

      // 6. Criptografa token com AES-256-GCM e persiste no D1
      const encryptedToken = await encryptTenantTokenForEnv(accessToken, env);
      await updateTenantWhatsAppConnection(env.DB, tenantId, {
        phoneNumberId,
        wabaId,
        accessTokenEnc: encryptedToken,
        waDisplayPhone: displayPhone,
        waVerifiedName: verifiedName,
        markConnected: true,
      });

      const updatedTenant = await getTenantById(env.DB, tenantId);
      return jsonResponse({
        success: true,
        whatsapp: updatedTenant ? buildClinicWhatsAppStatus(updatedTenant, env, url.origin) : null,
        steps: {
          tokenExchanged: true,
          webhookSubscribed: subRes.success,
          phoneRegistered,
          warnings,
        },
      });
    } catch (err) {
      const msg = String(err);
      if (msg.includes("UNIQUE")) {
        return jsonResponse(
          { error: "Este Phone Number ID já está vinculado a outra clínica." },
          409
        );
      }
      console.error("Erro em POST /api/clinic/whatsapp/embedded-signup:", msg);
      return jsonResponse({ error: err instanceof Error ? err.message : "Erro ao concluir Embedded Signup." }, 400);
    }
  }

  // 6) CONEXÃO MANUAL / AVANÇADA (CREDENCIAIS PRÓPRIAS DA CLÍNICA VALIDADAS NA META)
  if (url.pathname === "/api/clinic/whatsapp/manual" && request.method === "POST") {
    const check = await requireActiveClinicUser(request, env, true, isSecure);
    if ("response" in check) return check.response;
    const { dbUser } = check.auth;
    const tenantId = dbUser.tenant_id;

    try {
      const body = (await request.json()) as {
        phoneNumberId?: string;
        wabaId?: string | null;
        accessToken?: string | null;
      };

      const phoneNumberId = body.phoneNumberId?.trim() || "";
      const wabaId = body.wabaId?.trim() || null;
      const providedToken = body.accessToken?.trim() || "";

      if (!/^\d{5,32}$/.test(phoneNumberId)) {
        return jsonResponse({ error: "Phone Number ID inválido (informe apenas os dígitos do ID da Meta)." }, 400);
      }
      if (wabaId && !/^\d{5,32}$/.test(wabaId)) {
        return jsonResponse({ error: "WABA ID inválido (informe apenas dígitos)." }, 400);
      }

      if (await isPhoneNumberIdTakenByOtherTenant(env.DB, phoneNumberId, tenantId)) {
        return jsonResponse({ error: "Este Phone Number ID já está conectado a outra clínica." }, 409);
      }

      const tenant = await getTenantById(env.DB, tenantId);
      if (!tenant) {
        return jsonResponse({ error: "Clínica não encontrada." }, 404);
      }

      // Regra estrita: clínicas regulares precisam de token próprio (novo ou já salvo em access_token_enc)
      let effectiveToken: string | null = providedToken || null;
      if (!effectiveToken && tenant.access_token_enc?.trim()) {
        effectiveToken = await resolveTenantAccessToken(tenant, env);
      }
      if (!effectiveToken && tenantId === "lab") {
        effectiveToken = env.WA_LAB_TOKEN?.trim() || null;
      }

      if (!effectiveToken) {
        return jsonResponse(
          { error: "Informe o Access Token da Meta próprio desta clínica para validar e conectar o número." },
          400
        );
      }

      const phoneInfo = await fetchMetaPhoneNumberInfo(env, effectiveToken, phoneNumberId);

      const warnings: string[] = [];
      let webhookSubscribed = false;
      if (wabaId) {
        const subRes = await subscribeAppToWaba(env, effectiveToken, wabaId);
        webhookSubscribed = subRes.success;
        if (!subRes.success && subRes.error) warnings.push(subRes.error);
      }

      const encryptedToken = providedToken
        ? await encryptTenantTokenForEnv(providedToken, env)
        : undefined;

      await updateTenantWhatsAppConnection(env.DB, tenantId, {
        phoneNumberId,
        wabaId,
        accessTokenEnc: encryptedToken,
        waDisplayPhone: phoneInfo.display_phone_number || null,
        waVerifiedName: phoneInfo.verified_name || null,
        markConnected: true,
      });

      const updatedTenant = await getTenantById(env.DB, tenantId);
      return jsonResponse({
        success: true,
        whatsapp: updatedTenant ? buildClinicWhatsAppStatus(updatedTenant, env, url.origin) : null,
        webhookSubscribed,
        warnings,
      });
    } catch (err) {
      const msg = String(err);
      if (msg.includes("UNIQUE")) {
        return jsonResponse({ error: "Este Phone Number ID já está vinculado a outra clínica." }, 409);
      }
      console.error("Erro em POST /api/clinic/whatsapp/manual:", msg);
      return jsonResponse({ error: err instanceof Error ? err.message : "Falha ao validar credenciais na Meta." }, 400);
    }
  }

  // 7) DIAGNÓSTICO DE CONEXÃO & WEBHOOK (NUNCA FAZ FALLBACK PARA NÚMERO LAB)
  if (url.pathname === "/api/clinic/whatsapp/diagnose" && request.method === "POST") {
    const check = await requireActiveClinicUser(request, env, false, isSecure);
    if ("response" in check) return check.response;
    const { dbUser } = check.auth;

    const tenant = await getTenantById(env.DB, dbUser.tenant_id);
    if (!tenant) {
      return jsonResponse({ error: "Clínica não encontrada." }, 404);
    }

    const checks: Array<{ key: string; label: string; status: "ok" | "warn" | "fail"; detail: string }> = [];

    checks.push({
      key: "tenant_active",
      label: "Status da Clínica na Plataforma",
      status: tenant.active === 1 ? "ok" : "fail",
      detail: tenant.active === 1 ? "Clínica ativa para automação." : "Clínica pausada pelo Super Admin.",
    });

    const hasPhoneId = isConfiguredPhoneNumberId(tenant.phone_number_id);
    checks.push({
      key: "phone_number_id",
      label: "Phone Number ID (Meta)",
      status: hasPhoneId ? "ok" : "fail",
      detail: hasPhoneId
        ? `Configurado (${tenant.phone_number_id})`
        : `Não configurado (${tenant.phone_number_id}). Sem fallback para número de laboratório.`,
    });

    const hasOwnToken = Boolean(tenant.access_token_enc?.trim());
    const resolvedToken = hasPhoneId ? await resolveTenantAccessToken(tenant, env) : null;
    if (hasOwnToken && resolvedToken) {
      checks.push({
        key: "token",
        label: "Token de Acesso WhatsApp",
        status: "ok",
        detail: isEncryptedTenantToken(tenant.access_token_enc)
          ? "Token próprio criptografado em AES-256-GCM."
          : "Token próprio configurado.",
      });
    } else if (!hasOwnToken && tenant.id === "lab" && resolvedToken) {
      checks.push({
        key: "token",
        label: "Token de Acesso WhatsApp",
        status: "ok",
        detail: "Ambiente de laboratório usando WA_LAB_TOKEN.",
      });
    } else if (!hasOwnToken && resolvedToken) {
      checks.push({
        key: "token",
        label: "Token de Acesso WhatsApp",
        status: "warn",
        detail: "Sem token próprio em access_token_enc; operando via fallback WA_LAB_TOKEN.",
      });
    } else {
      checks.push({
        key: "token",
        label: "Token de Acesso WhatsApp",
        status: "fail",
        detail: hasOwnToken
          ? "Falha ao descriptografar o token armazenado. Reconecte via Embedded Signup ou informe um novo token."
          : "Nenhum token configurado para esta clínica.",
      });
    }

    const webhookReady = Boolean(env.WA_VERIFY_TOKEN?.trim()) && Boolean(env.META_APP_SECRETS?.trim());
    checks.push({
      key: "server_webhook",
      label: "Segredos de Webhook no Servidor",
      status: webhookReady ? "ok" : "warn",
      detail: webhookReady
        ? `Webhook pronto em ${url.origin}/webhook (assinatura HMAC e verify_token ativos).`
        : "WA_VERIFY_TOKEN ou META_APP_SECRETS ausentes no ambiente.",
    });

    let canSubscribeWebhook = false;

    if (hasPhoneId && resolvedToken) {
      try {
        const info = await fetchMetaPhoneNumberInfo(env, resolvedToken, tenant.phone_number_id);
        await updateTenantWhatsAppConnection(env.DB, tenant.id, {
          phoneNumberId: tenant.phone_number_id,
          waDisplayPhone: info.display_phone_number || tenant.wa_display_phone || null,
          waVerifiedName: info.verified_name || tenant.wa_verified_name || null,
        });
        checks.push({
          key: "graph_phone",
          label: "Consulta ao Número na Graph API",
          status: "ok",
          detail: `${info.display_phone_number || tenant.phone_number_id} • ${info.verified_name || "Sem nome verificado"} • Qualidade: ${info.quality_rating || "N/A"} • Status: ${info.code_verification_status || "N/A"}`,
        });
      } catch (err) {
        checks.push({
          key: "graph_phone",
          label: "Consulta ao Número na Graph API",
          status: "fail",
          detail: err instanceof Error ? err.message : "Erro ao consultar Graph API.",
        });
      }

      if (tenant.waba_id) {
        const subCheck = await getWabaSubscribedApps(env, resolvedToken, tenant.waba_id);
        if (subCheck.error) {
          checks.push({
            key: "waba_webhook",
            label: "Assinatura Webhook no WABA",
            status: "warn",
            detail: subCheck.error,
          });
          canSubscribeWebhook = true;
        } else if (subCheck.subscribed && ((!tenant.commercial_status || tenant.commercial_status === 'legacy') || Boolean(env.META_APP_ID && subCheck.apps.some(app => app.id === env.META_APP_ID)))) {
          const appNames = subCheck.apps.map((a) => a.name || a.id).filter(Boolean).join(", ");
          checks.push({
            key: "waba_webhook",
            label: "Assinatura Webhook no WABA",
            status: "ok",
            detail: `App assinado no WABA ${tenant.waba_id}${appNames ? ` (${appNames})` : ""}.`,
          });
        } else {
          checks.push({
            key: "waba_webhook",
            label: "Assinatura Webhook no WABA",
            status: "fail",
            detail: `Não foi possível confirmar o aplicativo do Aura nos webhooks do WABA ${tenant.waba_id}. Clique em "Assinar Webhook Agora".`,
          });
          canSubscribeWebhook = true;
        }
      } else {
        checks.push({
          key: "waba_webhook",
          label: "Assinatura Webhook no WABA",
          status: "warn",
          detail: "WABA ID não informado; não foi possível verificar a assinatura de webhooks do WABA.",
        });
      }
    }

    const hasFail = checks.some((c) => c.status === "fail");
    const hasWarn = checks.some((c) => c.status === "warn");
    await env.DB.prepare('UPDATE tenants SET whatsapp_diagnosed_at=?2 WHERE id=?1')
      .bind(tenant.id, !hasFail && !hasWarn ? new Date().toISOString() : null).run();
    const refreshed = await getTenantById(env.DB, dbUser.tenant_id);

    return jsonResponse({
      summary: hasFail ? "error" : hasWarn ? "warning" : "ok",
      canSubscribeWebhook,
      checks,
      whatsapp: refreshed ? buildClinicWhatsAppStatus(refreshed, env, url.origin) : null,
    });
  }

  // 8) ASSINAR / REASSINAR WEBHOOK DO WABA
  if (url.pathname === "/api/clinic/whatsapp/subscribe" && request.method === "POST") {
    const check = await requireActiveClinicUser(request, env, true, isSecure);
    if ("response" in check) return check.response;
    const { dbUser } = check.auth;

    const tenant = await getTenantById(env.DB, dbUser.tenant_id);
    if (!tenant || !isConfiguredPhoneNumberId(tenant.phone_number_id) || !tenant.waba_id) {
      return jsonResponse({ error: "Conecte um número e WABA ID antes de assinar o webhook." }, 400);
    }

    const token = await resolveTenantAccessToken(tenant, env);
    if (!token) {
      return jsonResponse({ error: "Token WhatsApp não encontrado para esta clínica." }, 400);
    }

    const subRes = await subscribeAppToWaba(env, token, tenant.waba_id);
    if (!subRes.success) {
      return jsonResponse({ error: subRes.error || "Falha ao assinar webhook no WABA." }, 400);
    }

    return jsonResponse({ success: true });
  }

  // 9) DESCONECTAR WHATSAPP DA CLÍNICA
  if (url.pathname === "/api/clinic/whatsapp/disconnect" && request.method === "POST") {
    const check = await requireActiveClinicUser(request, env, true, isSecure);
    if ("response" in check) return check.response;
    const { dbUser } = check.auth;

    await disconnectTenantWhatsApp(env.DB, dbUser.tenant_id);
    const updated = await getTenantById(env.DB, dbUser.tenant_id);

    return jsonResponse({
      success: true,
      whatsapp: updated ? buildClinicWhatsAppStatus(updated, env, url.origin) : null,
    });
  }

  return jsonResponse({ error: "Rota não encontrada" }, 404);
}
