import type { Env } from '../types';
import { paddleCheckoutAvailable } from '../plan-billing';

// Default payment link for Paddle recovery/payment emails. Only the public token
// is embedded; the API key and webhook signing secret never reach this page.
export function checkoutHtml(env: Env) {
  const config = paddleCheckoutAvailable(env)
    ? { token: env.PADDLE_CLIENT_TOKEN, environment: env.PADDLE_ENVIRONMENT }
    : null;
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>Checkout do plano | Aura</title><link rel="stylesheet" href="/css/aura.css?v=7">
</head><body class="aura-public">
<header class="aura-public-header"><a href="/" class="aura-brand" aria-label="Aura, início"><span class="aura-brand-mark">a</span><span class="aura-brand-name">aura</span></a><a href="/inbox#plan" class="aura-text-button">Meu painel</a></header>
<main class="aura-checkout-layout"><section class="aura-card">
<h1 id="checkoutTitle" class="aura-auth-form-title">Checkout do plano</h1>
<form id="planCheckoutChoices" class="aura-checkout-choices hidden" onsubmit="return false">
<p id="checkoutSummary" class="aura-description"></p>
<p id="checkoutEffective" class="aura-field-hint"></p>
<button id="confirmPlanChange" type="button" class="aura-primary hidden" disabled>Confirmar troca de plano</button>
</form>
<p id="checkoutStatus" class="aura-description" role="status">Conferindo o link de pagamento...</p>
<a id="checkoutUpdatePayment" class="aura-secondary hidden" target="_blank" rel="noopener noreferrer">Atualizar meio de pagamento na Paddle</a>
<button id="retryCheckout" type="button" class="aura-primary hidden">Abrir pagamento novamente</button>
<div class="paddle-checkout-frame"></div>
<p class="aura-field-hint">O pagamento é processado pela Paddle. A liberação do plano depende da confirmação do pagamento. A ativação do atendimento continua sendo feita no seu painel.</p>
<p class="aura-auth-footer"><a href="/inbox#plan">Voltar ao meu plano</a></p>
</section></main>
<script id="paddlePublicConfig" type="application/json">${json}</script>
<script src="/js/plan-checkout.js?v=6"></script><script src="/js/checkout.js?v=3"></script></body></html>`;
}
