(() => {
  const query = new URLSearchParams(location.search);
  const plan = query.get('plan'), cycle = query.get('cycle');
  if(!plan || query.has('_ptxn'))return;
  const status=document.getElementById('checkoutStatus'),form=document.getElementById('planCheckoutChoices');
  const confirm=document.getElementById('confirmPlanChange'),summary=document.getElementById('checkoutSummary'),effective=document.getElementById('checkoutEffective');
  const updatePayment=document.getElementById('checkoutUpdatePayment');
  const money=amount => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amount/100);
  const date=value => new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'})+' (Brasília)';
  let billing,preview,busy=false,initialized=false,loading,paymentCompleted=false;
  async function post(path,body) {
    const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok)throw Object.assign(new Error(result.error || 'Não foi possível preparar o pagamento.'),{
      code:result.code, paymentMethodUrl:result.update_payment_method_url,
    });
    return result;
  }
  function lock(value){busy=value;confirm.disabled=value;}
  const choice={plan,cycle};
  function showActivePlan(data) {
    form.classList.add('hidden');
    status.textContent='Plano '+data.plans[plan].name+' ativo até '+date(data.ends_at)+'.';
  }
  function waitForConfirmation() {
    if(paymentCompleted)return;
    paymentCompleted=true;
    lock(true);
    form.classList.add('hidden');
    status.textContent='Estamos conferindo o pagamento. A confirmação aparecerá aqui e na página Plano.';
    let checks=0;
    async function check() {
      try {
        const response=await fetch('/api/billing',{cache:'no-store'});
        if(response.ok) {
          const data=await response.json();
          if(data.plan===plan && data.ends_at) {showActivePlan(data);return;}
        }
      } catch { /* A temporary network failure can be retried. */ }
      if(++checks<24)setTimeout(check,5000);
      else status.textContent='O pagamento ainda está em confirmação. Você pode acompanhar pela página Plano.';
    }
    void check();
  }
  function showCheckoutError(error) {
    preview=null;
    form.classList.add('hidden');
    if(error.code==='PAYMENT_PENDING') {
      waitForConfirmation();
      return;
    }
    status.textContent=error.message;
    if(error.code==='PAYMENT_METHOD_CHANGE_REQUIRED' && error.paymentMethodUrl) {
      updatePayment.href=error.paymentMethodUrl;
      updatePayment.classList.remove('hidden');
    }
  }
  async function paddleReady(data) {
    if(!window.Paddle) {
      if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.paddle.com/paddle/v2/paddle.js';script.onload=resolve;script.onerror=()=>{script.remove();loading=null;reject(new Error('Não foi possível carregar a Paddle.'));};document.head.append(script);});
      await loading;
    }
    if(!initialized) {
      if(data.environment==='sandbox')Paddle.Environment.set('sandbox');
      Paddle.Initialize({token:data.token,eventCallback:event=>{
        if(event.name==='checkout.completed'){
          waitForConfirmation();
        } else if(event.name==='checkout.error'||event.name==='checkout.payment.error'){
          status.textContent='O pagamento não foi concluído. Confira seus dados no formulário da Paddle.';
        }
      }});initialized=true;
    }
  }
  async function refresh() {
    if(busy)return;
    lock(true);preview=null;confirm.classList.add('hidden');updatePayment.classList.add('hidden');status.textContent='Conferindo condições do plano...';
    try {
      const conditions=await post('/api/billing/preview',choice);preview=conditions;
      summary.textContent=conditions.cycle==='yearly'?money(conditions.amount)+' por ano ('+money(conditions.amount/12)+'/mês).':money(conditions.amount)+' por mês.';
      effective.textContent=conditions.scheduled
        ? 'Seu plano atual permanece até '+date(conditions.effective_at)+'. Próxima cobrança prevista: '+money(conditions.next_amount)+' nessa data. O novo plano será liberado após a confirmação do pagamento.'
        : 'O plano começa após a confirmação do pagamento.';
      effective.textContent+=' O plano renova automaticamente até o cancelamento na Paddle.';
      if(conditions.scheduled) {
        confirm.classList.remove('hidden');status.textContent='Confira os dados e confirme a troca para o próximo período.';
      } else {
        const data=await post('/api/billing/checkout',choice);
        await paddleReady(data);
        Paddle.Checkout.open({transactionId:data.transactionId,settings:{locale:'pt-BR',displayMode:'inline',variant:'one-page',allowLogout:false,
          showAddDiscounts:false,frameTarget:'paddle-checkout-frame',frameInitialHeight:500,frameStyle:'width:100%;min-width:286px;background-color:transparent;border:none;'}});
        if(!paymentCompleted)status.textContent=data.environment==='sandbox'?'Ambiente de testes da Paddle. Nenhuma cobrança real.':'Conclua o pagamento no formulário seguro da Paddle.';
      }
      if(!paymentCompleted)form.classList.remove('hidden');
    } catch(error) {
      showCheckoutError(error);
    }
    finally {if(!paymentCompleted){lock(false);confirm.disabled=!preview;}}
  }
  confirm.addEventListener('click',async()=>{
    if(busy || plan!=='free' && !preview)return;
    lock(true);
    try {
      const data=await post(plan==='free'?'/api/billing/free':'/api/billing/checkout',plan==='free'?{}:{...choice,fingerprint:preview.fingerprint});
      status.textContent=data.scheduled?'Troca agendada para '+date(data.effective_at)+'.':'Plano Free selecionado. Ative o atendimento na preparação do painel.';
      form.classList.add('hidden');
    }catch(error){showCheckoutError(error);if(!paymentCompleted)lock(false);}
  });
  (async()=>{
    try {
      if(!['free','pro','ultra'].includes(plan))throw new Error('Plano inválido. Escolha um plano no painel.');
      if(plan!=='free' && !['monthly','yearly'].includes(cycle))throw new Error('Volte à página Plano e abra o checkout mensal ou anual.');
      const response=await fetch('/api/billing');billing=await response.json();
      if(!response.ok)throw new Error(billing.error || 'Entre na sua conta para escolher um plano.');
      document.getElementById('checkoutTitle').textContent='Plano '+billing.plans[plan].name+(plan==='free'?'':cycle==='yearly'?' anual':' mensal');
      if(plan!=='free' && billing.plan===plan && billing.ends_at) {showActivePlan(billing);return;}
      if(plan==='free') {
        if(billing.can_select_free===false || (billing.can_select_free===undefined && billing.plan!=='free')) {
          status.textContent='O Free fica disponível após o fim do plano pago.';
          return;
        }
        form.classList.remove('hidden');
        summary.textContent='Grátis. Sem cobrança.';
        effective.textContent='50 respostas com IA, 5 minutos de transcrição e 15 imagens por mês. Agenda para 1 profissional. Respostas em texto.';
        confirm.classList.remove('hidden');confirm.disabled=false;confirm.textContent='Confirmar plano Free';status.textContent='';
      }else if(!billing.enabled){throw new Error('O pagamento está temporariamente indisponível.');}
      else await refresh();
    }catch(error){status.textContent=error.message;form.classList.add('hidden');}
  })();
})();
