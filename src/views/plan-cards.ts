import { PLANS } from '../plans';

export function planCards(inbox = false) {
  return `<div class="aura-pricing-grid aura-plan-grid${inbox?' aura-hub-pricing':''}"${inbox?' id="planOffers" data-cycle="yearly"':''}>${(['free','pro','ultra'] as const).map(tier=>{
    const plan=PLANS[tier];
    const features=[
      plan.responses===null?'Respostas automáticas com IA ilimitadas':`${tier==='free'?'Até ':''}${plan.responses.toLocaleString('pt-BR')} respostas automáticas com IA/mês`,
      plan.transcription===null?'Transcrição de áudio ilimitada':`Transcrição de até ${plan.transcription===300?'5 minutos':'1 hora'} de áudio/mês`,
      plan.images===null?'Análise de imagens ilimitada':`Análise de até ${plan.images} imagens/mês`,
      plan.professionals===null?'Agenda com profissionais ilimitados':`Agenda com ${plan.professionals===1?'1 profissional':'até 2 profissionais'}`,
      plan.voice===0?'Respostas somente em texto':`Envio de até ${plan.voice/60} minutos de áudio com IA/mês`,
    ];
    return `<article class="aura-pricing-card${tier==='pro'?' is-featured':''}" data-plan="${tier}" aria-labelledby="plan${plan.name}Title">
      <div class="aura-pricing-heading"><h3 id="plan${plan.name}Title">Plano ${plan.name}</h3><span id="plan${plan.name}Badge" class="aura-price-badge hidden">Plano atual</span></div>
      ${tier==='free'?'<p class="aura-price-value">Grátis</p><p class="aura-pricing-detail">Sem cobrança.</p>':inbox?`
        <p class="aura-price-value">R$ <b data-yearly="${plan.yearly/1200}" data-monthly="${plan.monthly/100}">${plan.yearly/1200}</b> <span>/ mês<span data-plan-cycle="yearly"> no anual</span></span></p>
        <p class="aura-pricing-detail" data-plan-cycle="monthly">Cobrança mensal</p>`:`
        <p class="aura-price-value">R$ ${plan.yearly/1200} <span>/ mês no anual</span></p>
        <p class="aura-pricing-detail"><strong>R$ ${(plan.yearly/100).toLocaleString('pt-BR')} por ano</strong><br>ou R$ ${plan.monthly/100}/mês no mensal</p>`}
      <ul class="aura-pricing-list">${features.map(feature=>`<li>${feature}</li>`).join('')}</ul>
      ${inbox?`<div id="checkout${plan.name}" class="aura-plan-actions">
        <button type="button" disabled onclick="openAuraCheckout('${tier}')" class="${tier==='pro'?'aura-primary':'aura-secondary'}">${tier==='free'?'Usar plano Free':`Escolher plano ${plan.name}`}</button>
      </div>`:`<a href="/register" class="${tier==='pro'?'aura-primary':'aura-secondary'}">${tier==='free'?'Começar com Free':`Escolher plano ${plan.name}`}</a>`}
    </article>`;
  }).join('')}</div>`;
}
