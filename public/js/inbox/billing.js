let openingBillingPortal = false;
let planPriceFrame;
let billingMigration;
let billingAgendas=[];
const planDate = value => new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}) + ' (Brasília)';
const planMoney = value => (value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const quotaLabels={responses:'Respostas com IA',transcription:'Transcrição',images:'Análise de imagens',voice:'Áudio com IA'};
function quotaAmount(metric,value) {
  if (value===null) return 'Ilimitado';
  if (metric==='transcription' || metric==='voice') {
    const minutes=Math.floor(value/60), seconds=value%60;
    return seconds ? minutes+' min '+seconds+' s' : minutes+' min';
  }
  return value.toLocaleString('pt-BR');
}
function renderBillingUsage(data,canManage) {
  if (!data.usage) return;
  const usage=data.usage;
  document.getElementById('billingQuota').classList.remove('hidden');
  document.getElementById('billingQuotaReset').textContent=usage.reset_at
    ? 'Próxima reposição das cotas em '+planDate(usage.reset_at)
    : 'Reposição após confirmação do pagamento. Tolerância até '+planDate(usage.grace_until)+'.';
  const rows=Object.entries(quotaLabels).map(([metric,label])=>{
    const row=document.createElement('div'),title=document.createElement('dt'),value=document.createElement('dd');
    title.textContent=label;
    value.textContent=quotaAmount(metric,usage.used[metric] || 0)+' usado · '+quotaAmount(metric,usage.available[metric])+' disponível';
    row.append(title,value);
    return row;
  });
  document.getElementById('billingQuotaList').replaceChildren(...rows);
  const agendas=data.professionals || [];
  billingAgendas=agendas.map(item=>item.id);
  document.getElementById('billingAgendaPriority').classList.toggle('hidden',agendas.length<2);
  document.getElementById('billingAgendaSave').classList.toggle('hidden',!canManage);
  const list=document.getElementById('billingAgendaList');
  list.replaceChildren(...agendas.map(item=>{
    const row=document.createElement('li'),label=document.createElement('span');
    row.dataset.id=item.id;
    label.textContent=item.name+' · '+(item.bookable?'Disponível':'Acima do limite atual');
    row.append(label);
    if (canManage) {
      const button=document.createElement('button');
      button.type='button';
      button.className='aura-text-button';
      button.textContent='Priorizar';
      button.setAttribute('aria-label','Priorizar '+item.name);
      button.onclick=()=>{
        list.prepend(row);
        billingAgendas=Array.from(list.children,element=>Number(element.dataset.id));
      };
      row.append(button);
    }
    return row;
  }));
}
function renderBillingMigration(migration,canManage) {
  billingMigration=migration;
  document.getElementById('billingMigration').classList.toggle('hidden',!migration?.source || !migration?.target);
  if (!migration?.source || !migration?.target) return;
  const describe=offer=>offer.name+' · '+planMoney(offer[migration.cycle])+(migration.cycle==='yearly'?'/ano':'/mês')
    +' · '+Object.entries(quotaLabels).map(([metric,label])=>label+' '+quotaAmount(metric,offer[metric])).join(' · ')
    +' · Agendas '+(offer.professionals ?? 'ilimitadas');
  document.getElementById('billingMigrationOld').textContent='Oferta atual · '+describe(migration.source);
  document.getElementById('billingMigrationNew').textContent='Nova oferta · '+describe(migration.target);
  document.getElementById('billingMigrationDates').textContent=migration.status==='accepted'
    ? 'Aceite registrado. Renovação prevista para '+planDate(migration.effective_at)+'.'
    : migration.status==='review' ? 'A atualização está em análise.'
    : 'Mudança prevista para '+planDate(migration.effective_at)+'. Aceite até '+planDate(migration.accept_by)+'. Sem aceite, o plano passa ao Free ao fim do período pago.';
  document.getElementById('billingMigrationAccept').classList.toggle('hidden',!canManage || migration.status!=='offered' || Date.parse(migration.accept_by)<=Date.now());
}
async function changeBilling(button,path,body,message) {
  button.disabled=true;
  try {
    const response=await fetch('/api/billing/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();
    if (!response.ok) throw new Error(result.error);
    showToast(message);
  } catch(error) { showToast(error.message || 'Não foi possível concluir a operação.','amber'); }
  finally { button.disabled=false; await loadBilling(); }
}
function undoPlanChange(button) {
  return changeBilling(button,'undo-change',{},'Troca desfeita.');
}
function savePlanAgendas(button) {
  return changeBilling(button,'agenda-priority',{ids:billingAgendas},'Prioridade salva.');
}
async function acceptPlanOffer(button) {
  const migration=billingMigration;
  if (!migration) return;
  button.disabled=true;
  try {
    const response=await fetch('/api/billing/preview-offer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:migration.id})});
    const quote=await response.json();
    if (!response.ok) {
      if (quote.code==='PAYMENT_METHOD_CHANGE_REQUIRED' && quote.update_payment_method_url) {
        document.getElementById('billingMigrationPayment').href=quote.update_payment_method_url;
        document.getElementById('billingMigrationPayment').classList.remove('hidden');
      }
      throw new Error(quote.error);
    }
    if (window.confirm('Aceitar '+migration.target.name+' com cobrança de '+planMoney(quote.next_amount)+' em '+planDate(quote.effective_at)+'?')) {
      await changeBilling(button,'accept-offer',{id:migration.id,offer_id:migration.target.id,fingerprint:quote.fingerprint},'Nova oferta confirmada.');
    }
  } catch(error) { showToast(error.message || 'Não foi possível consultar a cobrança.','amber'); }
  finally { button.disabled=false; }
}
async function loadBilling({ signal } = {}) {
  try {
    const response = await fetch('/api/billing', { signal });
    const data = await response.json(); if (!response.ok) throw new Error();
    const canManage = currentUser && currentUser.canManageClinic;
    document.getElementById('billingAvailability').textContent = data.environment==='sandbox' && data.enabled
      ? 'Ambiente de testes da Paddle. Nenhuma cobrança real.' : !data.enabled ? 'Pagamento temporariamente indisponível.' : '';
    const currentPlan = data.current_offer?.name || data.plans[data.plan]?.name || data.plan;
    document.getElementById('billingCurrentPlan').textContent = 'Plano ' + currentPlan;
    document.getElementById('billingValidity').textContent = data.plan==='free' ? 'Sem cobrança'
      : data.usage?.grace_until ? 'Acesso temporário até '+planDate(data.usage.grace_until)
      : data.ends_at ? 'Acesso pago até ' + planDate(data.ends_at) : 'Acesso ativo';
    renderBillingUsage(data,canManage);
    renderBillingMigration(data.migration,canManage);
    document.getElementById('billingReview').classList.toggle('hidden',!data.review);
    document.getElementById('billingChangeActions').classList.toggle('hidden',!canManage || data.canceling_change || data.pending?.status!=='applied' || data.pending.plan==='free');

    const nextPlan = data.pending ? data.pending.name || data.plans[data.pending.plan]?.name : currentPlan;
    let nextLabel = '', nextDetails = '';
    if (data.canceling_change) {
      nextLabel = 'Renovação desativada';
      nextDetails = 'A Paddle está confirmando o cancelamento da troca para o ' + nextPlan + '.';
    } else if (data.pending?.status === 'undoing') {
      nextLabel = 'Desfazendo troca';
      nextDetails = 'Aguardando a confirmação da Paddle.';
    } else if (data.pending?.status === 'prepared') {
      nextLabel = 'Troca em confirmação';
      nextDetails = 'Aguardando a confirmação da troca para o ' + nextPlan + '.';
    } else if (data.usage?.grace_until || data.status === 'past_due') {
      nextLabel = 'Pagamento pendente';
      nextDetails = 'Confira a cobrança na Paddle.';
    } else if (data.plan !== 'free' && data.renewal_canceled) {
      nextLabel = 'Renovação desativada';
      nextDetails = 'O plano termina ao fim do período pago, sem nova cobrança automática.'+(data.ends_at?' O Free começa em '+planDate(data.ends_at)+'.':'');
    } else if (data.pending && data.auto_renew) {
      nextLabel = 'Troca agendada para o ' + nextPlan;
      nextDetails = 'Cobrança prevista '+(data.pending.amount==null?'': 'de '+planMoney(data.pending.amount)+' ')+'para '+planDate(data.pending.effective_at)+'. O acesso muda após o pagamento.';
    } else if (data.auto_renew && data.ends_at && data.plan !== 'free') {
      nextLabel = 'Próxima renovação do ' + currentPlan;
      nextDetails = planDate(data.next_charge_at || data.ends_at);
    } else if (data.plan !== 'free' && data.has_subscription) {
      nextLabel = 'Renovação em confirmação';
      nextDetails = 'Aguardando a atualização da Paddle.';
    }
    document.getElementById('billingNext').classList.toggle('hidden',!nextLabel);
    document.getElementById('billingNextLabel').textContent = nextLabel;
    document.getElementById('billingNextDetails').textContent = nextDetails;
    document.getElementById('billingPortalActions').classList.toggle('hidden',!data.can_open_portal);
    document.getElementById('billingPortal').disabled = !data.can_open_portal || openingBillingPortal;
    for (const card of document.querySelectorAll('#planOffers [data-plan]')) {
      const tier=card.dataset.plan,plan=data.plans[tier];
      if (!plan) { card.hidden=true; continue; }
      const current = tier===data.plan && data.selected;
      const scheduled = data.pending?.plan===tier && data.pending.status==='applied';
      const freeUnavailable = tier==='free' && (data.can_select_free === false || (data.can_select_free === undefined && data.plan!=='free'));
      const actions = card.querySelector('.aura-plan-actions');
      const blocked = Boolean(scheduled || freeUnavailable || current && tier==='free');
      actions.dataset.blocked=String(blocked);
      actions.dataset.currentCycle=current && data.current_offer?.id===plan.id ? data.billing_cycle || 'all'
        : current && !data.current_offer ? 'all' : '';
      const hidden=blocked || actions.dataset.currentCycle==='all' || actions.dataset.currentCycle===document.getElementById('planOffers').dataset.cycle;
      actions.classList.toggle('hidden',hidden);
      for (const button of actions.querySelectorAll('button')) {
        button.disabled = blocked || !canManage || (tier!=='free' && !data.enabled) || Boolean(data.pending) || Boolean(data.migration) || data.review;
      }
      const badge=card.querySelector('.aura-price-badge');
      badge.classList.toggle('hidden',!current && !scheduled);
      badge.textContent=current?'Plano atual':data.canceling_change?'Cancelando troca':'Troca agendada';
    }
  } catch {
    if (signal?.aborted) return;
    document.getElementById('billingAvailability').textContent = 'Não foi possível atualizar o plano. Recarregue para tentar novamente.';
    for (const button of document.querySelectorAll('.aura-plan-actions button, #billingPortal')) button.disabled = true;
  }
}
function setPlanCycle(cycle) {
  const offers = document.getElementById('planOffers');
  if (offers.dataset.cycle === cycle) return;
  offers.dataset.cycle = cycle;
  for (const actions of offers.querySelectorAll('.aura-plan-actions')) {
    actions.classList.toggle('hidden',actions.dataset.blocked==='true' || actions.dataset.currentCycle==='all' || actions.dataset.currentCycle===cycle);
  }
  cancelAnimationFrame(planPriceFrame);

  const prices = Array.from(offers.querySelectorAll('[data-yearly][data-monthly]'),element=>({
    element, start:Number(element.dataset.value), end:Number(element.dataset[cycle]),
  }));
  const display=(element,value)=>{
    element.dataset.value=value;
    element.textContent=value.toLocaleString('pt-BR');
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const {element,end} of prices) display(element,end);
    return;
  }
  let startedAt;
  function animate(now) {
    startedAt ??= now;
    const progress = Math.min((now - startedAt) / 320, 1);
    const eased = 1 - (1 - progress) ** 2;
    for (const {element,start,end} of prices) display(element,progress===1 ? end : Math.round(start + (end - start) * eased));
    if (progress < 1) planPriceFrame = requestAnimationFrame(animate);
  }
  planPriceFrame = requestAnimationFrame(animate);
}
function openAuraCheckout(plan) {
  const query = new URLSearchParams({plan});
  if (plan !== 'free') query.set('cycle',document.getElementById('planOffers').dataset.cycle);
  window.location.assign('/checkout?' + query);
}
async function openBillingPortal() {
  const button = document.getElementById('billingPortal');
  if (openingBillingPortal || button.disabled) return;
  openingBillingPortal = true;
  button.disabled = true;
  try {
    const response = await fetch('/api/billing/portal',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    const data = await response.json();
    if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível abrir a cobrança na Paddle.');
    window.location.assign(data.url);
  } catch (error) { showToast(error.message,'amber'); }
  finally { openingBillingPortal = false; button.disabled = false; }
}
window.addEventListener('pageshow',event=>{
  if (event.persisted && document.body.dataset.view === 'plan') void loadBilling();
});
