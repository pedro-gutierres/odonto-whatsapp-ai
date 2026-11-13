import type { Env, Tenant } from './types';
import { getTenantById } from './db';
import { jsonResponse } from './http';
import { PLANS, isPaidPlan, effectivePlan, priceIdFor, type BillingCycle, type PlanTier } from './plans';
import { paddle, paddlePage, PaddleApiError, ownedSubscription, withBillingLock } from './paddle-client';

export function paddleCheckoutAvailable(env:Env) {
  const sandbox = env.PADDLE_ENVIRONMENT === 'sandbox';
  return env.PADDLE_ENABLED === 'true' && ['sandbox','live'].includes(env.PADDLE_ENVIRONMENT || '')
    && Boolean(env.PADDLE_API_KEY?.startsWith(sandbox?'pdl_sdbx_apikey_':'pdl_live_apikey_')
      && env.PADDLE_CLIENT_TOKEN?.startsWith(sandbox?'test_':'live_') && env.PADDLE_WEBHOOK_SECRET);
}
export function billingEnabled(env: Env) {
  return paddleCheckoutAvailable(env) && Boolean(env.PADDLE_PRO_MONTHLY_PRICE_ID && env.PADDLE_PRO_YEARLY_PRICE_ID
      && env.PADDLE_ULTRA_MONTHLY_PRICE_ID && env.PADDLE_ULTRA_YEARLY_PRICE_ID);
}
type Selection = {plan:'pro'|'ultra';cycle:BillingCycle};
type PlanChange = {id:string;tenant_id:string;subscription_id:string;plan_tier:PlanTier;billing_cycle:BillingCycle;price_id:string|null;auto_renew:number;effective_at:string;status:string};
async function openChange(env:Env,tenantId:string) {
  return env.DB.prepare("SELECT * FROM plan_changes WHERE tenant_id=?1 AND status IN ('prepared','applied')").bind(tenantId).first<PlanChange>();
}

async function finishRenewalCancellation(env: Env, tenant: Tenant, sub: Awaited<ReturnType<typeof ownedSubscription>>) {
  const end = Date.parse(tenant.subscription_ends_at || '');
  if (sub.scheduled_change?.action !== 'cancel' || Date.parse(sub.scheduled_change.effective_at) !== end)
    throw new Error('RENEWAL_LOCKED');
  await env.DB.prepare('UPDATE tenants SET auto_renew=0,renewal_canceled_at=?2 WHERE id=?1')
    .bind(tenant.id,sub.scheduled_change.effective_at).run();

  const paidPrice = tenant.plan_price_id || (isPaidPlan(tenant.plan_tier) && ['monthly','yearly'].includes(tenant.billing_cycle || '')
    ? priceIdFor(env,tenant.plan_tier,tenant.billing_cycle === 'yearly' ? 'yearly' : 'monthly') : null);
  if (!paidPrice || sub.items?.length !== 1 || sub.items[0].quantity !== 1) throw new Error('RENEWAL_LOCKED');
  if (sub.items[0].price?.id !== paidPrice) try {
    const url = `/subscriptions/${sub.id}`;
    const body = {items:[{price_id:paidPrice,quantity:1}],proration_billing_mode:'do_not_bill'};
    const preview = await paddle(env,`${url}/preview`,body,'PATCH');
    if (preview.immediate_transaction || preview.next_transaction || preview.scheduled_change?.action !== 'cancel'
      || Date.parse(preview.scheduled_change.effective_at) !== end) throw new Error('UNSAFE_CANCELLATION');
    const updated = await paddle(env,url,body,'PATCH');
    if (updated.items?.length !== 1 || updated.items[0].price?.id !== paidPrice || updated.items[0].quantity !== 1
      || updated.scheduled_change?.action !== 'cancel' || Date.parse(updated.scheduled_change.effective_at) !== end)
      throw new Error('UNSAFE_CANCELLATION');
  } catch (error) {
    throw new Error('UNSAFE_CANCELLATION',{cause:error});
  }
  await env.DB.prepare("UPDATE plan_changes SET status='superseded' WHERE tenant_id=?1 AND subscription_id=?2 AND status='applied'")
    .bind(tenant.id,sub.id).run();
}
function paddlePortalUrl(value: unknown, environment?: string) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const host = environment === 'sandbox' ? 'sandbox-customer-portal.paddle.com' : 'customer-portal.paddle.com';
    if (url.protocol === 'https:' && !url.username && !url.password &&
      !url.port && url.hostname === host) return url.href;
  } catch { /* The provider may omit the URL. */ }
  return null;
}

class PaymentMethodChangeRequired extends Error {
  constructor(public url: string | null, currentPlan: PlanTier, targetPlan: 'pro' | 'ultra', pixRestricted: boolean) {
    const target = PLANS[targetPlan].name;
    super(pixRestricted
      ? `O Pix Automático do seu plano ${PLANS[currentPlan].name} autoriza apenas o valor atual. Para agendar o plano ${target}, adicione outro meio de pagamento na Paddle e volte a este checkout.`
      : `Para agendar o plano ${target}, atualize o meio de pagamento na Paddle e volte a este checkout.`);
  }
}

function canSelectFree(tenant: Tenant) {
  const hasPaidPeriod = Date.parse(tenant.subscription_ends_at || '') > Date.now();
  return !hasPaidPeriod && (!tenant.paddle_subscription_id || tenant.billing_status === 'canceled');
}
async function checkedPrice(env:Env,choice:Selection) {
  const id = priceIdFor(env,choice.plan,choice.cycle);
  const price = await paddle(env,`/prices/${id}`);
  if (price.id !== id || price.status !== 'active' || price.unit_price?.currency_code !== 'BRL'
    || Number(price.unit_price?.amount) !== PLANS[choice.plan][choice.cycle] || price.trial_period
    || price.billing_cycle?.interval !== (choice.cycle==='monthly'?'month':'year') || price.billing_cycle?.frequency !== 1
    || (price.unit_price_overrides?.length ?? 0) > 0 || price.tax_mode !== 'internal'
    || price.quantity?.minimum !== 1 || price.quantity?.maximum !== 1)
    throw new Error('PRICE_MISMATCH');
  return id!;
}
async function preview(env:Env,tenant:Tenant,choice:Selection) {
  const priceId = await checkedPrice(env,choice);
  const hasExisting = Boolean(tenant.paddle_subscription_id && (tenant.billing_status !== 'canceled' || Date.parse(tenant.subscription_ends_at || '')>Date.now()));
  let effectiveAt:string|null = null;
  let nextAmount:number|null=null;
  if (hasExisting) {
    const sub = await ownedSubscription(env,tenant);
    effectiveAt = tenant.subscription_ends_at || null;
    if (sub.status === 'active' && !effectiveAt) throw new Error('CHECKOUT_PROCESSING');
    const cancellation = sub.scheduled_change?.action === 'cancel';
    const periodBoundary = cancellation ? sub.scheduled_change.effective_at : sub.next_billed_at;
    if (sub.status !== 'active' || !effectiveAt || Date.parse(effectiveAt) <= Date.now()+1800000
      || Date.parse(periodBoundary) !== Date.parse(effectiveAt))
      throw new Error('RENEWAL_LOCKED');
    let result;
    try {
      // Keep Paddle's existing billing anchor. A locally stored timestamp has
      // millisecond precision and can be interpreted as a date change by Paddle.
      result = await paddle(env,`/subscriptions/${sub.id}/preview`,{
        items:[{price_id:priceId,quantity:1}],proration_billing_mode:'do_not_bill',
      },'PATCH');
    } catch (error) {
      if (error instanceof PaddleApiError && ['subscription_change_not_allowed_for_payment_method','subscription_missing_payment_method_cannot_update'].includes(error.code || '')) {
        throw new PaymentMethodChangeRequired(paddlePortalUrl(sub.management_urls?.update_payment_method,env.PADDLE_ENVIRONMENT), effectivePlan(tenant), choice.plan,
          error.code === 'subscription_change_not_allowed_for_payment_method');
      }
      if (cancellation && error instanceof PaddleApiError && error.status === 400) throw new Error('RENEWAL_DISABLED');
      throw error;
    }
    // A canceled renewal has no next charge to quote. Restoring it is a
    // separate user action and must never happen as a side effect of preview.
    if (cancellation) throw new Error('RENEWAL_DISABLED');
    // Refuse a preview that would bill now or move the already-paid renewal date.
    const next=result.next_transaction,totals=next?.details?.totals;
    nextAmount=Number(totals?.grand_total);
    if (result.immediate_transaction || Date.parse(result.next_billed_at) !== Date.parse(effectiveAt)
      || Date.parse(next?.billing_period?.starts_at)!==Date.parse(effectiveAt) || totals?.currency_code!=='BRL'
      || !Number.isSafeInteger(nextAmount) || nextAmount<0 || nextAmount>PLANS[choice.plan][choice.cycle]) throw new Error('UNSAFE_PREVIEW');
  }
  const summary = {plan:choice.plan,cycle:choice.cycle,autoRenew:true,priceId,
    amount:PLANS[choice.plan][choice.cycle],next_amount:nextAmount,currency:'BRL',scheduled:hasExisting,effective_at:effectiveAt};
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...summary,tenant:tenant.id,subscription:tenant.paddle_subscription_id})));
  return {...summary,fingerprint:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
}
export async function applyPlanChange(env:Env,change:PlanChange,tenant:Tenant) {
  const sub = await ownedSubscription(env,tenant);
  if (sub.id !== change.subscription_id || sub.status !== 'active') throw new Error('RENEWAL_LOCKED');
  if (change.plan_tier === 'free') {
    if (sub.scheduled_change?.action !== 'cancel') await paddle(env,`/subscriptions/${sub.id}/cancel`,{effective_from:'next_billing_period'});
  } else {
    const matches = sub.items?.length===1 && sub.items[0].price?.id===change.price_id && sub.items[0].quantity===1
      && Date.parse(sub.next_billed_at)===Date.parse(change.effective_at) && !sub.scheduled_change;
    if (!matches) {
      if (Date.parse(change.effective_at) <= Date.now()+1800000 || sub.scheduled_change
        || Date.parse(sub.next_billed_at)!==Date.parse(change.effective_at)) throw new Error('RENEWAL_LOCKED');
      const updated=await paddle(env,`/subscriptions/${sub.id}`,{items:[{price_id:change.price_id,quantity:1}],
        proration_billing_mode:'do_not_bill',on_payment_failure:'prevent_change'},'PATCH');
      if(updated.items?.length!==1 || updated.items[0].price?.id!==change.price_id || Date.parse(updated.next_billed_at)!==Date.parse(change.effective_at))
        throw new Error('UNEXPECTED_PLAN_CHANGE');
    }
  }
  await env.DB.batch([
    env.DB.prepare("UPDATE plan_changes SET status='applied' WHERE id=?1 AND status='prepared'").bind(change.id),
    env.DB.prepare('UPDATE tenants SET auto_renew=?2,renewal_canceled_at=?3 WHERE id=?1')
      .bind(tenant.id,change.auto_renew,change.plan_tier==='free'?change.effective_at:null),
  ]);
}
export async function handleBilling(request:Request,env:Env,tenant:Tenant,canManage:boolean) {
  const path = new URL(request.url).pathname;
  if (path === '/api/billing' && request.method === 'GET') {
    const change = await openChange(env,tenant.id);
    const pending = change?.plan_tier==='free' && Date.parse(change.effective_at)<=Date.now() ? null : change;
    const cancelingChange = Boolean(tenant.renewal_canceled_at && pending?.status==='applied' && isPaidPlan(pending.plan_tier));
    return jsonResponse({enabled:billingEnabled(env),can_open_portal:canManage && paddleCheckoutAvailable(env) && Boolean(tenant.paddle_customer_id),environment:env.PADDLE_ENVIRONMENT==='live'?'live':'sandbox',
      plans:PLANS,plan:effectivePlan(tenant),paid_plan:tenant.plan_tier,status:tenant.billing_status ?? null,
      can_select_free:canSelectFree(tenant),
      selected:Boolean(tenant.plan_tier || tenant.commercial_status==='free'),
      ends_at:tenant.subscription_ends_at ?? null,auto_renew:Boolean(tenant.paddle_subscription_id && ['active','past_due'].includes(tenant.billing_status || '') && !tenant.renewal_canceled_at && (tenant.auto_renew || pending?.status==='applied')),
      renewal_canceled:Boolean(tenant.renewal_canceled_at || tenant.billing_status==='canceled'),
      canceling_change:cancelingChange,has_subscription:Boolean(tenant.paddle_subscription_id),
      pending:pending?{plan:pending.plan_tier,cycle:pending.billing_cycle,effective_at:pending.effective_at,status:pending.status}:null},200,{'Cache-Control':'no-store'});
  }
  if (request.method !== 'POST') return jsonResponse({error:'Método não permitido.'},405);
  if (!canManage) return jsonResponse({error:'Somente o responsável pode gerenciar o plano.'},403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return jsonResponse({error:'Envie os dados em JSON.'},415);
  let body:any;try{body=await request.json();}catch{return jsonResponse({error:'JSON inválido.'},400);}
  if (!body || typeof body !== 'object') return jsonResponse({error:'Dados inválidos.'},400);
  if (path === '/api/billing/portal') {
    const headers = {'Cache-Control':'no-store'};
    if (!tenant.paddle_customer_id) return jsonResponse({error:'Ainda não há cobranças vinculadas a esta clínica.'},404,headers);
    if (!paddleCheckoutAvailable(env)) return jsonResponse({error:'O portal de cobrança está temporariamente indisponível.'},503,headers);
    try {
      const subscriptionId = tenant.paddle_subscription_id;
      const session = await paddle(env,`/customers/${encodeURIComponent(tenant.paddle_customer_id)}/portal-sessions`,{
        subscription_ids:subscriptionId ? [subscriptionId] : [],
      });
      const subscription = session.urls?.subscriptions?.find((entry:{id:string}) => entry.id === subscriptionId);
      const url = paddlePortalUrl(subscription?.view_subscription,env.PADDLE_ENVIRONMENT)
        ?? paddlePortalUrl(session.urls?.general?.overview,env.PADDLE_ENVIRONMENT);
      if (url) return jsonResponse({url},200,headers);
    } catch { /* Report a retryable error without including the session URL. */ }
    return jsonResponse({error:'Não foi possível abrir a cobrança na Paddle. Tente novamente.'},502,headers);
  }
  // Free needs no payment gateway and can be chosen even before Paddle is configured.
  if (path === '/api/billing/free') {
    const unavailable = () => jsonResponse({code:'FREE_UNAVAILABLE',error:'O Free fica disponível após o fim do plano pago.'},409);
    if (!canSelectFree(tenant)) return unavailable();
    try {return await withBillingLock(env,tenant.id,async()=>{
      const updated=await env.DB.prepare(`UPDATE tenants SET plan_tier='free',commercial_status='free',auto_renew=0 WHERE id=?1
        AND NOT COALESCE(julianday(subscription_ends_at)>julianday('now'),0)
        AND (paddle_subscription_id IS NULL OR billing_status='canceled')`).bind(tenant.id).run();
      return updated.meta.changes?jsonResponse({success:true}):unavailable();
    });}catch{return jsonResponse({error:'Há uma alteração em processamento. Aguarde.'},409);}
  }
  const requiresCatalog=path==='/api/billing/checkout'||path==='/api/billing/preview';
  if (!(requiresCatalog?billingEnabled(env):paddleCheckoutAvailable(env))) return jsonResponse({error:'O pagamento está temporariamente indisponível.'},503);
  try {
    return await withBillingLock(env,tenant.id,async()=>{
      tenant = (await getTenantById(env.DB,tenant.id))!;
      if (path === '/api/billing/renewal') {
        if (typeof body.enabled !== 'boolean') return jsonResponse({error:'Informe o estado da renovação.'},400);
        if(!isPaidPlan(effectivePlan(tenant)))throw new Error('RENEWAL_LOCKED');
        const pending = await openChange(env,tenant.id);
        if (pending?.status==='prepared') throw new Error('BILLING_BUSY');
        const sub = await ownedSubscription(env,tenant);
        if (sub.status !== 'active' || Date.parse(tenant.subscription_ends_at || '') <= Date.now()) throw new Error('RENEWAL_LOCKED');
        const canceled = sub.scheduled_change?.action==='cancel';
        if (!body.enabled) {
          const scheduled = canceled ? sub : await paddle(env,`/subscriptions/${sub.id}/cancel`,{effective_from:'next_billing_period'});
          await finishRenewalCancellation(env,tenant,scheduled);
          return jsonResponse({success:true});
        }
        const keepChange = Boolean(!canceled && pending && pending.plan_tier!=='free');
        const restorePrice = keepChange ? pending!.price_id : tenant.plan_price_id;
        if (canceled) {
          await finishRenewalCancellation(env,tenant,sub);
          const updated = await paddle(env,`/subscriptions/${sub.id}`,{scheduled_change:null},'PATCH');
          if (updated.scheduled_change || Date.parse(updated.next_billed_at)!==Date.parse(tenant.subscription_ends_at || ''))
            throw new Error('RENEWAL_LOCKED');
        } else if (restorePrice && sub.items?.[0]?.price?.id !== restorePrice) {
          await paddle(env,`/subscriptions/${sub.id}`,{
            items:[{price_id:restorePrice,quantity:1}],proration_billing_mode:'do_not_bill',
          },'PATCH');
        }
        await env.DB.batch([
          env.DB.prepare('UPDATE tenants SET auto_renew=1,renewal_canceled_at=NULL WHERE id=?1').bind(tenant.id),
          keepChange ? env.DB.prepare("UPDATE plan_changes SET auto_renew=1 WHERE tenant_id=?1 AND status='applied'").bind(tenant.id)
            : env.DB.prepare("UPDATE plan_changes SET status='superseded' WHERE tenant_id=?1 AND status='applied'").bind(tenant.id),
        ]);
        return jsonResponse({success:true});
      }
      if (!['/api/billing/checkout','/api/billing/preview'].includes(path)) return jsonResponse({error:'Rota não encontrada.'},404);
      if (!isPaidPlan(body.plan) || !['monthly','yearly'].includes(body.cycle))
        return jsonResponse({error:'Abra o checkout mensal ou anual na página Plano.'},400);
      const choice:Selection={plan:body.plan,cycle:body.cycle};
      if(effectivePlan(tenant)===choice.plan && tenant.plan_tier===choice.plan)
        return jsonResponse({error:'Esse já é seu plano atual.'},409);
      const summary = await preview(env,tenant,choice);
      if (path === '/api/billing/preview') return jsonResponse(summary);
      if (summary.scheduled) {
        if (body.fingerprint !== summary.fingerprint) return jsonResponse({error:'As condições mudaram. Confira a prévia novamente.'},409);
        const change:PlanChange={id:crypto.randomUUID(),tenant_id:tenant.id,subscription_id:tenant.paddle_subscription_id!,plan_tier:choice.plan,billing_cycle:choice.cycle,price_id:summary.priceId,auto_renew:1,effective_at:summary.effective_at!,status:'prepared'};
        await saveChange(env,change);
        await applyPlanChange(env,change,tenant);
        return jsonResponse({success:true,scheduled:true,effective_at:change.effective_at});
      }
      const existing = await env.DB.prepare("SELECT id,transaction_id,plan_tier,billing_cycle,auto_renew FROM checkout_intents WHERE tenant_id=?1 AND status='pending'")
        .bind(tenant.id).first<{id:string;transaction_id:string|null;plan_tier:PlanTier|null;billing_cycle:BillingCycle;auto_renew:number}>();
      const checkoutResult=(transactionId:string)=>jsonResponse({transactionId,token:env.PADDLE_CLIENT_TOKEN,environment:env.PADDLE_ENVIRONMENT});
      if (existing) {
        if (!existing.transaction_id) throw new Error('BILLING_BUSY');
        // Verify the actual transaction before allowing cycle/plan changes. A
        // completed/processing checkout is never replaced with another purchase.
        const transaction = await paddle(env,`/transactions/${existing.transaction_id}`);
        if (transaction.status!=='canceled') {
          if (!['draft','ready'].includes(transaction.status) || transaction.payments?.some((attempt:{status:string}) =>
            ['pending_no_action_required','authorized','authorized_flagged','captured'].includes(attempt.status))) throw new Error('CHECKOUT_PROCESSING');
          if (existing.plan_tier===choice.plan && existing.billing_cycle===choice.cycle && existing.auto_renew===1
            && transaction.items?.length===1 && transaction.items[0].price?.id===summary.priceId && transaction.items[0].quantity===1)
            return checkoutResult(existing.transaction_id);
          // A different offer gets its own transaction so a previously opened tab keeps its original price.
          const canceled = await paddle(env,`/transactions/${existing.transaction_id}`,{status:'canceled'},'PATCH');
          if (canceled.status!=='canceled') throw new Error('CHECKOUT_PROCESSING');
        }
        await env.DB.prepare("UPDATE checkout_intents SET status='failed' WHERE id=?1 AND status='pending'").bind(existing.id).run();
      }
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO checkout_intents(id,tenant_id,billing_cycle,plan_tier,auto_renew) VALUES (?1,?2,?3,?4,1)')
        .bind(id,tenant.id,choice.cycle,choice.plan).run();
      // A failed/ambiguous POST remains pending so a retry cannot charge twice.
      let transaction;
      try {
        transaction=await paddle(env,'/transactions',{items:[{price_id:summary.priceId,quantity:1}],collection_mode:'automatic',
          ...(tenant.paddle_customer_id?{customer_id:tenant.paddle_customer_id}:{}),custom_data:{tenant_id:tenant.id,checkout_intent:id,auto_renew:true}});
      } catch(error) {
        if(error instanceof PaddleApiError && [400,401,403,404,422].includes(error.status))
          await env.DB.prepare("UPDATE checkout_intents SET status='failed' WHERE id=?1 AND transaction_id IS NULL AND status='pending'").bind(id).run();
        throw error;
      }
      if (!transaction?.id?.startsWith('txn_')) throw new Error('INVALID_TRANSACTION');
      await env.DB.prepare('UPDATE checkout_intents SET transaction_id=?2 WHERE id=?1').bind(id,transaction.id).run();
      return checkoutResult(transaction.id);
    });
  } catch (error) {
    const code=String(error);
    if (error instanceof PaymentMethodChangeRequired) {
      return jsonResponse({code:'PAYMENT_METHOD_CHANGE_REQUIRED',error:error.message,update_payment_method_url:error.url},409,{'Cache-Control':'no-store'});
    }
    if (code.includes('RENEWAL_DISABLED')) {
      return jsonResponse({code:'RENEWAL_DISABLED',error:'Seu plano termina ao fim do período pago. Para agendar uma troca, abra “Gerenciar cobrança na Paddle” na página Plano, mantenha a renovação do plano atual e volte a este checkout.'},409);
    }
    if (code.includes('UNSAFE_PREVIEW')) {
      return jsonResponse({code:'PLAN_CHANGE_UNAVAILABLE',error:'A Paddle não conseguiu confirmar essa frequência para a data atual de renovação. Tente outra frequência.'},409);
    }
    if (code.includes('CHECKOUT_PROCESSING')) {
      return jsonResponse({code:'PAYMENT_PENDING',error:'Estamos conferindo o pagamento já iniciado. O plano será atualizado após a confirmação.'},409);
    }
    if (code.includes('UNSAFE_CANCELLATION')) {
      return jsonResponse({error:'A renovação foi desativada. Ainda estamos conferindo a remoção da troca de plano na Paddle.'},409);
    }
    const message=code.includes('PRICE_MISMATCH')?'O preço da Paddle não corresponde ao plano. Pagamento indisponível.'
      :code.includes('RENEWAL_LOCKED')?'A renovação está em processamento ou o plano precisa ser regularizado. Tente novamente após a atualização do período.'
      :code.includes('BILLING_BUSY')?'Há uma alteração em processamento. Aguarde a confirmação do plano.'
      :'Não foi possível confirmar a alteração do plano. Confira o status antes de tentar novamente.';
    return jsonResponse({error:message},code.includes('PRICE_MISMATCH')?503:error instanceof PaddleApiError && error.status>=500?502:409);
  }
}
async function saveChange(env:Env,change:PlanChange) {
  if ((await openChange(env,change.tenant_id))?.status==='prepared') throw new Error('BILLING_BUSY');
  await env.DB.batch([
    env.DB.prepare("UPDATE plan_changes SET status='superseded' WHERE tenant_id=?1 AND status='applied'").bind(change.tenant_id),
    env.DB.prepare('INSERT INTO plan_changes(id,tenant_id,subscription_id,plan_tier,billing_cycle,price_id,auto_renew,effective_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)')
      .bind(change.id,change.tenant_id,change.subscription_id,change.plan_tier,change.billing_cycle,change.price_id,change.auto_renew,change.effective_at),
  ]);
}
// Runs with the existing billing-only cron; all external writes are repeatable.
export async function reconcilePlanChanges(env:Env) {
  if (!paddleCheckoutAvailable(env)) return;
  await env.DB.prepare("UPDATE plan_changes SET status='completed' WHERE plan_tier='free' AND status='applied' AND julianday(effective_at)<=julianday('now')").run();
  const unresolved=await env.DB.prepare(`SELECT id,tenant_id,created_at FROM checkout_intents
    WHERE status='pending' AND transaction_id IS NULL AND julianday(created_at)<=julianday('now','-2 minutes') ORDER BY created_at LIMIT 5`)
    .all<{id:string;tenant_id:string;created_at:string}>();
  for(const intent of unresolved.results) {
    try {await withBillingLock(env,intent.tenant_id,async()=>{
      const since=new Date(intent.created_at.replace(' ','T')+'Z').toISOString();
      const until=new Date(Date.parse(since)+120000).toISOString();
      let after='';
      for(let page=0;page<5;page++){
        const result=await paddlePage(env,`/transactions?created_at%5BGTE%5D=${encodeURIComponent(since)}&created_at%5BLTE%5D=${encodeURIComponent(until)}&per_page=200${after?'&after='+encodeURIComponent(after):''}`);
        const match=result.data.find((item:any)=>item.custom_data?.checkout_intent===intent.id && item.custom_data?.tenant_id===intent.tenant_id);
        if(match || result.meta?.pagination?.has_more===false) {
          await env.DB.prepare("UPDATE checkout_intents SET transaction_id=?2,status=?3 WHERE id=?1 AND status='pending' AND transaction_id IS NULL")
            .bind(intent.id,match?.id??null,match&&match.status!=='canceled'?'pending':'failed').run();
          break;
        }
        after=result.data.at(-1)?.id;
        if(!after)break;
      }
    });}catch{console.warn('[CHECKOUT_INTENT_PENDING]',JSON.stringify({intentId:intent.id}));}
  }
  const {results}=await env.DB.prepare("SELECT * FROM plan_changes WHERE status='prepared' ORDER BY created_at LIMIT 5").all<PlanChange>();
  for (const change of results) {
    try { await withBillingLock(env,change.tenant_id,async()=>{
      const tenant=await getTenantById(env.DB,change.tenant_id);
      if(tenant) await applyPlanChange(env,change,tenant);
    }); } catch(error) {
      if(String(error).includes('RENEWAL_LOCKED') && Date.parse(change.effective_at)<=Date.now())
        await env.DB.prepare("UPDATE plan_changes SET status='failed' WHERE id=?1 AND status='prepared'").bind(change.id).run();
      else console.warn('[PLAN_CHANGE_PENDING]',JSON.stringify({changeId:change.id}));
    }
  }
  const canceledChanges = await env.DB.prepare(`SELECT t.id FROM tenants t JOIN plan_changes c
    ON c.tenant_id=t.id AND c.subscription_id=t.paddle_subscription_id
    WHERE t.billing_status='active' AND t.renewal_canceled_at IS NOT NULL AND julianday(t.subscription_ends_at)>julianday('now')
      AND c.status='applied' AND c.plan_tier IN ('pro','ultra') LIMIT 5`).all<{id:string}>();
  for (const {id} of canceledChanges.results) {
    try { await withBillingLock(env,id,async()=>{
      const tenant = await getTenantById(env.DB,id);
      const change = tenant && await openChange(env,id);
      if (!tenant?.renewal_canceled_at || change?.status!=='applied' || !isPaidPlan(change.plan_tier)) return;
      await finishRenewalCancellation(env,tenant,await ownedSubscription(env,tenant));
    }); } catch { console.warn('[PLAN_CANCELLATION_PENDING]',JSON.stringify({tenantId:id})); }
  }
  // Renewals disabled at checkout are canceled only after the purchased period
  // is captured, including the first payment for a scheduled plan change.
  const tenants=await env.DB.prepare(`SELECT * FROM tenants WHERE auto_renew=0 AND billing_status='active' AND renewal_canceled_at IS NULL
    AND paddle_subscription_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM plan_changes c WHERE c.tenant_id=tenants.id AND c.status IN ('prepared','applied')) LIMIT 5`).all<Tenant>();
  for(const tenant of tenants.results) {
    try { await withBillingLock(env,tenant.id,async()=>{
      const current=await getTenantById(env.DB,tenant.id);
      if(!current || current.auto_renew!==0 || current.renewal_canceled_at || await openChange(env,tenant.id))return;
      const sub=await ownedSubscription(env,current);
      if(sub.status!=='active')return;
      if(sub.scheduled_change?.action!=='cancel')await paddle(env,`/subscriptions/${sub.id}/cancel`,{effective_from:'next_billing_period'});
      await env.DB.prepare('UPDATE tenants SET renewal_canceled_at=?2 WHERE id=?1 AND auto_renew=0').bind(tenant.id,current.subscription_ends_at).run();
    }); } catch { console.warn('[PLAN_RENEWAL_PENDING]',JSON.stringify({tenantId:tenant.id})); }
  }
}
