import type { Env, Tenant } from './types';
import { getTenantById, isConfiguredPhoneNumberId, isCrucialConfigComplete } from './db';

export function tenantConfig(tenant: Tenant) {
  try { return JSON.parse(tenant.bot_config || '{}'); } catch { return {}; }
}

export function commercialAccess(tenant: Tenant, now = Date.now()) {
  const legacy = !tenant.commercial_status || tenant.commercial_status === 'legacy';
  let status = tenant.commercial_status || 'legacy';
  const end = Date.parse(tenant.trial_ends_at || '');
  const paidEnd = Date.parse(tenant.subscription_ends_at || '');
  const quotaReached = (tenant.trial_messages_used ?? 0) >= (tenant.trial_messages_limit ?? 100);
  let endedReason: string | null = null;
  if (status === 'trial' && (!tenant.trial_started_at || !Number.isFinite(end) || end <= now || quotaReached)) {
    status = 'ended';
    endedReason = quotaReached ? 'quota' : 'time';
  }
  if (status === 'active' && (!Number.isFinite(paidEnd) || paidEnd <= now)) {
    status = 'ended';
    endedReason = 'subscription';
  }
  const trainingReady = Boolean(tenant.training_reviewed_at) && isCrucialConfigComplete(tenantConfig(tenant));
  const whatsappReady = isConfiguredPhoneNumberId(tenant.phone_number_id)
    && Boolean(tenant.access_token_enc && tenant.whatsapp_diagnosed_at);
  const agendaReady = Boolean(tenant.agenda_ready_at && tenant.schedule_mode);
  const entitled = legacy || status === 'trial' || status === 'active';
  const canOperate = tenant.active === 1 && entitled
    && (legacy || Boolean(tenant.operational_enabled && trainingReady && whatsappReady && agendaReady));
  return {
    status, legacy_review_required: legacy, ended_reason: endedReason,
    can_operate: canOperate,
    can_prepare: tenant.active === 1 && (legacy || ['preparing','trial','active'].includes(status)),
    can_read_history: tenant.active === 1 && (legacy || ['trial','active','ended'].includes(status)),
    readiness: { training: trainingReady, whatsapp: whatsappReady, agenda: agendaReady },
    schedule_mode: tenant.schedule_mode ?? null,
    profile: { kind: tenant.business_kind ?? null, sector: tenant.business_sector ?? null },
    trial: {
      started_at: tenant.trial_started_at ?? null, ends_at: tenant.trial_ends_at ?? null,
      used: tenant.trial_messages_used ?? 0, limit: tenant.trial_messages_limit ?? 100,
    },
    demo: { used: tenant.demo_messages_used ?? 0, limit: tenant.demo_messages_limit ?? 30 },
  };
}

export async function canStillOperate(env: Env, tenantId: string, reservedTrial = false) {
  const tenant = await getTenantById(env.DB, tenantId);
  if (!tenant) return false;
  // The last reserved response is allowed; subsequent requests see the exhausted quota.
  return commercialAccess(reservedTrial && tenant.commercial_status === 'trial'
    ? { ...tenant, trial_messages_used: Math.max(0, (tenant.trial_messages_used ?? 0) - 1) } : tenant).can_operate;
}

export async function reserveUsage(env: Env, tenantId: string, scope: 'demo' | 'trial', requestId: string) {
  const existing = await env.DB.prepare('SELECT status,result_json FROM usage_reservations WHERE tenant_id=?1 AND scope=?2 AND request_id=?3')
    .bind(tenantId, scope, requestId).first<{ status: string; result_json: string | null }>();
  if (existing && existing.status !== 'released') return { kind: existing.status === 'completed' ? 'replay' : 'pending', result: existing.result_json };
  if (existing?.status === 'released') {
    await env.DB.prepare("DELETE FROM usage_reservations WHERE tenant_id=?1 AND scope=?2 AND request_id=?3 AND status='released'")
      .bind(tenantId, scope, requestId).run();
  }
  try {
    await env.DB.prepare('INSERT INTO usage_reservations (tenant_id,scope,request_id) VALUES (?1,?2,?3)')
      .bind(tenantId, scope, requestId).run();
    return { kind: 'reserved', result: null };
  } catch (error) {
    if (/DEMO_LIMIT|TRIAL_LIMIT|ACCOUNT_INACTIVE/.test(String(error))) return { kind: 'limit', result: null };
    if (String(error).includes('UNIQUE')) return { kind: 'pending', result: null };
    throw error;
  }
}

export async function finishUsage(env: Env, tenantId: string, scope: 'demo' | 'trial', requestId: string, result: unknown, release = false) {
  await env.DB.prepare("UPDATE usage_reservations SET status=?4,result_json=?5 WHERE tenant_id=?1 AND scope=?2 AND request_id=?3 AND status='reserved'")
    .bind(tenantId, scope, requestId, release ? 'released' : 'completed', JSON.stringify(result)).run();
}
