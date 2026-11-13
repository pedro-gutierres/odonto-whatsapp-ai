(() => {
  const query = new URLSearchParams(location.search);
  if(query.has('plan') && !query.has('_ptxn'))return;
  const status = document.getElementById('checkoutStatus');
  const retry = document.getElementById('retryCheckout');
  const config = JSON.parse(document.getElementById('paddlePublicConfig').textContent);
  const transactionId = query.get('_ptxn');
  if (!config) {
    status.textContent = 'Pagamento temporariamente indisponível. Confira seu plano no painel.';
    return;
  }
  if (!/^txn_[a-z0-9]{26}$/.test(transactionId || '')) {
    status.textContent = 'Abra o pagamento pelo seu painel ou use o link completo recebido por e-mail.';
    return;
  }
  let loading = null;
  let initialized = false;
  function loadPaddle() {
    if (window.Paddle) return Promise.resolve();
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
        script.onload = resolve;
        script.onerror = () => { script.remove(); loading = null; reject(new Error('load')); };
        document.head.append(script);
      });
    }
    return loading;
  }
  async function open() {
    retry.disabled = true;
    status.textContent = config.environment === 'sandbox'
      ? 'Ambiente de testes. Nenhum pagamento real será feito.'
      : 'Continue no formulário seguro da Paddle.';
    try {
      await loadPaddle();
      if (!initialized) {
        if (config.environment === 'sandbox') Paddle.Environment.set('sandbox');
        Paddle.Initialize({
          token: config.token,
          // Paddle opens _ptxn automatically on initialization. Only retries
          // call Checkout.open explicitly, so one link creates one checkout.
          checkout: { settings: { locale: 'pt-BR', displayMode: 'overlay', allowLogout: false } },
          eventCallback: event => {
            if (event.name === 'checkout.completed') {
              status.textContent = 'Pagamento recebido no checkout. Confira no painel a confirmação do seu plano.';
              retry.classList.add('hidden');
            } else if (event.name === 'checkout.closed') {
              status.textContent = 'O pagamento foi fechado. Você pode abrir novamente ou voltar ao painel para conferir o plano.';
              retry.classList.remove('hidden');
            } else if (event.name === 'checkout.error' || event.name === 'checkout.payment.error') {
              status.textContent = 'Não foi possível abrir o pagamento. Tente novamente ou confira seu plano no painel.';
              retry.classList.remove('hidden');
            }
          }
        });
        initialized = true;
        return;
      }
      Paddle.Checkout.open({ transactionId, settings: { locale: 'pt-BR', displayMode: 'overlay' } });
    } catch {
      status.textContent = 'Não foi possível carregar o pagamento. Confira sua conexão e tente novamente.';
      retry.classList.remove('hidden');
    } finally { retry.disabled = false; }
  }
  retry.addEventListener('click', open);
  open();
})();
