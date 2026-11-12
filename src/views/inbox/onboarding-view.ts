export const INBOX_ONBOARDING_VIEW_HTML = `
<main id="viewOnboarding" class="hidden flex-1 overflow-y-auto">
<div class="aura-onboarding-hub max-w-5xl mx-auto space-y-6">
  <section class="aura-card aura-welcome">
    <div><p id="businessProfileLabel" class="aura-eyebrow"></p><h2>Sua IA já tem um ponto de partida.</h2><p id="onboardingStatus" class="aura-description" aria-live="polite"></p><p id="operationalQuota" class="aura-field-hint mt-3"></p></div>
    <div class="aura-welcome-actions"><button type="button" onclick="selectNavigationTab('simulator')" class="aura-primary">Testar minha IA no Simulador →</button><button id="prepareTrialBtn" type="button" onclick="onboardingAction('prepare')" class="aura-text-button">Preparar atendimento <span aria-hidden="true">→</span></button><span class="aura-field-hint">30 respostas para experimentar. Sem enviar WhatsApp.</span></div>
  </section>
  <div class="aura-section-head"><h3>Do Simulador ao atendimento real</h3><span class="aura-field-hint">Personalize no seu ritmo. Ative quando estiver pronto.</span></div>
  <section class="aura-setup-grid" aria-label="Etapas para ativar o atendimento">
    <div class="aura-card aura-step-card"><span class="aura-step-index">01</span><div class="aura-step-heading"><h3>Treinamento da IA</h3><span id="readyTraining" class="aura-readiness-badge is-pending" role="status">Pendente</span></div><p class="aura-description">Já começamos com um modelo do seu setor. Personalize preços, procedimentos e orientações antes de atender seus pacientes.</p><div class="aura-step-actions"><button type="button" onclick="selectNavigationTab('config')" class="aura-secondary">Personalizar treinamento</button><button id="reviewTrainingBtn" type="button" onclick="onboardingAction('review-training')" class="aura-text-button">Confirmar revisão</button></div></div>
    <div class="aura-card aura-step-card"><span class="aura-step-index">02</span><div class="aura-step-heading"><h3>Agenda e profissionais</h3><span id="readyAgenda" class="aura-readiness-badge is-pending" role="status">Pendente</span></div><p class="aura-description">Sua agenda Aura começa com um profissional e horários de exemplo. Revise a equipe, os expedientes e os horários ocupados.</p><div class="aura-step-actions"><button type="button" onclick="selectNavigationTab('agenda')" class="aura-secondary">Ver horários e equipe</button></div></div>
    <div class="aura-card aura-step-card"><span class="aura-step-index">03</span><div class="aura-step-heading"><h3>WhatsApp Oficial</h3><span id="readyWhatsapp" class="aura-readiness-badge is-pending" role="status">Pendente</span></div><p class="aura-description">Conecte o número da clínica pela API Oficial da Meta. Com as etapas prontas, você pode ativar seus 7 dias de atendimento real.</p><div class="aura-step-actions"><button type="button" onclick="selectNavigationTab('settings')" class="aura-secondary">Conectar número da clínica</button></div></div>
  </section>
  <details id="agendaModeDetails" class="aura-card aura-disclosure aura-agenda-mode">
    <summary>Usar agenda externa ou reservar horários? <span class="aura-field-hint">Configuração do modo de agenda</span></summary>
    <div class="aura-disclosure-content aura-agenda-mode-fields">
      <h3>Como você vai usar a agenda?</h3><p class="aura-description">Escolha a rotina que manterá os horários oferecidos pela IA atualizados. Para usar outra agenda, confirme como manterá as ocupações em dia.</p>
      <label class="aura-field" for="scheduleMode">Forma de uso</label>
      <select id="scheduleMode" aria-label="Forma de uso da agenda" onchange="updateScheduleExplanation()"><option value="aura">Minha agenda principal ficará no Aura</option><option value="dedicated">Vou reservar períodos exclusivos para o Aura</option><option value="external_manual">Vou atualizar as ocupações de outra agenda</option></select>
      <p id="scheduleExplanation" class="aura-field-hint">Cadastre e mantenha seus compromissos na agenda do Aura.</p>
      <label id="maintenanceAcknowledgedLabel" class="aura-checkbox-line hidden"><input type="checkbox" id="maintenanceAcknowledged">Vou manter os períodos reservados ou atualizar as ocupações sempre que houver mudanças na outra agenda.</label>
      <button id="saveAgendaReadinessBtn" type="button" onclick="onboardingAction('agenda',{mode:document.getElementById('scheduleMode').value,maintenanceAcknowledged:document.getElementById('maintenanceAcknowledged').checked})" class="aura-secondary">Confirmar agenda pronta</button>
    </div>
  </details>
  <section id="activationSection" class="aura-card aura-activation-card space-y-4">
    <div class="aura-section-head"><div><p class="aura-eyebrow">VOCÊ DECIDE QUANDO COMEÇAR</p><h3>Ative seu atendimento no WhatsApp</h3></div><button type="button" class="aura-inline-help" aria-label="Entender o início do teste" data-aura-help="O Test Drive é uma demonstração separada. O teste no WhatsApp só começa quando você confirma a ativação aqui. Conectar o número ou salvar o treinamento não inicia os sete dias.">?</button></div>
    <p id="activationSummary" class="aura-description" aria-live="polite"></p><div id="activationProgress" class="aura-activation-progress" role="progressbar" aria-label="Etapas de preparação concluídas" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0"><span></span></div>
    <p id="trialTerms" class="aura-note">7 dias ou 100 respostas da IA, o que acontecer primeiro. Sem cartão e sem cobrança automática. Custos da Meta são separados.</p>
    <label class="aura-checkbox-line"><input type="checkbox" id="activationAcknowledged"><span id="activationAcknowledgmentText">Quero iniciar o teste e autorizar o atendimento pelo número conectado.</span></label>
    <div class="aura-activation-actions"><button id="activateTrialBtn" type="button" onclick="activateOperationalTrial()" class="aura-primary">Ativar teste de 7 dias</button><p id="activationAvailability" class="aura-field-hint"></p></div>
  </section>

</div></main>`;
