import type { Env, Tenant } from './types';

export type PlanTier = 'free' | 'pro' | 'ultra';
export type BillingCycle = 'monthly' | 'yearly';
// Monetary values are cents. null means unlimited; audio is measured in seconds.
export const PLANS = {
  free: { name: 'Free', responses: 50, transcription: 300, images: 15, professionals: 1, voice: 0, monthly: 0, yearly: 0 },
  pro: { name: 'Pro', responses: 1000, transcription: 3600, images: 200, professionals: 2, voice: 900, monthly: 12900, yearly: 118800 },
  ultra: { name: 'Ultra', responses: null, transcription: null, images: null, professionals: null, voice: 3600, monthly: 24900, yearly: 238800 },
} as const;
export function isPaidPlan(value: unknown): value is 'pro' | 'ultra' { return value === 'pro' || value === 'ultra'; }
export function effectivePlan(tenant: Tenant, now = Date.now()): PlanTier {
  if (isPaidPlan(tenant.plan_tier) && Date.parse(tenant.subscription_ends_at || '') > now) return tenant.plan_tier;
  // Accounts predating tiered plans retain their existing entitlement until migrated explicitly.
  if ((!tenant.commercial_status || tenant.commercial_status === 'legacy') && !tenant.plan_tier) return 'ultra';
  return 'free';
}
export function priceIdFor(env: Env, tier: 'pro' | 'ultra', cycle: BillingCycle) {
  return tier === 'pro'
    ? cycle === 'monthly' ? env.PADDLE_PRO_MONTHLY_PRICE_ID : env.PADDLE_PRO_YEARLY_PRICE_ID
    : cycle === 'monthly' ? env.PADDLE_ULTRA_MONTHLY_PRICE_ID : env.PADDLE_ULTRA_YEARLY_PRICE_ID;
}
export function identifyPrice(env: Env, id: string): {tier: 'pro' | 'ultra'; cycle: BillingCycle; legacy?: boolean} | null {
  for (const tier of ['pro','ultra'] as const) for (const cycle of ['monthly','yearly'] as const)
    if (id && id === priceIdFor(env,tier,cycle)) return {tier,cycle};
  if (id && id === env.PADDLE_MONTHLY_PRICE_ID) return {tier:'ultra',cycle:'monthly',legacy:true};
  if (id && id === env.PADDLE_YEARLY_PRICE_ID) return {tier:'ultra',cycle:'yearly',legacy:true};
  return null;
}
export function usageMonth(now = Date.now()) {
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(now);
}
export type PlanMetric = 'responses' | 'transcription' | 'images' | 'voice';
export async function reservePlanUsage(env: Env, tenant: Tenant, metric: PlanMetric, requestId: string, amount = 1) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('INVALID_USAGE_AMOUNT');
  const previous = await env.DB.prepare('SELECT status FROM plan_usage WHERE tenant_id=?1 AND metric=?2 AND request_id=?3')
    .bind(tenant.id,metric,requestId).first<{status:string}>();
  if (previous && previous.status !== 'released') return previous.status === 'completed' ? 'replay' : 'pending';
  // Resolve the tier at reservation time; a queue job may cross a renewal
  // boundary while downloading media or waiting for a provider.
  const current=await env.DB.prepare('SELECT plan_tier,commercial_status,subscription_ends_at,active FROM tenants WHERE id=?1')
    .bind(tenant.id).first<Pick<Tenant,'plan_tier'|'commercial_status'|'subscription_ends_at'|'active'>>();
  if(!current || current.active!==1)return 'limit';
  const now=Date.now(),limit=PLANS[effectivePlan({...tenant,...current},now)][metric];
  try {
    if(previous?.status==='released')await env.DB.prepare("DELETE FROM plan_usage WHERE tenant_id=?1 AND metric=?2 AND request_id=?3 AND status='released'").bind(tenant.id,metric,requestId).run();
    // The insert and its quota trigger are one atomic database statement.
    await env.DB.prepare('INSERT INTO plan_usage(tenant_id,month,metric,request_id,amount,limit_value) VALUES (?1,?2,?3,?4,?5,?6)')
      .bind(tenant.id,usageMonth(now),metric,requestId,amount,limit).run();
    return 'reserved';
  } catch (error) {
    if (String(error).includes('PLAN_LIMIT')) return 'limit';
    if (String(error).includes('UNIQUE')) return 'pending';
    throw error;
  }
}
export async function finishPlanUsage(env: Env, tenantId: string, metric: PlanMetric, requestId: string, release = false) {
  await env.DB.prepare("UPDATE plan_usage SET status=?4 WHERE tenant_id=?1 AND metric=?2 AND request_id=?3 AND status='reserved'")
    .bind(tenantId,metric,requestId,release ? 'released' : 'completed').run();
}
export async function planUsage(env: Env, tenant: Tenant) {
  const month=usageMonth();
  const {results} = await env.DB.prepare("SELECT metric,SUM(amount) AS used FROM plan_usage WHERE tenant_id=?1 AND month=?2 AND status!='released' GROUP BY metric")
    .bind(tenant.id,month).all<{metric:string;used:number}>();
  return {month,limits:PLANS[effectivePlan(tenant)],used:Object.fromEntries(results.map(row=>[row.metric,row.used]))};
}
