import type { Env, Tenant } from './types';
import { getTenantById } from './db';
import { jsonResponse } from './http';

function billingEnabled(env: Env) {
  return env.PADDLE_ENABLED === 'true' && ['sandbox','live'].includes(env.PADDLE_ENVIRONMENT || '')
    && Boolean(env.PADDLE_API_KEY && env.PADDLE_WEBHOOK_SECRET && env.PADDLE_CLIENT_TOKEN && env.PADDLE_MONTHLY_PRICE_ID && env.PADDLE_YEARLY_PRICE_ID);
}
async function paddle(env: Env, path: string, body?: unknown, method?: string) {
  const base = env.PADDLE_ENVIRONMENT === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  const response = await fetch(base + path, {method:method || (body ? 'POST':'GET'),headers:{authorization:`Bearer ${env.PADDLE_API_KEY}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if (!response.ok) throw new Error(`PADDLE_${response.status}`);
  return (await response.json() as any).data;
}
export async function handleBilling(request: Request, env: Env, tenant: Tenant, canManage: boolean) {
  const path = new URL(request.url).pathname;
  if (path === '/api/billing' && request.method === 'GET') return jsonResponse({
    enabled: billingEnabled(env), environment:env.PADDLE_ENVIRONMENT === 'live' ? 'live':'sandbox',
    offers: [{cycle:'monthly',amount:19900,currency:'BRL'},{cycle:'yearly',amount:214800,currency:'BRL'}],
    status:tenant.billing_status ?? null, ends_at:tenant.subscription_ends_at ?? null, renewal_canceled_at:tenant.renewal_canceled_at ?? null,
    has_subscription:Boolean(tenant.paddle_subscription_id),
  });
  if (request.method !== 'POST') return jsonResponse({error:'Método não permitido.'},405);
  if (!canManage) return jsonResponse({error:'Somente o responsável pode contratar ou gerenciar o plano.'},403);
  if (!billingEnabled(env)) return jsonResponse({error:'A contratação automática ainda não está disponível.'},503);
  if (path === '/api/billing/portal') {
    if (!tenant.paddle_customer_id || !tenant.paddle_subscription_id) return jsonResponse({error:'Nenhuma assinatura vinculada.'},409);
    try {
      const session = await paddle(env,`/customers/${tenant.paddle_customer_id}/portal-sessions`,{subscription_ids:[tenant.paddle_subscription_id]});
      const url = session?.urls?.general?.overview;
      if (typeof url !== 'string' || !/^https:\/\/([a-z0-9-]+\.)*paddle\.com\//.test(url)) throw new Error('INVALID_PORTAL_URL');
      return jsonResponse({url});
    } catch { return jsonResponse({error:'Não foi possível abrir o gerenciamento da assinatura.'},502); }
  }
  if (path !== '/api/billing/checkout') return jsonResponse({error:'Rota não encontrada.'},404);
  let body:any;try{body=await request.json();}catch{return jsonResponse({error:'JSON inválido.'},400);}
  if (!['monthly','yearly'].includes(body?.cycle) || body.renewalAccepted !== true) return jsonResponse({error:'Escolha o ciclo e aceite a renovação automática do plano pago.'},400);
  if (tenant.paddle_subscription_id && tenant.billing_status!=='canceled') return jsonResponse({error:'Gerencie a assinatura existente para evitar cobrança duplicada.'},409);
  const priceId = body.cycle==='monthly'?env.PADDLE_MONTHLY_PRICE_ID:env.PADDLE_YEARLY_PRICE_ID;
  try {
    const price = await paddle(env,`/prices/${priceId}`);
    if (price.status!=='active' || price.unit_price?.currency_code!=='BRL'
      || Number(price.unit_price?.amount)!==(body.cycle==='monthly'?19900:214800)
      || price.billing_cycle?.interval!==(body.cycle==='monthly'?'month':'year') || price.billing_cycle?.frequency!==1 || price.trial_period)
      return jsonResponse({error:'O preço configurado não corresponde à oferta. A contratação está indisponível.'},503);
  } catch { return jsonResponse({error:'Não foi possível conferir o preço da assinatura.'},502); }
  const existing = await env.DB.prepare("SELECT id,transaction_id,billing_cycle FROM checkout_intents WHERE tenant_id=?1 AND status='pending'").bind(tenant.id).first<any>();
  if (existing) {
    if (!existing.transaction_id) return jsonResponse({error:'Há uma contratação em preparação. Aguarde alguns instantes.'},409);
    if (existing.billing_cycle !== body.cycle) {
      try {
        await paddle(env,`/transactions/${existing.transaction_id}`,{items:[{price_id:priceId,quantity:1}]},'PATCH');
        await env.DB.prepare("UPDATE checkout_intents SET billing_cycle=?2 WHERE id=?1 AND status='pending'").bind(existing.id,body.cycle).run();
      } catch { return jsonResponse({error:'O checkout já está em processamento. Conclua ou confira a contratação antes de mudar o ciclo.'},409); }
    }
    return jsonResponse({transactionId:existing.transaction_id,token:env.PADDLE_CLIENT_TOKEN,environment:env.PADDLE_ENVIRONMENT});
  }
  const intent = crypto.randomUUID();
  try {
    await env.DB.prepare('INSERT INTO checkout_intents(id,tenant_id,billing_cycle) VALUES (?1,?2,?3)').bind(intent,tenant.id,body.cycle).run();
    const transaction = await paddle(env,'/transactions',{
      items:[{price_id:body.cycle==='monthly'?env.PADDLE_MONTHLY_PRICE_ID:env.PADDLE_YEARLY_PRICE_ID,quantity:1}],
      collection_mode:'automatic',custom_data:{tenant_id:tenant.id,checkout_intent:intent},
    });
    if (!transaction?.id?.startsWith('txn_')) throw new Error('INVALID_TRANSACTION');
    await env.DB.prepare('UPDATE checkout_intents SET transaction_id=?2 WHERE id=?1').bind(intent,transaction.id).run();
    return jsonResponse({transactionId:transaction.id,token:env.PADDLE_CLIENT_TOKEN,environment:env.PADDLE_ENVIRONMENT});
  } catch {
    await env.DB.prepare("UPDATE checkout_intents SET status='failed' WHERE id=?1").bind(intent).run();
    return jsonResponse({error:'Não foi possível preparar o checkout. Nenhum plano foi liberado.'},502);
  }
}

export async function verifyPaddleSignature(raw: string, header: string | null, secret: string, now = Date.now()) {
  const values = (header || '').split(';').map(value=>value.trim());
  const timestamp = values.find(value=>value.startsWith('ts='))?.slice(3);
  const signatures = values.filter(value=>/^h1=[a-f0-9]{64}$/.test(value)).map(value=>value.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now/1000-Number(timestamp))>5 || !signatures.length) return false;
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const payload = new TextEncoder().encode(timestamp+':'+raw);
  for (const signature of signatures) {
    const bytes = Uint8Array.from(signature.match(/../g)!,value=>parseInt(value,16));
    if (await crypto.subtle.verify('HMAC',key,bytes,payload)) return true;
  }
  return false;
}

export async function paddleWebhook(request: Request, env: Env) {
  if (request.method !== 'POST') return jsonResponse({error:'Método não permitido.'},405);
  if (!env.PADDLE_WEBHOOK_SECRET) return jsonResponse({error:'Webhook não configurado.'},503);
  const raw = await request.text();
  if (raw.length > 1000000) return jsonResponse({error:'Evento muito grande.'},413);
  if (!await verifyPaddleSignature(raw,request.headers.get('Paddle-Signature'),env.PADDLE_WEBHOOK_SECRET)) return jsonResponse({error:'Assinatura inválida.'},401);
  if (env.PADDLE_ENVIRONMENT !== 'live' && env.PADDLE_SANDBOX_ENTITLEMENTS !== 'true')
    return jsonResponse({received:true,sandbox_access_disabled:true});
  let event:any;try{event=JSON.parse(raw);}catch{return jsonResponse({error:'JSON inválido.'},400);}
  if (typeof event.event_type !== 'string' || !event.event_type.startsWith('subscription.')) return jsonResponse({received:true});
  const data=event.data, custom=data?.custom_data;
  if (typeof event.event_id!=='string' || !Number.isFinite(Date.parse(event.occurred_at)) || !data?.id?.startsWith('sub_')) return jsonResponse({error:'Evento inválido.'},400);
  const intent = typeof custom?.checkout_intent==='string' ? await env.DB.prepare('SELECT * FROM checkout_intents WHERE id=?1').bind(custom.checkout_intent).first<any>() : null;
  if (!intent || intent.tenant_id!==custom?.tenant_id) return jsonResponse({error:'Contratação não reconhecida.'},409);
  const tenant = await getTenantById(env.DB,intent.tenant_id);
  if (!tenant || (tenant.paddle_subscription_id && tenant.paddle_subscription_id!==data.id && tenant.billing_status!=='canceled')) return jsonResponse({error:'Vínculo de assinatura inválido.'},409);
  const duplicate = await env.DB.prepare('SELECT event_id FROM billing_events WHERE event_id=?1').bind(event.event_id).first();
  if (duplicate) return jsonResponse({received:true});
  const priceIds = (data.items || []).map((item:any)=>item.price?.id);
  if (!priceIds.includes(intent.billing_cycle==='monthly'?env.PADDLE_MONTHLY_PRICE_ID:env.PADDLE_YEARLY_PRICE_ID)) return jsonResponse({error:'Preço não reconhecido.'},409);
  const validStates=['active','past_due','paused','canceled','trialing'];
  if (!validStates.includes(data.status)) return jsonResponse({error:'Condição de assinatura não reconhecida.'},400);
  const end=data.current_billing_period?.ends_at;
  const active=data.status==='active' && typeof end==='string' && Number.isFinite(Date.parse(end));
  const occurred=new Date(event.occurred_at).toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare(`UPDATE tenants SET commercial_status=?2,plan_status=?3,paddle_customer_id=?4,paddle_subscription_id=?5,
        subscription_ends_at=?6,billing_cycle=?7,billing_status=?8,billing_event_at=?9,renewal_canceled_at=?10
        WHERE id=?1 AND (billing_event_at IS NULL OR billing_event_at<?9)`)
        .bind(tenant.id,active?'active':'ended',active?'active':data.status==='past_due'?'past_due':'canceled',data.customer_id,data.id,active?new Date(end).toISOString():null,intent.billing_cycle,data.status,occurred,data.scheduled_change?.action==='cancel'?data.scheduled_change.effective_at:null),
      env.DB.prepare('INSERT INTO billing_events(event_id,tenant_id,occurred_at,event_type) VALUES (?1,?2,?3,?4)').bind(event.event_id,tenant.id,occurred,event.event_type),
      env.DB.prepare("UPDATE checkout_intents SET status='completed' WHERE id=?1").bind(intent.id),
    ]);
    return jsonResponse({received:true});
  } catch (error) {
    if (String(error).includes('UNIQUE')) return jsonResponse({received:true});
    console.error('[PADDLE_WEBHOOK]',String(error));return jsonResponse({error:'Falha ao registrar evento.'},500);
  }
}
