import type { Env, Tenant } from './types';
import { getTenantById } from './db';
import { jsonResponse } from './http';
import { ownedSubscription, paddle, withBillingLock, PaddleApiError } from './paddle-client';
import { activeOffer, getOffer, identifyPrice, storedTier, type BillingCycle, type PlanOffer } from './plans';
import { applyPlanChange, checkedPrice, preview, saveChange } from './plan-billing';

const DAY=86400000;
const NOTICE=30*DAY;
const ACCEPT_MARGIN=2*3600000;
const noStore={'Cache-Control':'no-store'};
type Migration = {
  id:string;tenant_id:string;subscription_id:string;source_offer_id:string;target_offer_id:string;cycle:BillingCycle;
  effective_at:string;accept_by:string;email_to:string;notice_started_at:string|null;notice_sent_at:string|null;
  notice_id:string|null;notice_delivered_at:string|null;status:string;
};
export function openMigration(env:Env,tenantId:string) {
  return env.DB.prepare(`SELECT * FROM plan_offer_migrations WHERE tenant_id=?1
    AND status IN ('notice_pending','offered','accepted','review','deferred')`).bind(tenantId).first<Migration>();
}
const migrationTime=(value:string)=>Date.parse(value);

export async function migrationSummary(env:Env,tenantId:string) {
  const row=await openMigration(env,tenantId);
  if (!row || row.status==='notice_pending' || row.status==='deferred') return null;
  const [source,target]=await Promise.all([getOffer(env.DB,row.source_offer_id),getOffer(env.DB,row.target_offer_id)]);
  return {id:row.id,status:row.status,cycle:row.cycle,effective_at:row.effective_at,accept_by:row.accept_by,source,target};
}

export async function previewMigration(env:Env,tenant:Tenant,id:string) {
  const row=await openMigration(env,tenant.id);
  if (!row || row.id!==id || row.status!=='offered' || Date.now()>=migrationTime(row.accept_by))
    return jsonResponse({error:'Esta oferta não está disponível para aceite.'},409,noStore);
  const offer=await getOffer(env.DB,row.target_offer_id);
  if (!offer) throw new Error('PRICE_MISMATCH');
  return jsonResponse(await preview(env,tenant,{offer,cycle:row.cycle}),200,noStore);
}

export async function acceptMigration(env:Env,tenant:Tenant,id:string,userId:number,acceptedOffer:string,fingerprint:string) {
  const row=await openMigration(env,tenant.id);
  if (!row || row.id!==id || row.target_offer_id!==acceptedOffer || row.status!=='offered' || !row.notice_delivered_at
    || migrationTime(row.effective_at)-migrationTime(row.notice_delivered_at)<NOTICE
    || Date.now()>=migrationTime(row.accept_by) || tenant.paddle_subscription_id!==row.subscription_id)
    return jsonResponse({error:'Esta oferta não está disponível para aceite.'},409,noStore);
  const offer=await getOffer(env.DB,row.target_offer_id);
  if (!offer) throw new Error('PRICE_MISMATCH');
  const quote=await preview(env,tenant,{offer,cycle:row.cycle});
  if (!quote.scheduled || quote.effective_at!==row.effective_at || quote.next_amount===null) throw new Error('UNSAFE_PREVIEW');
  if (quote.fingerprint!==fingerprint) return jsonResponse({error:'A cobrança mudou. Confira o novo valor antes de aceitar.'},409,noStore);
  const change={id:crypto.randomUUID(),tenant_id:tenant.id,subscription_id:row.subscription_id,
    plan_tier:storedTier(offer.plan_id),billing_cycle:row.cycle,price_id:quote.priceId,auto_renew:1,effective_at:row.effective_at,
    status:'prepared',offer_id:offer.id,expected_amount:quote.next_amount};
  await saveChange(env,change,env.DB.prepare(`UPDATE plan_offer_migrations SET status='accepted',accepted_at=?2,accepted_by=?3
    WHERE id=?1 AND status='offered'`).bind(id,new Date().toISOString(),userId));
  await applyPlanChange(env,change,tenant);
  return jsonResponse({success:true},200,noStore);
}

function validOffer(body:any) {
  const metrics=['responses','transcription','images','professionals','voice'];
  return body && typeof body.plan_id==='string' && /^[a-z][a-z0-9-]{0,38}$/.test(body.plan_id)
    && typeof body.name==='string' && /^[\p{L}\p{N}][\p{L}\p{N} -]{0,47}$/u.test(body.name)
    && Number.isSafeInteger(body.version) && body.version>=1
    && metrics.every(metric=>body[metric]===null || Number.isSafeInteger(body[metric]) && body[metric]>=0 && body[metric]<2147483647)
    && ['monthly','yearly'].every(cycle=>Number.isSafeInteger(body[cycle]) && (body.plan_id==='free'?body[cycle]===0:body[cycle]>0))
    && (body.plan_id==='free' || ['monthly','yearly'].every(cycle=>typeof body.prices?.[cycle]==='string' && /^pri_[a-z0-9_]+$/.test(body.prices[cycle])));
}

export async function billingAdmin(request:Request,env:Env) {
  const path=new URL(request.url).pathname;
  if (path==='/api/admin/billing' && request.method==='GET') {
    const [offers,migrations,reviews]=await Promise.all([
      env.DB.prepare('SELECT * FROM plan_offers ORDER BY plan_id,version DESC').all(),
      env.DB.prepare('SELECT id,tenant_id,status,effective_at,notice_delivered_at,accepted_at FROM plan_offer_migrations ORDER BY effective_at DESC LIMIT 100').all(),
      env.DB.prepare('SELECT * FROM billing_reviews WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 100').all(),
    ]);
    return jsonResponse({offers:offers.results,migrations:migrations.results,reviews:reviews.results},200,noStore);
  }
  if (request.method!=='POST' || !request.headers.get('content-type')?.startsWith('application/json'))
    return jsonResponse({error:'Método não permitido.'},405,noStore);
  const body=await request.json().catch(()=>null) as any;
  try {
    if (path==='/api/admin/billing/offers') {
      if (!validOffer(body)) return jsonResponse({error:'Informe a oferta, os limites e os dois preços.'},400,noStore);
      const {plan_id,version,name,responses,transcription,images,professionals,voice,monthly,yearly}=body;
      const offer:PlanOffer={id:plan_id+'-v'+version,plan_id,version,name,responses,transcription,images,professionals,voice,monthly,yearly,published:1};
      if (plan_id!=='free') {
        if (!env.PADDLE_API_KEY || !['sandbox','live'].includes(env.PADDLE_ENVIRONMENT || '')) throw new Error('PADDLE_UNAVAILABLE');
        if (body.prices.monthly===body.prices.yearly || ['monthly','yearly'].some(cycle=>identifyPrice(env,body.prices[cycle])))
          return jsonResponse({error:'Cada nova versão precisa de novos IDs de preço da Paddle.'},409,noStore);
        await Promise.all((['monthly','yearly'] as const).map(cycle=>checkedPrice(env,{offer,cycle},body.prices[cycle])));
      }
      await env.DB.batch([
        env.DB.prepare('UPDATE plan_offers SET published=0 WHERE plan_id=?1 AND published=1').bind(plan_id),
        env.DB.prepare('INSERT INTO plan_offers VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,1)')
          .bind(offer.id,plan_id,version,name,responses,transcription,images,professionals,voice,monthly,yearly),
        ...(plan_id==='free'?[]:(['monthly','yearly'] as const).map(cycle=>env.DB.prepare('INSERT INTO plan_offer_prices VALUES (?1,?2,?3,?4)')
          .bind(env.PADDLE_ENVIRONMENT,body.prices[cycle],offer.id,cycle))),
      ]);
      return jsonResponse({id:offer.id},201,noStore);
    }
    if (path==='/api/admin/billing/migrations') {
      if (!env.BILLING_EMAIL_API_KEY || !env.BILLING_EMAIL_FROM)
        return jsonResponse({error:'Configure o envio de avisos por e-mail.'},503,noStore);
      if (typeof body?.tenant_id!=='string' || typeof body?.target_offer_id!=='string')
        return jsonResponse({error:'Informe a clínica e a nova oferta.'},400,noStore);
      return await withBillingLock(env,body.tenant_id,async()=>{
        const tenant=await getTenantById(env.DB,body.tenant_id);
        const target=await getOffer(env.DB,body.target_offer_id);
        const source=tenant && activeOffer(tenant);
        const cycle=tenant?.billing_cycle;
        if (!tenant?.paddle_subscription_id || !tenant.contact_email || !target || !source || source.plan_id==='free' || target.plan_id==='free'
          || !target.published || source.id===target.id || (cycle!=='monthly' && cycle!=='yearly') || await openMigration(env,tenant.id)
          || await env.DB.prepare("SELECT 1 FROM plan_changes WHERE tenant_id=?1 AND status IN ('prepared','applied')").bind(tenant.id).first())
          return jsonResponse({error:'A clínica ou a oferta não está elegível para esta migração.'},409,noStore);
        const sub=await ownedSubscription(env,tenant);
        const when=migrationTime(sub.next_billed_at);
        if (sub.status!=='active' || sub.scheduled_change || when!==migrationTime(tenant.subscription_ends_at || ''))
          return jsonResponse({error:'Aguarde a regularização do período atual.'},409,noStore);
        await checkedPrice(env,{offer:target,cycle});
        const id=crypto.randomUUID();
        const status=when-Date.now()>=NOTICE+ACCEPT_MARGIN ? 'notice_pending' : 'deferred';
        await env.DB.prepare(`INSERT INTO plan_offer_migrations(id,tenant_id,subscription_id,source_offer_id,target_offer_id,cycle,effective_at,accept_by,email_to,status)
          VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`).bind(id,tenant.id,sub.id,source.id,target.id,cycle,
          new Date(when).toISOString(),new Date(when-ACCEPT_MARGIN).toISOString(),tenant.contact_email,status).run();
        return jsonResponse({id,status},201,noStore);
      });
    }
    if (path==='/api/admin/billing/resolve-review') {
      if (typeof body?.id!=='string') return jsonResponse({error:'Informe a revisão.'},400,noStore);
      const result=await env.DB.batch([
        env.DB.prepare("UPDATE billing_reviews SET resolved_at=CURRENT_TIMESTAMP WHERE id=?1 AND resolved_at IS NULL").bind(body.id),
        env.DB.prepare("UPDATE plan_offer_migrations SET status='deferred' WHERE id=?1 AND status='review'").bind(body.id),
      ]);
      return result.some(row=>row.meta.changes) ? jsonResponse({success:true},200,noStore) : jsonResponse({error:'Revisão indisponível.'},404,noStore);
    }
  } catch { return jsonResponse({error:'Não foi possível confirmar esta alteração de catálogo ou migração.'},409,noStore); }
  return jsonResponse({error:'Rota não encontrada.'},404,noStore);
}

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const noticeDate=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
function describe(offer:PlanOffer,cycle:BillingCycle) {
  const quantity=(value:number|null,unit:string,divisor=1)=>value===null ? unit+' sem limite' : (value/divisor)+' '+unit;
  return [offer.name+' por '+money.format(offer[cycle]/100)+(cycle==='monthly'?' por mês':' por ano'),
    quantity(offer.responses,'respostas'),quantity(offer.transcription,'minutos de transcrição',60),
    quantity(offer.images,'imagens'),quantity(offer.voice,'minutos de áudio com IA',60),quantity(offer.professionals,'profissionais')].join(', ');
}
function emailRequest(env:Env,path:string,init?:RequestInit) {
  return fetch('https://api.resend.com/emails'+path,{...init,signal:AbortSignal.timeout(5000),
    headers:{authorization:'Bearer '+env.BILLING_EMAIL_API_KEY,'content-type':'application/json',...init?.headers}});
}
async function processMigration(env:Env,row:Migration) {
  const tenant=await getTenantById(env.DB,row.tenant_id);
  if (!tenant) return;
  const now=Date.now(),effective=migrationTime(row.effective_at),deadline=migrationTime(row.accept_by);
  const changeStatus=(status:string)=>env.DB.prepare('UPDATE plan_offer_migrations SET status=?2 WHERE id=?1').bind(row.id,status).run();
  const retiring=row.status==='canceled' && Boolean(row.notice_delivered_at);
  if (tenant.paddle_subscription_id!==row.subscription_id || tenant.renewal_canceled_at || tenant.billing_status==='canceled') {
    await changeStatus('canceled');
    return;
  }
  if (row.status==='deferred') {
    const next=migrationTime(tenant.subscription_ends_at || '');
    if (activeOffer(tenant)?.id!==row.source_offer_id) { await changeStatus('canceled'); return; }
    if (next<=effective || next-now<NOTICE+ACCEPT_MARGIN || !tenant.contact_email) return;
    await env.DB.prepare(`UPDATE plan_offer_migrations SET status='notice_pending',effective_at=?2,accept_by=?3,email_to=?4,
      notice_started_at=NULL,notice_sent_at=NULL,notice_id=NULL,notice_delivered_at=NULL WHERE id=?1`)
      .bind(row.id,new Date(next).toISOString(),new Date(next-ACCEPT_MARGIN).toISOString(),tenant.contact_email).run();
    return;
  }
  if (row.status==='notice_pending') {
    if (activeOffer(tenant)?.id!==row.source_offer_id) { await changeStatus('canceled'); return; }
    if (await env.DB.prepare("SELECT 1 FROM plan_changes WHERE tenant_id=?1 AND status IN ('prepared','applied')").bind(tenant.id).first()) {
      await changeStatus('deferred');
      return;
    }
    if (effective-now<NOTICE) { await changeStatus('deferred'); return; }
    if (!env.BILLING_EMAIL_API_KEY || !env.BILLING_EMAIL_FROM) return;
    if (!row.notice_id) {
      if (row.notice_started_at && now-migrationTime(row.notice_started_at)>=DAY) { await changeStatus('deferred'); return; }
      const [source,target]=await Promise.all([getOffer(env.DB,row.source_offer_id),getOffer(env.DB,row.target_offer_id)]);
      if (!source || !target) return;
      await env.DB.prepare('UPDATE plan_offer_migrations SET notice_started_at=COALESCE(notice_started_at,?2) WHERE id=?1')
        .bind(row.id,new Date(now).toISOString()).run();
      const response=await emailRequest(env,'',{method:'POST',headers:{'Idempotency-Key':'aura-plan/'+row.id+'/'+row.effective_at},
        body:JSON.stringify({from:env.BILLING_EMAIL_FROM,to:[row.email_to],subject:'Uma nova oferta para seu plano Aura',
          text:`Oferta atual: ${describe(source,row.cycle)}.\nNova oferta: ${describe(target,row.cycle)}.\nMudança prevista para ${noticeDate.format(effective)} (Brasília). Confira e aceite na página Plano até ${noticeDate.format(deadline)} (Brasília). Sem aceite, a renovação da oferta atual será encerrada e o Free entrará no fim do período pago.`})});
      if (!response.ok) return;
      const {id}=await response.json() as {id?:string};
      if (id) await env.DB.prepare('UPDATE plan_offer_migrations SET notice_id=?2,notice_sent_at=?3 WHERE id=?1')
        .bind(row.id,id,new Date().toISOString()).run();
      return;
    }
    const response=await emailRequest(env,'/'+encodeURIComponent(row.notice_id));
    if (!response.ok) return;
    const {last_event}=await response.json() as {last_event?:string};
    if (['delivered','opened','clicked'].includes(last_event || '') && effective-Date.now()>=NOTICE)
      await env.DB.prepare("UPDATE plan_offer_migrations SET status='offered',notice_delivered_at=?2 WHERE id=?1")
        .bind(row.id,new Date().toISOString()).run();
    else if (['bounced','complained','failed'].includes(last_event || '')) await changeStatus('deferred');
    return;
  }
  if ((!retiring && row.status!=='offered') || now<deadline || !row.notice_delivered_at
    || effective-migrationTime(row.notice_delivered_at)<NOTICE) return;
  if (activeOffer(tenant)?.id!==row.source_offer_id) { await changeStatus('canceled'); return; }
  const sub=await ownedSubscription(env,tenant);
  if (sub.status==='active' && !sub.scheduled_change && migrationTime(sub.next_billed_at)===effective && now<effective-1800000) {
    await paddle(env,'/subscriptions/'+sub.id+'/cancel',{effective_from:'next_billing_period'});
  }
  const confirmed=await ownedSubscription(env,tenant);
  if (confirmed.scheduled_change?.action==='cancel' && migrationTime(confirmed.scheduled_change.effective_at)===effective) {
    await env.DB.batch([
      env.DB.prepare("UPDATE plan_offer_migrations SET status='canceled' WHERE id=?1").bind(row.id),
      env.DB.prepare('UPDATE tenants SET auto_renew=0,renewal_canceled_at=?2 WHERE id=?1').bind(tenant.id,row.effective_at),
    ]);
  } else if (Date.now()>=effective-1800000) await flagMigrationReview(env,row);
}

async function flagMigrationReview(env:Env,row:Migration) {
  await env.DB.batch([
    env.DB.prepare("UPDATE plan_offer_migrations SET status='review' WHERE id=?1 AND status IN ('offered','canceled')").bind(row.id),
    env.DB.prepare("INSERT OR IGNORE INTO billing_reviews(id,tenant_id,reason) VALUES (?1,?2,'offer_cancellation_unconfirmed')").bind(row.id,row.tenant_id),
  ]);
}

export async function reconcileOfferMigrations(env:Env) {
  const {results}=await env.DB.prepare(`SELECT m.* FROM plan_offer_migrations m JOIN tenants t ON t.id=m.tenant_id
    WHERE m.status='notice_pending' OR (m.status='offered' AND julianday(m.accept_by)<=julianday('now'))
      OR (m.status='canceled' AND m.notice_delivered_at IS NOT NULL AND m.accepted_at IS NULL
        AND t.paddle_subscription_id=m.subscription_id AND t.renewal_canceled_at IS NULL
        AND t.billing_status='active' AND julianday(m.effective_at)>julianday('now')
        AND NOT EXISTS(SELECT 1 FROM plan_offer_migrations current WHERE current.tenant_id=m.tenant_id
          AND current.status IN ('notice_pending','offered','accepted','review','deferred')))
      OR (m.status='deferred' AND julianday(t.subscription_ends_at)>julianday(m.effective_at)
        AND julianday(t.subscription_ends_at)>julianday('now','+30 days','+2 hours')) ORDER BY m.effective_at LIMIT 10`).all<Migration>();
  for (const row of results) {
    try {
      await withBillingLock(env,row.tenant_id,async()=>{
        const current=await env.DB.prepare('SELECT * FROM plan_offer_migrations WHERE id=?1').bind(row.id).first<Migration>();
        if (current && current.status===row.status) await processMigration(env,current);
      });
    } catch(error) {
      console.warn('[PLAN_OFFER_MIGRATION]',row.id,error instanceof PaddleApiError ? error.code : 'retry');
      if (Date.now()>=migrationTime(row.effective_at)-1800000 && ['offered','canceled'].includes(row.status))
        await flagMigrationReview(env,row);
    }
  }
}
