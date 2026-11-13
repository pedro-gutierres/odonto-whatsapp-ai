let openingBillingPortal = false;
let planPriceFrame;
const planDate = value => new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}) + ' (Brasília)';
async function loadBilling({ signal } = {}) {
  try {
    const response = await fetch('/api/billing', { signal });
    const data = await response.json(); if (!response.ok) throw new Error();
    const canManage = currentUser && currentUser.canManageClinic;
    document.getElementById('billingAvailability').textContent = data.environment==='sandbox' && data.enabled
      ? 'Ambiente de testes da Paddle. Nenhuma cobrança real.' : !data.enabled ? 'Pagamento temporariamente indisponível.' : '';
    const currentPlan = data.plans[data.plan].name;
    document.getElementById('billingCurrentPlan').textContent = 'Plano ' + currentPlan;
    document.getElementById('billingValidity').textContent = data.plan==='free' ? 'Sem cobrança' : data.ends_at ? 'Acesso até ' + planDate(data.ends_at) : 'Acesso ativo';

    const nextPlan = data.pending ? data.plans[data.pending.plan].name : currentPlan;
    let nextLabel = '', nextDetails = '';
    if (data.canceling_change) {
      nextLabel = 'Renovação desativada';
      nextDetails = 'A Paddle está confirmando o cancelamento da troca para o ' + nextPlan + '.';
    } else if (data.pending?.status === 'prepared') {
      nextLabel = 'Troca em confirmação';
      nextDetails = 'Aguardando a confirmação da troca para o ' + nextPlan + '.';
    } else if (data.status === 'past_due') {
      nextLabel = 'Pagamento pendente';
      nextDetails = 'Confira a cobrança na Paddle.';
    } else if (data.plan !== 'free' && data.renewal_canceled) {
      nextLabel = 'Renovação desativada';
      nextDetails = 'O plano termina ao fim do período pago, sem nova cobrança automática.';
    } else if (data.pending && data.auto_renew) {
      nextLabel = 'Troca agendada para o ' + nextPlan;
      nextDetails = 'Cobrança prevista para ' + planDate(data.pending.effective_at) + '. O acesso muda após o pagamento.';
    } else if (data.auto_renew && data.ends_at && data.plan !== 'free') {
      nextLabel = 'Próxima renovação do ' + currentPlan;
      nextDetails = planDate(data.ends_at);
    } else if (data.plan !== 'free' && data.has_subscription) {
      nextLabel = 'Renovação em confirmação';
      nextDetails = 'Aguardando a atualização da Paddle.';
    }
    document.getElementById('billingNext').classList.toggle('hidden',!nextLabel);
    document.getElementById('billingNextLabel').textContent = nextLabel;
    document.getElementById('billingNextDetails').textContent = nextDetails;
    document.getElementById('billingPortalActions').classList.toggle('hidden',!data.can_open_portal);
    document.getElementById('billingPortal').disabled = !data.can_open_portal || openingBillingPortal;
    for (const [tier,plan] of Object.entries(data.plans)) {
      const current = tier===data.plan && data.selected;
      const scheduled = data.pending?.plan===tier && data.pending.status==='applied';
      const freeUnavailable = tier==='free' && (data.can_select_free === false || (data.can_select_free === undefined && data.plan!=='free'));
      const actions = document.getElementById('checkout'+plan.name);
      const hidden = Boolean(current || scheduled || freeUnavailable);
      actions.classList.toggle('hidden',hidden);
      for (const button of actions.querySelectorAll('button')) {
        button.disabled = hidden || !canManage || (tier!=='free' && !data.enabled) || data.pending?.status==='prepared';
      }
      const badge=document.getElementById('plan'+plan.name+'Badge');
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
  cancelAnimationFrame(planPriceFrame);

  const prices = Array.from(offers.querySelectorAll('[data-yearly][data-monthly]'),element=>({
    element, start:Number(element.textContent), end:Number(element.dataset[cycle]),
  }));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const {element,end} of prices) element.textContent = end;
    return;
  }
  let startedAt;
  function animate(now) {
    startedAt ??= now;
    const progress = Math.min((now - startedAt) / 320, 1);
    const eased = 1 - (1 - progress) ** 2;
    for (const {element,start,end} of prices) element.textContent = Math.round(start + (end - start) * eased);
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
