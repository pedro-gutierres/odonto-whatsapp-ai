import { PLANS, type PlanOffer } from '../plans';

const safe=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function planCards(inbox = false, offers:Record<string,PlanOffer> | typeof PLANS=PLANS) {
  return `<div class="aura-pricing-grid aura-plan-grid${inbox?' aura-hub-pricing':''}"${inbox?' id="planOffers" data-cycle="yearly"':''}>${Object.entries(offers).map(([tier,plan])=>{
    const name=safe(plan.name), id=safe(tier);
    const annual=Number((plan.yearly/1200).toFixed(2));
    const features=[
      plan.responses===null?'Respostas automáticas com IA ilimitadas':`${tier==='free'?'Até ':''}${plan.responses.toLocaleString('pt-BR')} respostas automáticas com IA/mês`,
      plan.transcription===null?'Transcrição de áudio ilimitada':`Transcrição de até ${plan.transcription===3600?'1 hora':(plan.transcription/60).toLocaleString('pt-BR')+' minutos'} de áudio/mês`,
      plan.images===null?'Análise de imagens ilimitada':`Análise de até ${plan.images} imagens/mês`,
      plan.professionals===null?'Agenda com profissionais ilimitados':`Agenda com ${plan.professionals===1?'1 profissional':'até '+plan.professionals+' profissionais'}`,
      plan.voice===0?'Respostas somente em texto':plan.voice===null?'Envio de áudio com IA ilimitado':`Envio de até ${plan.voice/60} minutos de áudio com IA/mês`,
    ];
    return `<article class="aura-pricing-card${tier==='pro'?' is-featured':''}" data-plan="${id}" aria-labelledby="plan-${id}">
      <div class="aura-pricing-heading"><h3 id="plan-${id}">Plano ${name}</h3><span id="plan${name}Badge" class="aura-price-badge hidden">Plano atual</span></div>
      ${tier==='free'?'<p class="aura-price-value">Grátis</p><p class="aura-pricing-detail">Sem cobrança.</p>':inbox?`
        <p class="aura-price-value">R$ <b data-yearly="${annual}" data-monthly="${plan.monthly/100}" data-value="${annual}">${annual.toLocaleString('pt-BR')}</b> <span>/ mês<span data-plan-cycle="yearly"> no anual</span></span></p>
        <p class="aura-pricing-detail" data-plan-cycle="monthly">Cobrança mensal</p>`:`
        <p class="aura-price-value">R$ ${annual.toLocaleString('pt-BR')} <span>/ mês no anual</span></p>
        <p class="aura-pricing-detail"><strong>R$ ${(plan.yearly/100).toLocaleString('pt-BR')} por ano</strong><br>ou R$ ${plan.monthly/100}/mês no mensal</p>`}
      <ul class="aura-pricing-list">${features.map(feature=>`<li>${feature}</li>`).join('')}</ul>
      ${inbox?`<div id="checkout${name}" class="aura-plan-actions">
        <button type="button" disabled onclick="openAuraCheckout(this.closest('[data-plan]').dataset.plan)" class="${tier==='pro'?'aura-primary':'aura-secondary'}">${tier==='free'?'Usar plano Free':`Escolher plano ${name}`}</button>
      </div>`:`<a href="/register" class="${tier==='pro'?'aura-primary':'aura-secondary'}">${tier==='free'?'Começar com Free':`Escolher plano ${name}`}</a>`}
    </article>`;
  }).join('')}</div>`;
}
