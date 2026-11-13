import { planCards } from '../plan-cards';
export const INBOX_PLAN_VIEW_HTML = `
<main id="viewPlan" class="hidden flex-1 overflow-y-auto"><div class="max-w-6xl mx-auto space-y-6">
  <div class="aura-page-heading"><h2>Seu plano</h2></div>
  <section class="aura-card aura-plan-status" aria-label="Plano atual">
    <div><p class="aura-field-label" id="billingCurrentPlan">Plano atual</p><p id="billingValidity" class="aura-description">Consultando...</p></div>
    <div id="billingNext" class="hidden"><p class="aura-field-label" id="billingNextLabel"></p><p id="billingNextDetails" class="aura-description" role="status"></p></div>
    <div id="billingPortalActions" class="hidden"><button id="billingPortal" type="button" class="aura-text-button" disabled onclick="openBillingPortal()">Gerenciar cobrança na Paddle</button></div>
  </section>
  <section id="plano" aria-label="Planos disponíveis">
    <fieldset class="aura-plan-cycle" aria-label="Frequência de cobrança">
      <label><input type="radio" name="planCycle" value="yearly" checked onchange="setPlanCycle(this.value)"><span>Anual</span></label>
      <label><input type="radio" name="planCycle" value="monthly" onchange="setPlanCycle(this.value)"><span>Mensal</span></label>
    </fieldset>
    ${planCards(true)}
    <p id="billingAvailability" class="aura-field-hint mt-3" role="status"></p>
    <p class="aura-field-hint mt-3">Os limites de uso são mensais e reiniciam no primeiro dia do mês, no horário de Brasília. Trocas de plano começam após o período pago atual.</p>
  </section>
</div></main>`;
