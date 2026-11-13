import type { Env, Tenant } from './types';
import { getTenantById } from './db';
import { jsonResponse } from './http';

export { billingEnabled, handleBilling } from './plan-billing';
import { reconcilePlanChanges } from './plan-billing';
import { paddle, withBillingLock } from './paddle-client';
import { offerForPrice, storedTier } from './plans';

const adjustmentEvents=['adjustment.created','adjustment.updated'];
const paymentCoversPeriod=(payment:any)=>!payment?.origin || ['api','web','subscription_recurring'].includes(payment.origin);
async function review(env:Env,tenantId:string,id:string,reason:string) {
  await env.DB.prepare('INSERT OR IGNORE INTO billing_reviews(id,tenant_id,reason) VALUES (?1,?2,?3)').bind(id,tenantId,reason).run();
}
function refreshRevocation(env:Env,transactionId:string) {
  return env.DB.prepare(`UPDATE tenants SET paid_access_revoked=EXISTS(
    SELECT 1 FROM billing_adjustments a WHERE a.transaction_id=?1 AND a.status='approved'
    AND ((a.action='refund' AND a.kind='full') OR (a.action='chargeback' AND NOT EXISTS(
      SELECT 1 FROM billing_adjustments r WHERE r.transaction_id=a.transaction_id AND r.action='chargeback_reverse'
        AND r.status='approved' AND r.occurred_at>=a.occurred_at)))
  ) WHERE paid_transaction_id=?1`).bind(transactionId);
}
async function processAdjustment(env:Env,event:any) {
  const data=event.data;
  if (!['refund','chargeback','chargeback_reverse'].includes(data.action)) return jsonResponse({received:true});
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO billing_adjustments(id,transaction_id,action,kind,status,occurred_at)
      VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET status=excluded.status,occurred_at=excluded.occurred_at
      WHERE billing_adjustments.occurred_at<excluded.occurred_at`)
      .bind(data.id,data.transaction_id,data.action,data.type || '',data.status,new Date(event.occurred_at).toISOString()),
    refreshRevocation(env,data.transaction_id),
  ]);
  if (data.action==='refund' && data.type==='partial' && data.status==='approved')
    await review(env,event.tenant_id,data.id,'partial_refund');
  return jsonResponse({received:true});
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

export async function paddleWebhook(request: Request, env: Env, ctx?: ExecutionContext) {
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
  const adjustment=adjustmentEvents.includes(event.event_type);
  if(typeof event.event_type!=='string'||(!event.event_type.startsWith('subscription.')&&event.event_type!=='transaction.completed'&&!adjustment))return jsonResponse({received:true});
  const paymentCompleted=event.event_type==='transaction.completed';
  const data=event.data,custom=data?.custom_data;
  if(typeof event.event_id!=='string'||!event.event_id||event.event_id.length>200||!Number.isFinite(Date.parse(event.occurred_at))
    ||typeof data?.id!=='string'||!data.id.startsWith(adjustment?'adj_':paymentCompleted?'txn_':'sub_'))return jsonResponse({error:'Evento inválido.'},400);
  try {
    if (adjustment && (typeof data.transaction_id!=='string' || !data.transaction_id.startsWith('txn_') || typeof data.status!=='string'))
      return jsonResponse({error:'Ajuste inválido.'},400);
    const intent=adjustment
      ? await env.DB.prepare(`SELECT id AS tenant_id FROM tenants WHERE paddle_subscription_id=?1 AND paddle_customer_id=?2
        UNION SELECT tenant_id FROM billing_payments WHERE transaction_id=?3 LIMIT 1`).bind(data.subscription_id ?? null,data.customer_id ?? null,data.transaction_id).first<{tenant_id:string}>()
      : typeof custom?.checkout_intent==='string'?await env.DB.prepare('SELECT tenant_id FROM checkout_intents WHERE id=?1').bind(custom.checkout_intent).first<{tenant_id:string}>():null;
    if(adjustment && !intent) return jsonResponse({error:'Aguardando vínculo da transação.'},503);
    if(!intent||(!adjustment && intent.tenant_id!==custom?.tenant_id))return jsonResponse({error:'Contratação não reconhecida.'},409);
    const snapshot={event_id:event.event_id,event_type:event.event_type,occurred_at:event.occurred_at,tenant_id:intent.tenant_id,
      data:adjustment ? {id:data.id,transaction_id:data.transaction_id,action:data.action,type:data.type,status:data.status} : {
      id:data.id,status:data.status,subscription_id:data.subscription_id,customer_id:data.customer_id,
      custom_data:{tenant_id:intent.tenant_id,checkout_intent:custom.checkout_intent},
      items:Array.isArray(data.items)?data.items.map((item:any)=>({price:{id:item?.price?.id},quantity:item?.quantity})):[],
      scheduled_change:data.scheduled_change?{action:data.scheduled_change.action,effective_at:data.scheduled_change.effective_at}:null,
      updated_at:data.updated_at,next_billed_at:data.next_billed_at
    }};
    await env.DB.prepare(`INSERT INTO paddle_webhook_inbox(event_id,tenant_id,environment,payload_json)
      VALUES (?1,?2,?3,?4) ON CONFLICT(event_id) DO UPDATE SET status='pending',next_attempt_at=0,last_error_code=NULL
      WHERE paddle_webhook_inbox.status='rejected'`)
      .bind(event.event_id,intent.tenant_id,env.PADDLE_ENVIRONMENT==='live'?'live':'sandbox',JSON.stringify(snapshot)).run();
    // The durable row is also picked up by cron if this invocation is interrupted.
    ctx?.waitUntil(processPaddleInbox(env, Date.now(), event.event_id).catch(() => {
      console.error('[PADDLE_BACKGROUND_FAILED]', JSON.stringify({eventId:event.event_id}));
    }));
    return jsonResponse({received:true,queued:true});
  } catch {
    console.error('[PADDLE_RECEIPT_FAILED]',JSON.stringify({eventId:event.event_id,reason:'storage_unavailable'}));
    return jsonResponse({error:'Não foi possível registrar o evento. Tente novamente.'},503);
  }
}

// Only called for authenticated snapshots persisted by the receiver, never via a public route.
async function processPaddleEvent(event:any,env:Env) {
  if (adjustmentEvents.includes(event.event_type)) return processAdjustment(env,event);
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
  if (tenant.paddle_subscription_id && tenant.paddle_subscription_id!==data.id && tenant.billing_status!=='canceled') {
    if (paymentCompleted) await review(env,tenant.id,event.data.id,'duplicate_subscription');
    return jsonResponse({error:'Vínculo de assinatura inválido.'},409);
  }
  const selectedPrice = data.items?.length===1 ? await offerForPrice(env,data.items[0].price?.id) : null;
  if (!selectedPrice || data.items[0].quantity !== undefined && data.items[0].quantity !== 1) {
    if (paymentCompleted) await review(env,tenant.id,event.data.id,'unknown_price');
    return jsonResponse({error:'Preço não reconhecido.'},409);
  }
  if (tenant.paddle_subscription_id!==data.id && intent.plan_tier &&
    ((intent.offer_id ? selectedPrice.id!==intent.offer_id : storedTier(selectedPrice.plan_id)!==intent.plan_tier) || selectedPrice.cycle!==intent.billing_cycle))
    return jsonResponse({error:'Preço divergente do checkout.'},409);
  const validStates=['active','past_due','paused','canceled','trialing'];
  if (!validStates.includes(data.status)) return jsonResponse({error:'Condição de assinatura não reconhecida.'},400);
  const knownPriceId = data.items[0].price.id;
  // An active subscription alone is not proof of captured payment (Pix can be
  // deferred). Only a completed transaction authorizes a paid-through date.
  let paidEnd: string | null = null;
  let paidStart: string | null = null;
  let paidPlan: Awaited<ReturnType<typeof offerForPrice>> = null;
  let paidPriceId: string | null = null;
  let transactionId: string | null = null;
  let paidAmount: number | null = null;
  let payment:any;
  if (data.status === 'active' || paymentCompleted) {
    if (!env.PADDLE_API_KEY) return jsonResponse({error:'Conferência de pagamento indisponível.'},503);
    try {
      if (paymentCompleted) payment=await paddle(env,`/transactions/${encodeURIComponent(event.data.id)}`,undefined,'GET',1500);
      else {
        const transactions=await paddle(env,`/transactions?subscription_id=${encodeURIComponent(data.id)}&status=completed&per_page=30&order_by=billed_at%5BDESC%5D`,undefined,'GET',1500);
        payment=transactions?.find((item:any)=>item.billing_period && paymentCoversPeriod(item));
      }
      const end = payment?.billing_period?.ends_at, start = payment?.billing_period?.starts_at;
      // Subscription items may already contain a future plan. Only the price
      // on a captured transaction determines today's entitlement.
      const receiptPlan = payment?.items?.length===1 ? await offerForPrice(env,payment.items[0].price?.id) : null;
      if (payment?.status==='completed' && payment.subscription_id===data.id && payment.customer_id===data.customer_id
        && payment.custom_data?.tenant_id===tenant.id && payment.custom_data?.checkout_intent===intent.id
        && receiptPlan && payment.items[0].quantity===1
        && (!paymentCompleted || payment.id===event.data.id)
        && (tenant.paddle_subscription_id===data.id || (payment.id===intent.transaction_id && payment.items[0].price.id===knownPriceId))
        && typeof end==='string' && Number.isFinite(Date.parse(end)) && Number.isFinite(Date.parse(start)) && Date.parse(start)<Date.parse(end)
        && Date.parse(start)<=Date.now() && paymentCoversPeriod(payment)) {
        const price=payment.items[0].price.id;
        const initial=payment.id===intent.transaction_id;
        const scheduled=await env.DB.prepare(`SELECT price_id,expected_amount FROM plan_changes
          WHERE subscription_id=?1 AND status IN ('prepared','applied','completed') AND julianday(effective_at)=julianday(?2)
          ORDER BY created_at DESC LIMIT 1`).bind(data.id,start).first<{price_id:string;expected_amount:number|null}>();
        const expectedPrice=initial ? intent.price_id : scheduled?.price_id || tenant.plan_price_id;
        const totals=payment.details?.totals;
        const maximum=initial ? intent.expected_amount : scheduled?.expected_amount ?? (receiptPlan.legacy ? null : receiptPlan[receiptPlan.cycle]);
        const amount=totals?.grand_total != null ? Number(totals.grand_total) : null;
        const original=await env.DB.prepare(`SELECT transaction_id FROM billing_payments WHERE subscription_id=?1
          AND starts_at<?3 AND ends_at>?2 ORDER BY starts_at DESC LIMIT 1`)
          .bind(data.id,new Date(start).toISOString(),new Date(end).toISOString()).first<string>('transaction_id');
        if ((original && original!==payment.id) || (expectedPrice && expectedPrice!==price)
          || (amount!==null && (!Number.isSafeInteger(amount) || amount<0 || totals.currency_code!=='BRL'
            || (maximum!==null && maximum!==undefined && amount>maximum)
            || (scheduled?.expected_amount!=null && amount!==scheduled.expected_amount)))
          || ((intent.offer_id || scheduled?.expected_amount!=null) && amount===null)) {
          await review(env,tenant.id,payment.id,original && original!==payment.id ? 'duplicate_payment' : 'unexpected_payment');
          if (paymentCompleted) return jsonResponse({received:true,review:true});
        } else {
          paidEnd = new Date(end).toISOString();
          paidStart = new Date(start).toISOString();
          paidPlan = receiptPlan;
          paidPriceId = payment.items[0].price.id;
          transactionId=payment.id;
          paidAmount=amount;
        }
      }
    } catch { return jsonResponse({error:'Não foi possível conferir o pagamento. A notificação deve ser reenviada.'},502); }
  }
  if (paymentCompleted && !paidEnd) {
    // Portal payment-method verifications and other non-period charges do not extend service.
    if (payment?.status==='completed' && ['subscription_charge','subscription_update','subscription_payment_method_change'].includes(payment.origin))
      return jsonResponse({received:true});
    return jsonResponse({error:'A confirmação ainda não está disponível na consulta de pagamentos. A notificação deve ser reenviada.'},502);
  }
  // A past-due/paused/canceled renewal does not erase a period already paid.
  if (tenant.paddle_subscription_id===data.id && tenant.subscription_ends_at
    && (!paidEnd || Date.parse(tenant.subscription_ends_at!)>Date.parse(paidEnd))) {
    paidEnd=tenant.subscription_ends_at!;paidStart=tenant.subscription_starts_at || null;
    paidPriceId=tenant.plan_price_id || null;
    paidPlan=null;transactionId=null;
  }
  const active=paidEnd !== null && Date.parse(paidEnd)>Date.now();
  const pending = data.status==='active' && !active;
  const status = active ? 'active' : pending && tenant.commercial_status!=='active' ? tenant.commercial_status : 'ended';
  const snapshotTime = paymentCompleted && Number.isFinite(Date.parse(data.updated_at)) ? Date.parse(data.updated_at) : 0;
  const occurred=new Date(Math.max(Date.parse(event.occurred_at),snapshotTime)).toISOString();
  try {
    await env.DB.batch([
      ...(transactionId && paidPlan ? [env.DB.prepare(`INSERT OR IGNORE INTO billing_payments(transaction_id,tenant_id,subscription_id,offer_id,price_id,starts_at,ends_at,amount)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`).bind(transactionId,tenant.id,data.id,paidPlan.id,paidPriceId,paidStart,paidEnd,paidAmount)] : []),
      ...(transactionId ? [env.DB.prepare(`UPDATE tenants SET paid_transaction_id=?2
        WHERE id=?1 AND paddle_subscription_id=?3 AND paid_transaction_id IS NULL
          AND julianday(subscription_ends_at)=julianday(?4) AND plan_price_id=?5`).bind(tenant.id,transactionId,data.id,paidEnd,paidPriceId)] : []),
      env.DB.prepare(`UPDATE tenants SET commercial_status=?2,plan_status=?3,paddle_customer_id=?4,paddle_subscription_id=?5,
        subscription_ends_at=?6,billing_cycle=?7,billing_status=?8,billing_event_at=?9,renewal_canceled_at=?10,
        plan_tier=COALESCE(?12,plan_tier),subscription_starts_at=COALESCE(?13,subscription_starts_at),plan_price_id=COALESCE(?15,plan_price_id),
        plan_offer_id=COALESCE(?16,plan_offer_id),paid_transaction_id=COALESCE(?17,paid_transaction_id),
        quota_anchor_at=COALESCE(quota_anchor_at,CASE WHEN ?17 IS NOT NULL THEN ?13 END),
        quota_bridge_at=COALESCE(quota_bridge_at,CASE WHEN ?17 IS NOT NULL AND quota_anchor_at IS NULL THEN ?13 END),
        billing_next_at=CASE WHEN billing_event_at IS NULL OR billing_event_at<=?9 THEN ?18 ELSE billing_next_at END,
        auto_renew=CASE WHEN ?10 IS NOT NULL OR ?8='canceled' THEN 0
          WHEN paddle_subscription_id IS NULL OR paddle_subscription_id!=?5 THEN ?14
          WHEN renewal_canceled_at IS NOT NULL AND ?8='active' AND ?10 IS NULL THEN 1 ELSE auto_renew END
        WHERE id=?1 AND (billing_event_at IS NULL OR billing_event_at<?9
          OR (billing_event_at=?9 AND paddle_subscription_id=?5 AND ?17 IS NOT NULL
            AND (subscription_ends_at IS NULL OR julianday(subscription_ends_at)<julianday(?6))))`)
        .bind(tenant.id,status,active?'active':pending?tenant.plan_status:data.status==='past_due'?'past_due':'canceled',data.customer_id,data.id,paidEnd,paidPlan?.cycle || tenant.billing_cycle || intent.billing_cycle,data.status,occurred,data.scheduled_change?.action==='cancel'?data.scheduled_change.effective_at:null,paymentCompleted?1:0,paidPlan ? storedTier(paidPlan.plan_id) : null,paidStart,intent.auto_renew ?? 1,paidPriceId,paidPlan?.id ?? null,transactionId,data.next_billed_at ?? null),
      ...(transactionId ? [refreshRevocation(env,transactionId)] : []),
      env.DB.prepare('INSERT INTO billing_events(event_id,tenant_id,occurred_at,event_type) VALUES (?1,?2,?3,?4)').bind(event.event_id,tenant.id,occurred,event.event_type),
      env.DB.prepare("UPDATE checkout_intents SET status='completed' WHERE id=?1 AND ?2 IS NOT NULL").bind(intent.id,transactionId),
      // Complete the queue only when a matching future period was actually paid.
      env.DB.prepare(`UPDATE plan_changes SET status='completed' WHERE tenant_id=?1 AND status IN ('prepared','applied')
        AND plan_tier=?2 AND billing_cycle=?5 AND price_id=?6 AND subscription_id=?7 AND julianday(effective_at)<=julianday(?3)
        AND EXISTS(SELECT 1 FROM tenants WHERE id=?1 AND billing_event_at=?4 AND plan_tier=?2 AND subscription_starts_at=?3)`)
        .bind(tenant.id,paidPlan ? storedTier(paidPlan.plan_id) : '',paidStart,occurred,paidPlan?.cycle||'',paidPriceId,data.id),
      ...(paidPlan ? [env.DB.prepare(`UPDATE plan_offer_migrations SET status='completed'
        WHERE tenant_id=?1 AND subscription_id=?2 AND target_offer_id=?3 AND status='accepted'
          AND julianday(effective_at)<=julianday(?4) AND EXISTS(SELECT 1 FROM tenants WHERE id=?1 AND paid_transaction_id=?5)`)
        .bind(tenant.id,data.id,paidPlan.id,paidStart,transactionId)] : []),
      env.DB.prepare(`UPDATE plan_changes SET status='completed' WHERE tenant_id=?1 AND plan_tier='free' AND status='applied'
        AND julianday(effective_at)<=julianday('now')`).bind(tenant.id),
    ]);
    return jsonResponse({received:true});
  } catch (error) {
    if (String(error).includes('UNIQUE') && await env.DB.prepare('SELECT event_id FROM billing_events WHERE event_id=?1').bind(event.event_id).first())
      return jsonResponse({received:true});
    console.error('[PADDLE_WEBHOOK]',String(error));return jsonResponse({error:'Falha ao registrar evento.'},500);
  }
}

export async function processPaddleInbox(env:Env,now=Date.now(),eventId:string|null=null) {
  if(env.PADDLE_ENVIRONMENT!=='live'&&env.PADDLE_SANDBOX_ENTITLEMENTS!=='true')return {processed:0};
  const environment=env.PADDLE_ENVIRONMENT==='live'?'live':'sandbox';
  const {results}=await env.DB.prepare(`SELECT event_id FROM paddle_webhook_inbox WHERE environment=?1 AND (?3 IS NULL OR event_id=?3) AND
    ((status='pending' AND next_attempt_at<=?2) OR (status='processing' AND lease_until<=?2))
    ORDER BY received_at,event_id LIMIT 5`).bind(environment,now,eventId).all<{event_id:string}>();
  let processed=0;
  for(const item of results||[]) {
    const lease=crypto.randomUUID();
    const claimed=await env.DB.prepare(`UPDATE paddle_webhook_inbox SET status='processing',attempts=attempts+1,lease_until=?3,lease_token=?4
      WHERE event_id=?1 AND environment=?5 AND ((status='pending' AND next_attempt_at<=?2) OR (status='processing' AND lease_until<=?2))`)
      .bind(item.event_id,now,now+120000,lease,environment).run();
    if(!claimed.meta.changes)continue;
    const job=await env.DB.prepare('SELECT payload_json,attempts,tenant_id FROM paddle_webhook_inbox WHERE event_id=?1 AND lease_token=?2')
      .bind(item.event_id,lease).first<{payload_json:string;attempts:number;tenant_id:string}>();
    if(!job)continue;
    let status=500;
    try {status=await withBillingLock(env,job.tenant_id,async()=>(await processPaddleEvent(JSON.parse(job.payload_json),env)).status);}
    catch { /* Lease recovery also handles worker termination. */ }
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
  if (!eventId) {
    await reconcileRenewals(env,now);
    await reconcilePlanChanges(env);
  }
  return {processed};
}

async function reconcileRenewals(env:Env,now:number) {
  if (!env.PADDLE_API_KEY) return;
  const {results}=await env.DB.prepare(`SELECT id,paddle_subscription_id FROM tenants
    WHERE paddle_subscription_id IS NOT NULL AND subscription_ends_at IS NOT NULL
      AND billing_recheck_at<=?1 AND billing_status IN ('active','past_due')
      AND (paid_transaction_id IS NULL OR julianday(subscription_ends_at)<=julianday(?2))
    ORDER BY billing_recheck_at LIMIT 5`).bind(now,new Date(now).toISOString()).all<{id:string;paddle_subscription_id:string}>();
  for (const row of results) {
    const claimed=await env.DB.prepare('UPDATE tenants SET billing_recheck_at=?2 WHERE id=?1 AND billing_recheck_at<=?3')
      .bind(row.id,now+15*60000,now).run();
    if (!claimed.meta.changes) continue;
    try {
      await withBillingLock(env,row.id,async()=>{
        const sub=await paddle(env,'/subscriptions/'+encodeURIComponent(row.paddle_subscription_id),undefined,'GET',1500);
        if (sub.id!==row.paddle_subscription_id || sub.custom_data?.tenant_id!==row.id) return;
        const updated=Date.parse(sub.updated_at);
        if (!Number.isFinite(updated)) return;
        // Use provider time so reconciliation cannot override a newer webhook snapshot.
        await processPaddleEvent({event_id:'reconcile:'+sub.id+':'+updated+':'+Math.floor(now/(15*60000)),
          event_type:'subscription.updated',occurred_at:new Date(updated).toISOString(),data:sub},env);
      });
    } catch { console.warn('[PADDLE_RECONCILIATION]',row.paddle_subscription_id); }
  }
}
