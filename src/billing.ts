import type { Env, Tenant } from './types';
import { getTenantById } from './db';
import { jsonResponse } from './http';

export function billingEnabled(env: Env) {
  const sandbox = env.PADDLE_ENVIRONMENT === 'sandbox';
  const tokenPrefix = sandbox ? 'test_' : 'live_';
  const apiKeyPrefix = sandbox ? 'pdl_sdbx_apikey_' : 'pdl_live_apikey_';
  return env.PADDLE_ENABLED === 'true' && ['sandbox','live'].includes(env.PADDLE_ENVIRONMENT || '')
    && Boolean(env.PADDLE_API_KEY?.startsWith(apiKeyPrefix) && env.PADDLE_CLIENT_TOKEN?.startsWith(tokenPrefix)
      && env.PADDLE_WEBHOOK_SECRET && env.PADDLE_MONTHLY_PRICE_ID && env.PADDLE_YEARLY_PRICE_ID);
}
async function paddle(env: Env, path: string, body?: unknown, method?: string, timeoutMs = 10000) {
  const base = env.PADDLE_ENVIRONMENT === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  const response = await fetch(base + path, {method:method || (body ? 'POST':'GET'),signal:AbortSignal.timeout(timeoutMs),headers:{authorization:`Bearer ${env.PADDLE_API_KEY}`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
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

type PaddleSignatureResult = {valid:true} | {valid:false;reason:'missing_header'|'malformed_header'|'timestamp_outside_tolerance'|'hmac_mismatch';ageSeconds?:number};
export async function inspectPaddleSignature(raw: string, header: string | null, secret: string, now = Date.now()): Promise<PaddleSignatureResult> {
  if(!header) return {valid:false,reason:'missing_header'};
  const values=header.split(';').map(v=>v.trim());
  const timestamps=values.filter(v=>v.startsWith('ts='));
  const timestamp=timestamps[0]?.slice(3);
  const signatures=values.filter(v=>/^h1=[a-f0-9]{64}$/.test(v)).map(v=>v.slice(3));
  if(timestamps.length!==1||!timestamp||!/^\d+$/.test(timestamp)||!Number.isSafeInteger(Number(timestamp))||!Number.isFinite(now)||!signatures.length)
    return {valid:false,reason:'malformed_header'};
  const ageSeconds=now/1000-Number(timestamp);
  // Preserve Paddle's five-second replay protection in both directions.
  if(Math.abs(ageSeconds)>5)return {valid:false,reason:'timestamp_outside_tolerance',ageSeconds:Math.round(ageSeconds*1000)/1000};
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  for(const signature of signatures){
    const bytes=Uint8Array.from(signature.match(/../g)!,value=>parseInt(value,16));
    if(await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(timestamp+':'+raw)))return {valid:true};
  }
  return {valid:false,reason:'hmac_mismatch'};
}
export async function verifyPaddleSignature(raw:string,header:string|null,secret:string,now=Date.now()) {
  return (await inspectPaddleSignature(raw,header,secret,now)).valid;
}

export async function paddleWebhook(request: Request, env: Env) {
  if (request.method !== 'POST') return jsonResponse({error:'Método não permitido.'},405);
  if (!env.PADDLE_WEBHOOK_SECRET) return jsonResponse({error:'Webhook não configurado.'},503);
  const raw = await request.text();
  if (raw.length > 1000000) return jsonResponse({error:'Evento muito grande.'},413);
  const verification=await inspectPaddleSignature(raw,request.headers.get('Paddle-Signature'),env.PADDLE_WEBHOOK_SECRET);
  if(!verification.valid){
    // Never log the header, secret or payload. Keep the external error generic.
    console.warn('[PADDLE_SIGNATURE_REJECTED]',JSON.stringify(verification));
    return jsonResponse({error:'Assinatura inválida.'},401);
  }
  if (env.PADDLE_ENVIRONMENT !== 'live' && env.PADDLE_SANDBOX_ENTITLEMENTS !== 'true')
    return jsonResponse({received:true,sandbox_access_disabled:true});
  let event:any;try{event=JSON.parse(raw);}catch{return jsonResponse({error:'JSON inválido.'},400);}
  if(!event||typeof event!=='object')return jsonResponse({error:'Evento inválido.'},400);
  if(typeof event.event_type!=='string'||(!event.event_type.startsWith('subscription.')&&event.event_type!=='transaction.completed'))return jsonResponse({received:true});
  const paymentCompleted=event.event_type==='transaction.completed';
  const data=event.data,custom=data?.custom_data;
  if(typeof event.event_id!=='string'||!event.event_id||event.event_id.length>200||!Number.isFinite(Date.parse(event.occurred_at))
    ||typeof data?.id!=='string'||!data.id.startsWith(paymentCompleted?'txn_':'sub_'))return jsonResponse({error:'Evento inválido.'},400);
  try {
    const intent=typeof custom?.checkout_intent==='string'?await env.DB.prepare('SELECT tenant_id FROM checkout_intents WHERE id=?1').bind(custom.checkout_intent).first<{tenant_id:string}>():null;
    if(!intent||intent.tenant_id!==custom?.tenant_id)return jsonResponse({error:'Contratação não reconhecida.'},409);
    const snapshot={event_id:event.event_id,event_type:event.event_type,occurred_at:event.occurred_at,data:{
      id:data.id,status:data.status,subscription_id:data.subscription_id,customer_id:data.customer_id,
      custom_data:{tenant_id:intent.tenant_id,checkout_intent:custom.checkout_intent},
      items:Array.isArray(data.items)?data.items.map((item:any)=>({price:{id:item?.price?.id}})):[],
      scheduled_change:data.scheduled_change?{action:data.scheduled_change.action,effective_at:data.scheduled_change.effective_at}:null,
      updated_at:data.updated_at
    }};
    await env.DB.prepare(`INSERT INTO paddle_webhook_inbox(event_id,tenant_id,environment,payload_json)
      VALUES (?1,?2,?3,?4) ON CONFLICT(event_id) DO UPDATE SET status='pending',next_attempt_at=0,last_error_code=NULL
      WHERE paddle_webhook_inbox.status='rejected'`)
      .bind(event.event_id,intent.tenant_id,env.PADDLE_ENVIRONMENT==='live'?'live':'sandbox',JSON.stringify(snapshot)).run();
    return jsonResponse({received:true,queued:true});
  } catch {
    console.error('[PADDLE_RECEIPT_FAILED]',JSON.stringify({eventId:event.event_id,reason:'storage_unavailable'}));
    return jsonResponse({error:'Não foi possível registrar o evento. Tente novamente.'},503);
  }
}

// Only called for authenticated snapshots persisted by the receiver, never via a public route.
async function processPaddleEvent(event:any,env:Env) {
  const paymentCompleted = event.event_type === 'transaction.completed';
  if (typeof event.event_type !== 'string' || (!event.event_type.startsWith('subscription.') && !paymentCompleted)) return jsonResponse({received:true});
  let data=event.data;
  const custom=data?.custom_data;
  if (typeof event.event_id!=='string' || !Number.isFinite(Date.parse(event.occurred_at))
    || !data?.id?.startsWith(paymentCompleted ? 'txn_' : 'sub_')) return jsonResponse({error:'Evento inválido.'},400);
  const intent = typeof custom?.checkout_intent==='string' ? await env.DB.prepare('SELECT * FROM checkout_intents WHERE id=?1').bind(custom.checkout_intent).first<any>() : null;
  if (!intent || intent.tenant_id!==custom?.tenant_id) return jsonResponse({error:'Contratação não reconhecida.'},409);
  const tenant = await getTenantById(env.DB,intent.tenant_id);
  if (!tenant) return jsonResponse({error:'Vínculo de assinatura inválido.'},409);
  const duplicate = await env.DB.prepare('SELECT event_id FROM billing_events WHERE event_id=?1').bind(event.event_id).first();
  if (duplicate) return jsonResponse({received:true});
  if (paymentCompleted) {
    if (data.status !== 'completed' || !data.subscription_id?.startsWith('sub_')) return jsonResponse({error:'Pagamento sem assinatura reconhecida.'},409);
    try { data = await paddle(env,`/subscriptions/${data.subscription_id}`,undefined,'GET',1500); }
    catch { return jsonResponse({error:'Não foi possível conferir a assinatura. A notificação deve ser reenviada.'},502); }
    if (data.custom_data?.tenant_id !== tenant.id || data.custom_data?.checkout_intent !== intent.id) return jsonResponse({error:'Vínculo de assinatura inválido.'},409);
  }
  if (tenant.paddle_subscription_id && tenant.paddle_subscription_id!==data.id && tenant.billing_status!=='canceled') return jsonResponse({error:'Vínculo de assinatura inválido.'},409);
  const priceIds = (data.items || []).map((item:any)=>item.price?.id);
  if (!priceIds.includes(intent.billing_cycle==='monthly'?env.PADDLE_MONTHLY_PRICE_ID:env.PADDLE_YEARLY_PRICE_ID)) return jsonResponse({error:'Preço não reconhecido.'},409);
  const validStates=['active','past_due','paused','canceled','trialing'];
  if (!validStates.includes(data.status)) return jsonResponse({error:'Condição de assinatura não reconhecida.'},400);
  // An active subscription alone is not proof of captured payment (Pix can be
  // deferred). Only a completed transaction authorizes a paid-through date.
  let paidEnd: string | null = null;
  if (data.status === 'active') {
    if (!env.PADDLE_API_KEY) return jsonResponse({error:'Conferência de pagamento indisponível.'},503);
    try {
      const transactions = await paddle(env,`/transactions?subscription_id=${encodeURIComponent(data.id)}&status=completed&per_page=1&order_by=billed_at%5BDESC%5D`,undefined,'GET',1500);
      const payment = Array.isArray(transactions) ? transactions[0] : null;
      const end = payment?.billing_period?.ends_at, start = payment?.billing_period?.starts_at;
      const expectedPrice = intent.billing_cycle==='monthly'?env.PADDLE_MONTHLY_PRICE_ID:env.PADDLE_YEARLY_PRICE_ID;
      if (payment?.status==='completed' && payment.subscription_id===data.id && payment.customer_id===data.customer_id
        && payment.custom_data?.tenant_id===tenant.id && payment.custom_data?.checkout_intent===intent.id
        && payment.items?.length===1 && payment.items[0].price?.id===expectedPrice && payment.items[0].quantity===1
        && typeof end==='string' && Number.isFinite(Date.parse(end)) && Number.isFinite(Date.parse(start)) && Date.parse(start)<Date.parse(end)) {
        paidEnd = new Date(end).toISOString();
      }
    } catch { return jsonResponse({error:'Não foi possível conferir o pagamento. A notificação deve ser reenviada.'},502); }
  }
  if (paymentCompleted && data.status==='active' && !paidEnd) {
    return jsonResponse({error:'A confirmação ainda não está disponível na consulta de pagamentos. A notificação deve ser reenviada.'},502);
  }
  const active=data.status==='active' && paidEnd !== null && Date.parse(paidEnd)>Date.now();
  const pending = data.status==='active' && !active;
  const status = active ? 'active' : pending && tenant.commercial_status!=='active' ? tenant.commercial_status : 'ended';
  const snapshotTime = paymentCompleted && Number.isFinite(Date.parse(data.updated_at)) ? Date.parse(data.updated_at) : 0;
  const occurred=new Date(Math.max(Date.parse(event.occurred_at),snapshotTime)).toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare(`UPDATE tenants SET commercial_status=?2,plan_status=?3,paddle_customer_id=?4,paddle_subscription_id=?5,
        subscription_ends_at=?6,billing_cycle=?7,billing_status=?8,billing_event_at=?9,renewal_canceled_at=?10
        WHERE id=?1 AND (billing_event_at IS NULL OR billing_event_at<?9
          OR (?11=1 AND billing_event_at=?9 AND billing_status='active' AND paddle_subscription_id=?5))`)
        .bind(tenant.id,status,active?'active':pending?tenant.plan_status:data.status==='past_due'?'past_due':'canceled',data.customer_id,data.id,paidEnd,intent.billing_cycle,data.status,occurred,data.scheduled_change?.action==='cancel'?data.scheduled_change.effective_at:null,paymentCompleted?1:0),
      env.DB.prepare('INSERT INTO billing_events(event_id,tenant_id,occurred_at,event_type) VALUES (?1,?2,?3,?4)').bind(event.event_id,tenant.id,occurred,event.event_type),
      env.DB.prepare("UPDATE checkout_intents SET status='completed' WHERE id=?1").bind(intent.id),
    ]);
    return jsonResponse({received:true});
  } catch (error) {
    if (String(error).includes('UNIQUE') && await env.DB.prepare('SELECT event_id FROM billing_events WHERE event_id=?1').bind(event.event_id).first())
      return jsonResponse({received:true});
    console.error('[PADDLE_WEBHOOK]',String(error));return jsonResponse({error:'Falha ao registrar evento.'},500);
  }
}

export async function processPaddleInbox(env:Env,now=Date.now()) {
  if(env.PADDLE_ENVIRONMENT!=='live'&&env.PADDLE_SANDBOX_ENTITLEMENTS!=='true')return {processed:0};
  const environment=env.PADDLE_ENVIRONMENT==='live'?'live':'sandbox';
  const {results}=await env.DB.prepare(`SELECT event_id FROM paddle_webhook_inbox WHERE environment=?1 AND
    ((status='pending' AND next_attempt_at<=?2) OR (status='processing' AND lease_until<=?2))
    ORDER BY received_at,event_id LIMIT 5`).bind(environment,now).all<{event_id:string}>();
  let processed=0;
  for(const item of results||[]) {
    const lease=crypto.randomUUID();
    const claimed=await env.DB.prepare(`UPDATE paddle_webhook_inbox SET status='processing',attempts=attempts+1,lease_until=?3,lease_token=?4
      WHERE event_id=?1 AND environment=?5 AND ((status='pending' AND next_attempt_at<=?2) OR (status='processing' AND lease_until<=?2))`)
      .bind(item.event_id,now,now+120000,lease,environment).run();
    if(!claimed.meta.changes)continue;
    const job=await env.DB.prepare('SELECT payload_json,attempts FROM paddle_webhook_inbox WHERE event_id=?1 AND lease_token=?2')
      .bind(item.event_id,lease).first<{payload_json:string;attempts:number}>();
    if(!job)continue;
    let status=500;
    try {status=(await processPaddleEvent(JSON.parse(job.payload_json),env)).status;} catch { /* Lease recovery also handles worker termination. */ }
    const complete=status>=200&&status<300;
    const rejected=status===400||status===409;
    const state=complete?'completed':rejected?'rejected':'pending';
    const error=complete?null:'PROCESSING_HTTP_'+status;
    await env.DB.prepare(`UPDATE paddle_webhook_inbox SET status=?3,last_error_code=?4,next_attempt_at=?5,lease_token=NULL,lease_until=0,
      completed_at=CASE WHEN ?3='completed' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NULL END
      WHERE event_id=?1 AND lease_token=?2`)
      .bind(item.event_id,lease,state,error,now+Math.min(60*2**Math.min(job.attempts-1,6),3600)*1000).run();
    console[complete?'log':rejected?'error':'warn']('[PADDLE_PROCESSING]',JSON.stringify({eventId:item.event_id,status:state,attempt:job.attempts,error}));
    processed++;
  }
  return {processed};
}
