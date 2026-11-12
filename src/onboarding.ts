import type { Env, Tenant } from './types';
import { commercialAccess, tenantConfig } from './access';
import { createSessionToken, getSessionFromRequest, hashPassword, isClinicAdminRole, makeSessionCookie } from './auth';
import { getTenantById, getUserByEmail, getUserById, isCrucialConfigComplete, listProfessionals } from './db';
import { jsonResponse } from './http';

export async function registerAccount(request: Request, env: Env) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonResponse({error:'Cadastro inválido.'},400);
    const field = (key: string) => typeof body[key] === 'string' ? String(body[key]).trim() : '';
    const clinicName = field('clinicName'), adminName = field('adminName'), email = field('email').toLowerCase();
    const phone = field('phone'), kind = field('businessKind'), sector = field('businessSector');
    const external = body.usesExternalSchedule, system = field('existingSystem');
    const password = typeof body.password === 'string' ? body.password : '';
    if (!clinicName || clinicName.length > 120 || !adminName || adminName.length > 120
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
      || password.length < 8 || password.length > 256 || !/^\d{10,15}$/.test(phone.replace(/\D/g, ''))
      || !['solo','clinic'].includes(kind) || !['dentistry','aesthetics'].includes(sector)
      || typeof external !== 'boolean' || (external && !system) || system.length > 120) {
      return jsonResponse({ error: 'Preencha o perfil, os dados de contato, a agenda utilizada e uma senha com pelo menos 8 caracteres.' }, 400);
    }
    if (await getUserByEmail(env.DB, email)) return jsonResponse({ error: 'Este e-mail já está cadastrado. Acesse sua conta.' }, 409);
    const id = `negocio-${crypto.randomUUID()}`;
    const hash = await hashPassword(password);
    const now = new Date().toISOString();
    const procedures = sector === 'dentistry'
      ? ['Limpeza e Profilaxia', 'Clareamento Dental', 'Avaliação de Implante']
      : ['Toxina Botulínica (Botox)', 'Preenchimento Labial', 'Bioestimulador de Colágeno'];
    const config = JSON.stringify({ clinic_name: clinicName, doctor_name: adminName,
      hours: 'Segunda a Sexta, das 08:00 às 18:00',
      initial_consultation: { duration: '30 min', price: 'A confirmar na clínica', details: 'Avaliação inicial completa' },
      procedures, procedure_items: procedures.map(name => ({ name, checked: true,
        category: sector === 'dentistry' ? 'odonto' : 'estetica', duration: '45 min' })) });
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO tenants (id,name,phone_number_id,contact_email,admin_phone,responsible_name,
        bot_config,active,commercial_status,business_kind,business_sector,uses_external_schedule,existing_system,
        trial_ends_at,trial_messages_used,trial_messages_limit,billing_cycle,training_reviewed_at,schedule_mode,agenda_ready_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,1,'preparing',?8,?9,?10,?11,NULL,0,100,NULL,?12,?13,?14)`)
        .bind(id, clinicName, `unconfigured:${id}`, email, phone, adminName, config, kind, sector, external ? 1 : 0, external ? system : null,
          now, external ? 'external_manual' : 'aura', external ? null : now),
      env.DB.prepare("INSERT INTO users (tenant_id,email,password_hash,name,role,active) VALUES (?1,?2,?3,?4,'admin',1)")
        .bind(id, email, hash, adminName),
      env.DB.prepare(`INSERT INTO professionals (tenant_id,name,specialty,working_days,start_hour,end_hour,break_start,break_end,procedures_json,color,active)
        VALUES (?1,?2,?3,'[1,2,3,4,5]','08:00','18:00','12:00','13:00','[]','#10b981',1)`)
        .bind(id, adminName, sector === 'dentistry' ? 'Odontologia Geral' : 'Estética Avançada'),
      // Restore readiness after the professional_added trigger, only for Aura schedules.
      ...(!external ? [env.DB.prepare('UPDATE tenants SET agenda_ready_at=?2 WHERE id=?1').bind(id, now)] : []),
    ]);
    const user = await getUserByEmail(env.DB, email);
    if (!user) throw new Error('REGISTER_USER_MISSING');
    const token = await createSessionToken({ userId: user.id, tenantId: id, email, name: adminName, role: 'admin' }, env.AUTH_SECRET);
    return jsonResponse({ success: true, redirect: '/inbox#simulator', tenantId: id, user: { name: adminName, email, role: 'admin', tenantId: id } }, 201,
      { 'Set-Cookie': makeSessionCookie(token, new URL(request.url).protocol === 'https:') });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonResponse({ error: 'JSON inválido.' }, 400);
    if (String(error).includes('UNIQUE')) return jsonResponse({ error: 'Este e-mail já está cadastrado.' }, 409);
    console.error('[REGISTER]', String(error));
    return jsonResponse({ error: 'Não foi possível concluir o cadastro.' }, 500);
  }
}

export async function handleOnboarding(request: Request, env: Env, tenant: Tenant, canManage: boolean) {
  const path = new URL(request.url).pathname;
  const response = async () => {
    const updated = await getTenantById(env.DB, tenant.id);
    return jsonResponse({ access: commercialAccess(updated!), trial_enabled: env.OPERATIONAL_TRIAL_ENABLED === 'true' });
  };
  if (path === '/api/onboarding' && request.method === 'GET') return response();
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);
  if (!canManage) return jsonResponse({ error: 'Somente o responsável pode preparar ou ativar o atendimento.' }, 403);
  const access = commercialAccess(tenant);
  if (path === '/api/onboarding/prepare') {
    if (tenant.commercial_status === 'free') {
      await env.DB.prepare("UPDATE tenants SET commercial_status='preparing' WHERE id=?1 AND commercial_status='free'").bind(tenant.id).run();
    }
    return response();
  }
  if (path === '/api/onboarding/review-training') {
    if (!isCrucialConfigComplete(tenantConfig(tenant))) return jsonResponse({ error: 'Salve os campos obrigatórios do treinamento antes de revisar.' }, 409);
    await env.DB.prepare('UPDATE tenants SET training_reviewed_at=?2 WHERE id=?1').bind(tenant.id, new Date().toISOString()).run();
    return response();
  }
  if (path === '/api/onboarding/agenda') {
    if (!access.can_prepare) return jsonResponse({ error: 'Inicie a preparação do teste antes de configurar a agenda.' }, 403);
    let body: any;
    try { body = await request.json(); } catch { return jsonResponse({ error: 'JSON inválido.' }, 400); }
    if (!['aura','dedicated','external_manual'].includes(body?.mode)) return jsonResponse({ error: 'Escolha como a agenda será utilizada.' }, 400);
    if (['dedicated','external_manual'].includes(body.mode) && body.maintenanceAcknowledged !== true) {
      return jsonResponse({ error: 'Confirme como manterá os horários externos atualizados ou reservados.' }, 400);
    }
    const professionals = await listProfessionals(env.DB, tenant.id, true);
    if (!professionals.length) return jsonResponse({ error: 'Cadastre pelo menos um profissional e seu expediente na Agenda.' }, 409);
    const minutes=(time:string|null)=>{
      if(!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
      return Number(time.slice(0,2))*60+Number(time.slice(3));
    };
    for(const professional of professionals) {
      let days:unknown;try{days=JSON.parse(professional.working_days);}catch{days=null;}
      const start=minutes(professional.start_hour),end=minutes(professional.end_hour);
      const pauseStart=minutes(professional.break_start),pauseEnd=minutes(professional.break_end);
      if(!Array.isArray(days)||!days.length||!days.every(day=>Number.isInteger(day)&&day>=0&&day<=6)
        || start===null||end===null||start>=end
        || ((professional.break_start||professional.break_end) && (pauseStart===null||pauseEnd===null||pauseStart>=pauseEnd||pauseStart<start||pauseEnd>end)))
        return jsonResponse({error:`Revise dias, expediente e intervalo de ${professional.name}.`},409);
    }
    await env.DB.prepare('UPDATE tenants SET schedule_mode=?2,agenda_ready_at=?3 WHERE id=?1')
      .bind(tenant.id, body.mode, new Date().toISOString()).run();
    return response();
  }
  if (path === '/api/onboarding/start-paid') {
    if (access.status !== 'active' || !Object.values(access.readiness).every(Boolean)) return jsonResponse({error:'Conclua a preparação e confirme a vigência da assinatura.'},409);
    await env.DB.prepare("UPDATE tenants SET operational_enabled=1 WHERE id=?1 AND commercial_status='active'").bind(tenant.id).run();
    return response();
  }
  if (path === '/api/onboarding/activate') {
    if (tenant.trial_started_at) return response(); // idempotent: never grant another trial
    if (env.OPERATIONAL_TRIAL_ENABLED !== 'true') return jsonResponse({ error: 'Ativação do teste ainda não disponível.' }, 503);
    if (tenant.commercial_status !== 'preparing' || !Object.values(access.readiness).every(Boolean)) {
      return jsonResponse({ error: 'Conclua treinamento, diagnóstico do WhatsApp e preparação da agenda.', access }, 409);
    }
    const now = new Date();
    const end = new Date(now.getTime() + 168 * 60 * 60 * 1000);
    await env.DB.prepare(`UPDATE tenants SET commercial_status='trial',plan_status='trial',trial_started_at=?2,
      trial_ends_at=?3,trial_messages_used=0,trial_messages_limit=100,operational_enabled=1
      WHERE id=?1 AND commercial_status='preparing' AND trial_started_at IS NULL`)
      .bind(tenant.id, now.toISOString(), end.toISOString()).run();
    return response();
  }
  return jsonResponse({ error: 'Rota não encontrada.' }, 404);
}

export async function authenticatedBusiness(request: Request, env: Env) {
  const session = await getSessionFromRequest(request, env.AUTH_SECRET);
  if (!session) return { response: jsonResponse({ error: 'Não autenticado.' }, 401) };
  const user = await getUserById(env.DB, session.userId);
  if (!user || user.active === 0 || user.tenant_id !== session.tenantId) return { response: jsonResponse({ error: 'Sessão encerrada ou usuário pausado.' }, 401) };
  const tenant = await getTenantById(env.DB, session.tenantId);
  if (!tenant || tenant.active !== 1) return { response: jsonResponse({ error: 'Conta inativa. Entre em contato com o responsável.' }, 403) };
  return { tenant, user, canManage: isClinicAdminRole(user.email, user.role, env), access: commercialAccess(tenant) };
}
