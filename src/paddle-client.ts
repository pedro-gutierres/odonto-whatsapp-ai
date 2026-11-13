import type { Env, Tenant } from './types';

export class PaddleApiError extends Error {
  constructor(public status:number, public code?:string) { super(`PADDLE_${status}`); }
}
export async function paddlePage(env: Env, path: string, body?: unknown, method?: string, timeoutMs = 10000) {
  const base = env.PADDLE_ENVIRONMENT === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  const response = await fetch(base + path, {method:method || (body ? 'POST':'GET'),signal:AbortSignal.timeout(timeoutMs),
    headers:{authorization:`Bearer ${env.PADDLE_API_KEY}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {error?:{code?:string}} | null;
    throw new PaddleApiError(response.status,payload?.error?.code);
  }
  return await response.json() as {data:any;meta?:{pagination?:{has_more?:boolean}}};
}
export async function paddle(env: Env, path: string, body?: unknown, method?: string, timeoutMs = 10000) {
  return (await paddlePage(env,path,body,method,timeoutMs)).data;
}
export async function ownedSubscription(env: Env, tenant: Tenant) {
  if (!tenant.paddle_subscription_id || !tenant.paddle_customer_id) throw new Error('PLAN_NOT_LINKED');
  const sub = await paddle(env,`/subscriptions/${tenant.paddle_subscription_id}`);
  if (sub.id !== tenant.paddle_subscription_id || sub.customer_id !== tenant.paddle_customer_id || sub.custom_data?.tenant_id !== tenant.id)
    throw new Error('PLAN_NOT_OWNED');
  return sub;
}
export async function withBillingLock<T>(env: Env, tenantId: string, action: () => Promise<T>) {
  const token = crypto.randomUUID(), now = Date.now();
  const lock = await env.DB.prepare('UPDATE tenants SET billing_lock_token=?2,billing_lock_until=?3 WHERE id=?1 AND billing_lock_until<=?4')
    .bind(tenantId,token,now+120000,now).run();
  if (!lock.meta.changes) throw new Error('BILLING_BUSY');
  try { return await action(); }
  finally { await env.DB.prepare('UPDATE tenants SET billing_lock_until=0,billing_lock_token=NULL WHERE id=?1 AND billing_lock_token=?2').bind(tenantId,token).run(); }
}
