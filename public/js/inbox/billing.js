let paddleInitialized = false;
let checkoutOpening = false;
async function loadBilling() {
  try {
    const response = await fetch('/api/billing'); const data = await response.json(); if (!response.ok) return;
    const canManage = currentUser && currentUser.canManageClinic;
    document.getElementById('billingAvailability').textContent = !data.enabled ? 'A contratação automática ainda não está disponível. Seu cadastro não gera cobrança.' : data.environment === 'sandbox' ? 'Ambiente de testes da Paddle. As compras aqui não geram cobrança real.' : 'Escolha um plano. A assinatura é liberada após confirmação do pagamento.';
    const details = document.getElementById('billingDetails');
    details.textContent = data.has_subscription ? 'Situação: ' + data.status + (data.ends_at ? ' · Vigência até ' + new Date(data.ends_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) : '') + (data.renewal_canceled_at ? ' · Renovação cancelada para o próximo período.' : '') : '';
    for (const id of ['checkoutMonthly','checkoutYearly']) document.getElementById(id).disabled = !data.enabled || !canManage || (data.has_subscription && data.status !== 'canceled');
    document.getElementById('billingPortal').disabled = !data.enabled || !canManage || !data.has_subscription;
  } catch { /* Keep the disabled state when billing cannot be verified. */ }
}
async function openAuraCheckout(cycle) {
  if (checkoutOpening) return;
  if (!document.getElementById('paidRenewalAccepted').checked) return showToast('Leia e confirme a renovação do plano pago.', 'amber');
  checkoutOpening = true;
  try {
    const response = await fetch('/api/billing/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({cycle,renewalAccepted:true})});
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    if (!window.Paddle) await new Promise((resolve,reject) => { const script=document.createElement('script');script.src='https://cdn.paddle.com/paddle/v2/paddle.js';script.onload=resolve;script.onerror=()=>reject(new Error('Não foi possível carregar o checkout.'));document.head.append(script); });
    if (!paddleInitialized) {
      if (data.environment === 'sandbox') Paddle.Environment.set('sandbox');
      Paddle.Initialize({token:data.token,eventCallback:event=>{if(event.name==='checkout.completed'){showToast('Pagamento recebido no checkout. Aguarde a confirmação do plano.');loadOnboarding();loadBilling();}}});
      paddleInitialized=true;
    }
    Paddle.Checkout.open({transactionId:data.transactionId,settings:{locale:'pt-BR',displayMode:'overlay'}});
  } catch (error) { showToast(error.message,'amber'); }
  finally { checkoutOpening=false; }
}
async function openBillingPortal() {
  try {
    const response=await fetch('/api/billing/portal',{method:'POST'});const data=await response.json();if(!response.ok)throw new Error(data.error);
    window.location.assign(data.url);
  }catch(error){showToast(error.message,'amber');}
}
