export const INBOX_SUPPORT_VIEW_HTML = `
<main id="viewSupport" class="hidden flex-1 min-h-0 flex flex-col">
  <div class="aura-support-toolbar">
    <div id="supportModes" class="aura-support-modes" role="group" aria-label="Tipo de conversa" hidden>
      <button id="supportModeButton" type="button" aria-pressed="true" onclick="selectNavigationTab('support')">Suporte do Aura</button>
      <button id="simulationModeButton" type="button" aria-pressed="false" onclick="selectNavigationTab('support-simular')">Simular atendimento</button>
    </div>
    <button id="supportResetButton" type="button" class="aura-text-button" onclick="resetSupportConversation()" hidden>Nova conversa</button>
    <div class="aura-support-context">
      <div id="supportContext">
        <p class="aura-description">Tire dúvidas sobre como usar o Aura.</p>
        <p class="aura-field-hint">Use dados fictícios ao descrever casos de pacientes. Mantenha senhas e códigos de acesso protegidos.</p>
      </div>
      <div id="simulationContext" hidden>
        <p class="aura-description">Converse como se fosse um paciente. A simulação usa os Parâmetros de atendimento salvos e mantém os horários e envios fictícios.</p>
        <button type="button" class="aura-text-button" onclick="selectNavigationTab('config')">Abrir Parâmetros de atendimento</button>
      </div>
    </div>
  </div>
  <button id="supportHistoryButton" type="button" class="aura-text-button aura-support-reload" onclick="loadOlderSupportMessages()" hidden>Carregar mensagens anteriores</button>
  <div id="supportMessagesArea" class="aura-support-messages flex-1 overflow-y-auto custom-scroll" role="log" aria-label="Mensagens da conversa"></div>
  <p id="supportNotice" class="aura-support-notice" role="status" hidden></p>
  <button id="supportReloadButton" type="button" class="aura-text-button aura-support-reload" onclick="refreshSupportState()" hidden>Tentar novamente</button>
  <button id="supportRetryButton" type="button" class="aura-text-button aura-support-reload" onclick="retrySavedSupportMessage()" hidden>Tentar obter resposta da IA</button>
  <form onsubmit="handleSupportSubmit(event)" class="aura-support-form">
    <input id="supportMessageInput" maxlength="2000" required aria-label="Mensagem de suporte" placeholder="Escreva sua dúvida..." class="flex-1 min-w-0" oninput="updateSupportRetryButton()" disabled>
    <button id="supportSendButton" class="aura-primary" disabled>Enviar</button>
  </form>
</main>`;
