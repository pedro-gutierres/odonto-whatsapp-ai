import { planCards } from '../plan-cards';
import type { PlanOffer } from '../../plans';
export function inboxPlanView(offers?:Record<string,PlanOffer>) { return `
<main id="viewPlan" class="hidden flex-1 overflow-y-auto"><div class="max-w-6xl mx-auto space-y-6">
  <div class="aura-page-heading"><h2>Seu plano</h2></div>
  <section class="aura-card aura-plan-status" aria-label="Plano atual">
    <div><p class="aura-field-label" id="billingCurrentPlan">Plano atual</p><p id="billingValidity" class="aura-description">Consultando...</p></div>
    <div id="billingNext" class="hidden"><p class="aura-field-label" id="billingNextLabel"></p><p id="billingNextDetails" class="aura-description" role="status"></p></div>
    <div id="billingPortalActions" class="hidden"><button id="billingPortal" type="button" class="aura-text-button" disabled onclick="openBillingPortal()">Gerenciar cobrança na Paddle</button></div>
  </section>
  <section id="billingChangeActions" class="hidden"><button type="button" class="aura-text-button" onclick="undoPlanChange(this)">Desfazer troca agendada</button></section>
  <section id="billingReview" class="aura-note hidden" role="status">Há uma alteração de cobrança em análise. Confira os detalhes na Paddle ou fale com o suporte.</section>
  <section id="billingMigration" class="aura-card hidden" aria-labelledby="billingMigrationTitle">
    <h3 id="billingMigrationTitle">Nova oferta na próxima renovação</h3><p id="billingMigrationDates" class="aura-description"></p>
    <p id="billingMigrationOld" class="aura-description"></p><p id="billingMigrationNew" class="aura-description"></p>
    <button id="billingMigrationAccept" class="aura-primary hidden" type="button" onclick="acceptPlanOffer(this)">Aceitar nova oferta</button>
    <a id="billingMigrationPayment" class="aura-text-button hidden" target="_blank" rel="noopener noreferrer">Atualizar meio de pagamento na Paddle</a>
  </section>
  <section id="billingQuota" class="aura-card hidden" aria-labelledby="billingQuotaTitle">
    <h3 id="billingQuotaTitle">Cotas de uso</h3><p id="billingQuotaReset" class="aura-description"></p>
    <dl id="billingQuotaList" class="aura-plan-quota-list"></dl>
    <div id="billingAgendaPriority" class="hidden">
      <p class="aura-field-label">Prioridade das agendas</p>
      <p class="aura-description">Ordene as agendas que devem ficar disponíveis se seu plano tiver menos vagas.</p>
      <ol id="billingAgendaList"></ol>
      <button id="billingAgendaSave" class="aura-secondary hidden" type="button" onclick="savePlanAgendas(this)">Salvar prioridade</button>
    </div>
  </section>
  <section id="plano" aria-label="Planos disponíveis">
    <fieldset class="aura-plan-cycle" aria-label="Frequência de cobrança">
      <label><input type="radio" name="planCycle" value="yearly" checked onchange="setPlanCycle(this.value)"><span>Anual</span></label>
      <label><input type="radio" name="planCycle" value="monthly" onchange="setPlanCycle(this.value)"><span>Mensal</span></label>
    </fieldset>
    ${planCards(true,offers)}
    <p id="billingAvailability" class="aura-field-hint mt-3" role="status"></p>
    <p class="aura-field-hint mt-3">O saldo expira na reposição. Ao trocar de plano, o uso já registrado no ciclo conta no novo limite.</p>
  </section>
</div></main>`; }
