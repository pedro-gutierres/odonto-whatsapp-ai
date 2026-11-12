export const INBOX_SIMULATOR_VIEW_HTML = `
<main id="viewSimulator" class="hidden flex-1 min-h-0 flex flex-col">
  <div class="aura-simulator-toolbar">
    <div><h2 class="text-base font-semibold">Experimente uma conversa</h2><p class="aura-simulator-note mt-1">Demonstração sem envios ou alterações na agenda.</p></div>
    <div class="flex items-center gap-3"><span id="demoQuota" class="aura-quota">30 respostas disponíveis</span><button type="button" class="aura-inline-help" aria-label="Como funciona a cota do Test Drive" data-aura-help="Os dois modos compartilham 30 respostas por conta, sem reposição automática. Essa cota é separada do teste no WhatsApp. Reiniciar a conversa limpa apenas o histórico deste modo.">?</button></div>
    <div class="aura-simulator-actions"><button type="button" onclick="selectNavigationTab('config')" class="aura-secondary">Personalizar respostas</button><button type="button" onclick="selectNavigationTab('onboarding')" class="aura-primary">Ativar no meu WhatsApp</button></div>
    <div class="flex flex-wrap items-center gap-4 w-full"><label for="simulatorMode" class="aura-field-hint">Tipo de conversa</label><select id="simulatorMode" onchange="changeSimulatorMode(this.value)"><option value="patient">Simular um paciente</option><option value="aura">Tirar dúvidas sobre o Aura</option></select><button onclick="resetSimulatorChat()" class="aura-text-button ml-auto">Nova conversa</button></div>
    <div id="simulatorLockBanner" role="status" class="hidden aura-note w-full"></div>
  </div>
  <div id="simulatorMessagesArea" class="flex-1 overflow-y-auto p-5 space-y-3 custom-scroll" aria-live="polite"></div>
  <form onsubmit="handleSimulatorSubmit(event)" class="p-4 border-t dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900"><input id="simulatorMessageInput" maxlength="2000" required aria-label="Mensagem do Test Drive" placeholder="Escreva para experimentar..." class="flex-1 min-w-0 p-3 rounded-lg text-sm"><button id="simulatorSendBtn" class="aura-primary">Enviar</button></form>
</main>`;
