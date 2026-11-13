import type { Env, Tenant } from './types';

export type PlanTier = 'free' | 'pro' | 'ultra';
export type BillingCycle = 'monthly' | 'yearly';
// Monetary values are cents. null means unlimited; audio is measured in seconds.
export const PLANS = {
  free: { name: 'Free', responses: 50, transcription: 300, images: 15, professionals: 1, voice: 0, monthly: 0, yearly: 0 },
  pro: { name: 'Pro', responses: 1000, transcription: 3600, images: 200, professionals: 2, voice: 900, monthly: 12900, yearly: 118800 },
  ultra: { name: 'Ultra', responses: null, transcription: null, images: null, professionals: null, voice: 3600, monthly: 24900, yearly: 238800 },
} as const;
export type PlanLimits = Record<PlanMetric | 'professionals', number | null>;
export type PlanOffer = PlanLimits & {
  id: string; plan_id: string; version: number; name: string; monthly: number; yearly: number; published: number;
};
export const offerColumns = 'id,plan_id,version,name,responses,transcription,images,professionals,voice,monthly,yearly,published';
const offerJson = `json_object(
  'id',o.id,'plan_id',o.plan_id,'version',o.version,'name',o.name,'responses',o.responses,
  'transcription',o.transcription,'images',o.images,'professionals',o.professionals,'voice',o.voice,
  'monthly',o.monthly,'yearly',o.yearly,'published',o.published)`;
export const tenantOfferSelect = `tenants.*, (SELECT ${offerJson} FROM plan_offers o
  WHERE o.id=COALESCE(tenants.plan_offer_id,tenants.plan_tier||'-v1')
    AND (tenants.plan_tier IS NOT NULL OR o.plan_id<>'free')) AS active_offer,
  (SELECT ${offerJson} FROM plan_offers o WHERE o.plan_id='free' AND o.published=1) AS free_offer`;

export async function publishedOffers(db:D1Database) {
  const {results}=await db.prepare(`SELECT ${offerColumns} FROM plan_offers WHERE published=1 ORDER BY plan_id<>'free',plan_id`).all<PlanOffer>();
  return Object.fromEntries(results.map(offer=>[offer.plan_id,offer])) as Record<string,PlanOffer>;
}
export async function getOffer(db:D1Database,id:string) {
  return db.prepare(`SELECT ${offerColumns} FROM plan_offers WHERE id=?1`).bind(id).first<PlanOffer>();
}
export function graceUntil(tenant: Tenant, now=Date.now()) {
  const end=Date.parse(tenant.subscription_ends_at || '');
  const until=end+7*86400000;
  return tenant.paddle_subscription_id && tenant.auto_renew===1 && !tenant.paid_access_revoked
    && !tenant.renewal_canceled_at && ['active','past_due'].includes(tenant.billing_status || '')
    && now>=end && now<until ? until : null;
}
export function activeOffer(tenant:Tenant,now=Date.now()):PlanOffer|null {
  const plan=effectivePlan(tenant,now);
  const offer=plan==='free' ? tenant.free_offer : tenant.active_offer;
  return offer ? JSON.parse(offer) as PlanOffer : null;
}
export function isPaidPlan(value: unknown): value is 'pro' | 'ultra' { return value === 'pro' || value === 'ultra'; }
export function effectivePlan(tenant: Tenant, now = Date.now()): string {
  if (!tenant.paid_access_revoked && (Date.parse(tenant.subscription_ends_at || '') > now || graceUntil(tenant,now))) {
    if (tenant.active_offer) return (JSON.parse(tenant.active_offer) as PlanOffer).plan_id;
    if (isPaidPlan(tenant.plan_tier)) return tenant.plan_tier;
  }
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
export async function offerForPrice(env:Env,id:string):Promise<(PlanOffer & {cycle:BillingCycle;legacy?:boolean})|null> {
  if (!id) return null;
  const configured=await env.DB.prepare(`SELECT o.*,p.cycle FROM plan_offer_prices p JOIN plan_offers o ON o.id=p.offer_id
    WHERE p.environment=?1 AND p.price_id=?2`).bind(env.PADDLE_ENVIRONMENT || 'sandbox',id).first<PlanOffer & {cycle:BillingCycle}>();
  if (configured) return configured;
  const old=identifyPrice(env,id);
  if (!old) return null;
  const offer=await getOffer(env.DB,old.tier+'-v1');
  return offer && {...offer,cycle:old.cycle,legacy:old.legacy};
}
export async function offerPriceId(env:Env,offer:PlanOffer,cycle:BillingCycle) {
  const mapped=await env.DB.prepare('SELECT price_id FROM plan_offer_prices WHERE offer_id=?1 AND environment=?2 AND cycle=?3')
    .bind(offer.id,env.PADDLE_ENVIRONMENT || 'sandbox',cycle).first<string>('price_id');
  return mapped || (offer.version===1 && isPaidPlan(offer.plan_id) ? priceIdFor(env,offer.plan_id,cycle) : null);
}
export function storedTier(planId:string):PlanTier {
  return planId==='free' || planId==='ultra' ? planId : 'pro';
}
export function usageMonth(now = Date.now()) {
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(now);
}
const civilTime = new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',fractionalSecondDigits:3,hourCycle:'h23',
});
function civilDate(instant:number) {
  const parts=Object.fromEntries(civilTime.formatToParts(instant).map(({type,value})=>[type,Number(value)]));
  return new Date(Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second,parts.fractionalSecond));
}
export function usageWindow(tenant:Pick<Tenant,'quota_anchor_at'|'quota_bridge_at'>,now=Date.now()) {
  const local=civilDate(now);
  const anchor=Date.parse(tenant.quota_anchor_at || '');
  const bridge=Date.parse(tenant.quota_bridge_at || '');
  if (!Number.isFinite(anchor) || now<anchor) {
    const next=Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+1,1);
    return {key:usageMonth(now),carry:null,resetAt:new Date(next+3*3600000).toISOString()};
  }
  const base=civilDate(anchor);
  const boundary=(shift:number)=>{
    const month=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+shift,1));
    const lastDay=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
    const wall=Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),Math.min(base.getUTCDate(),lastDay),
      base.getUTCHours(),base.getUTCMinutes(),base.getUTCSeconds(),base.getUTCMilliseconds());
    const guess=wall+3*3600000;
    return guess+wall-civilDate(guess).getTime();
  };
  const shift=now<boundary(0)?-1:0;
  const start=Math.max(anchor,boundary(shift)),end=boundary(shift+1);
  return {key:new Date(start).toISOString(),carry:bridge>=start && bridge<end ? usageMonth(bridge) : null,resetAt:new Date(end).toISOString()};
}

export type PlanMetric = 'responses' | 'transcription' | 'images' | 'voice';
const usageMetrics = ['responses','transcription','images','voice'] as const;
function quotaContext(tenant:Tenant,now:number) {
  const plan=effectivePlan(tenant,now);
  const limits=activeOffer(tenant,now) || PLANS[plan as PlanTier] || PLANS.free;
  const graceEnd=graceUntil(tenant,now);
  const graceFrom=graceEnd ? new Date(tenant.subscription_ends_at!).toISOString() : null;
  const window=usageWindow(tenant,now);
  const paidWindow=graceEnd ? usageWindow(tenant,Date.parse(graceFrom!)-1) : window;
  return {limits,graceEnd,graceFrom,window,paidWindow};
}
export async function reservePlanUsage(env: Env, tenant: Tenant, metric: PlanMetric, requestId: string, amount = 1) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('INVALID_USAGE_AMOUNT');
  const previous = await env.DB.prepare('SELECT status FROM plan_usage WHERE tenant_id=?1 AND metric=?2 AND request_id=?3')
    .bind(tenant.id,metric,requestId).first<{status:string}>();
  if (previous && previous.status !== 'released') return previous.status === 'completed' ? 'replay' : 'pending';
  // Resolve the tier at reservation time; a queue job may cross a renewal
  // boundary while downloading media or waiting for a provider.
  const current=await env.DB.prepare(`SELECT ${tenantOfferSelect} FROM tenants WHERE id=?1`).bind(tenant.id).first<Tenant>();
  if(!current || current.active!==1)return 'limit';
  const now=Date.now(), context=quotaContext(current,now);
  const limit=context.limits[metric];
  try {
    if(previous?.status==='released')await env.DB.prepare("DELETE FROM plan_usage WHERE tenant_id=?1 AND metric=?2 AND request_id=?3 AND status='released'").bind(tenant.id,metric,requestId).run();
    // The insert and its quota trigger are one atomic database statement.
    const result=await env.DB.prepare(`INSERT INTO plan_usage(tenant_id,month,metric,request_id,amount,limit_value,reserved_at,carry_month,grace_from,grace_limit,base_month)
      SELECT id,?2,?3,?4,?5,?6,?7,?8,?9,?10,?18 FROM tenants
      WHERE id=?1 AND active=1 AND billing_event_at IS ?11 AND quota_anchor_at IS ?12 AND paid_access_revoked=?13
        AND renewal_canceled_at IS ?14 AND auto_renew IS ?15 AND plan_offer_id IS ?16 AND plan_tier IS ?17`)
      .bind(tenant.id,context.window.key,metric,requestId,amount,limit,new Date(now).toISOString(),
        context.paidWindow.carry,context.graceFrom,context.graceEnd && limit===null ? PLANS.free[metric] : null,
        current.billing_event_at ?? null,current.quota_anchor_at ?? null,current.paid_access_revoked ?? 0,
        current.renewal_canceled_at ?? null,current.auto_renew ?? 1,current.plan_offer_id ?? null,current.plan_tier ?? null,context.paidWindow.key).run();
    if (!result.meta.changes) throw new Error('PLAN_CHANGED');
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
  const {window,paidWindow,limits,graceEnd,graceFrom}=quotaContext(tenant,Date.now());
  const {results}=await env.DB.prepare(`SELECT metric,
    SUM(CASE WHEN reserved_at>=?4 THEN amount ELSE 0 END) AS grace_used,SUM(amount) AS used
    FROM plan_usage WHERE tenant_id=?1 AND status!='released'
      AND (month IN (?2,?3) OR (length(month)=7 AND reserved_at>=?2) OR reserved_at>=?4) GROUP BY metric`)
    .bind(tenant.id,paidWindow.key,paidWindow.carry,graceFrom).all<{metric:PlanMetric;used:number;grace_used:number}>();
  const used=Object.fromEntries(results.map(row=>[row.metric,graceEnd && limits[row.metric]===null ? row.grace_used : row.used]));
  const available=Object.fromEntries(usageMetrics.map(metric=>{
    const limit=graceEnd && limits[metric]===null ? PLANS.free[metric] : limits[metric];
    return [metric,limit===null ? null : Math.max(0,limit-(used[metric] || 0))];
  }));
  return {month:window.key,reset_at:graceEnd ? null : window.resetAt,grace_until:graceEnd ? new Date(graceEnd).toISOString() : null,limits,used,available};
}
