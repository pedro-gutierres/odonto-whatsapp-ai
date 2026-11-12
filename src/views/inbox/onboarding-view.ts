export const INBOX_ONBOARDING_VIEW_HTML = `
<main id="viewOnboarding" class="hidden flex-1 overflow-y-auto">
<div class="max-w-5xl mx-auto space-y-6">
  <section class="aura-card aura-welcome">
    <div><p id="businessProfileLabel" class="aura-eyebrow"></p><h2>Seu atendimento começa aqui.</h2><p id="onboardingStatus" class="aura-description" aria-live="polite"></p><p id="operationalQuota" class="aura-field-hint mt-3"></p></div>
    <div class="flex md:justify-end"><button id="prepareTrialBtn" onclick="onboardingAction('prepare')" class="aura-primary">Preparar atendimento <span aria-hidden="true">→</span></button></div>
  </section>
  <div class="aura-section-head"><h3 class="text-sm font-semibold">Prepare em três passos</h3><span class="aura-field-hint">Você pode salvar e continuar depois.</span></div>
  <section class="aura-setup-grid">
    <div class="aura-card aura-step-card"><span class="aura-step-index">01</span><h3>Ensine sobre seu negócio <span id="readyTraining" class="aura-check"></span></h3><p class="aura-description">Informe serviços, preços e orientações para a IA responder com seus dados.</p><div class="aura-step-actions"><button onclick="selectNavigationTab('config')" class="aura-text-button">Preencher informações</button><button id="reviewTrainingBtn" onclick="onboardingAction('review-training')" class="aura-text-button">Confirmar revisão</button></div></div>
    <div class="aura-card aura-step-card"><span class="aura-step-index">02</span><h3>Conecte o WhatsApp <span id="readyWhatsapp" class="aura-check"></span></h3><p class="aura-description">Escolha o número de atendimento e confira se a conexão está funcionando.</p><div class="aura-step-actions"><button onclick="selectNavigationTab('settings')" class="aura-text-button">Configurar conexão</button></div></div>
    <div class="aura-card aura-step-card"><span class="aura-step-index">03</span><h3>Prepare sua agenda <span id="readyAgenda" class="aura-check"></span></h3><p class="aura-description">Defina expedientes e bloqueie horários que já estão ocupados.</p><div class="aura-step-actions"><button onclick="selectNavigationTab('agenda')" class="aura-text-button">Organizar horários</button></div></div>
  </section>
  <section class="aura-card space-y-4">
    <h3>Como você vai usar a agenda?</h3>
    <p class="aura-description">Escolha a rotina que manterá os horários oferecidos pela IA atualizados.</p>
    <label class="aura-field" for="scheduleMode">Forma de uso</label>
    <select id="scheduleMode" aria-label="Forma de uso da agenda" onchange="updateScheduleExplanation()"><option value="aura">Minha agenda principal ficará no Aura</option><option value="dedicated">Vou reservar períodos exclusivos para o Aura</option><option value="external_manual">Vou atualizar as ocupações de outra agenda</option></select>
    <p id="scheduleExplanation" class="aura-field-hint">Cadastre e mantenha seus compromissos na agenda do Aura.</p>
    <label id="maintenanceAcknowledgedLabel" class="aura-checkbox-line hidden"><input type="checkbox" id="maintenanceAcknowledged">Vou manter os períodos reservados ou atualizar as ocupações sempre que houver mudanças na outra agenda.</label>
    <button id="saveAgendaReadinessBtn" onclick="onboardingAction('agenda',{mode:document.getElementById('scheduleMode').value,maintenanceAcknowledged:document.getElementById('maintenanceAcknowledged').checked})" class="aura-secondary">Confirmar agenda pronta</button>
  </section>
  <section id="activationSection" class="aura-card space-y-4"><div class="aura-section-head"><h3>Começar o atendimento real</h3><button type="button" class="aura-inline-help" aria-label="Entender o início do teste" data-aura-help="O Test Drive é uma demonstração separada. O teste no WhatsApp só começa quando você confirma a ativação aqui. Conectar o número ou salvar o treinamento não inicia os sete dias.">?</button></div><p id="activationSummary" class="aura-description"></p>
    <p id="trialTerms" class="aura-note">7 dias ou 100 respostas da IA, o que acontecer primeiro. Sem cartão e sem cobrança automática. Custos da Meta são separados.</p>
    <label class="aura-checkbox-line"><input type="checkbox" id="activationAcknowledged"><span id="activationAcknowledgmentText">Quero iniciar o teste e autorizar o atendimento pelo número conectado.</span></label>
    <div class="flex flex-wrap items-center gap-4"><button id="activateTrialBtn" onclick="activateOperationalTrial()" class="aura-primary">Ativar teste de 7 dias</button><p id="activationAvailability" class="aura-field-hint"></p></div>
  </section>
  <section id="plano" class="aura-card"><h3>Seu plano</h3><p id="billingAvailability" class="aura-description">Consultando opções de contratação...</p><p id="billingDetails" class="aura-field-hint mt-3"></p>
    <div class="aura-billing-options"><button id="checkoutMonthly" disabled onclick="openAuraCheckout('monthly')" class="aura-primary">Mensal · R$ 199/mês</button><button id="checkoutYearly" disabled onclick="openAuraCheckout('yearly')" class="aura-secondary">Anual · R$ 2.148/ano</button><button id="billingPortal" disabled onclick="openBillingPortal()" class="aura-text-button">Gerenciar assinatura</button></div>
    <p class="aura-field-hint mb-4">No anual, o equivalente a R$ 179/mês é cobrado de uma só vez por ano.</p>
    <label class="aura-checkbox-line"><input id="paidRenewalAccepted" type="checkbox">Aceito a renovação automática do plano escolhido. Posso gerenciar o cancelamento na minha assinatura. Confira o valor final e os termos no checkout.</label>
  </section>
</div></main>`;
