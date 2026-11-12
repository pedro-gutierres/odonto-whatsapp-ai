export const INBOX_SETTINGS_VIEW_HTML = `
<main id="viewSettings" class="hidden flex-1 overflow-y-auto"><div class="max-w-5xl mx-auto space-y-6">
  <div class="aura-page-heading"><div><h2 id="settingsClinicHeading">Seu WhatsApp de atendimento</h2><p class="aura-description">Conecte o número que receberá novos interessados e confira seu funcionamento.</p></div><span id="settingsWaTopPill" class="aura-note text-xs">Verificando conexão...</span></div>
  <span id="settingsTenantBadge" hidden></span><span id="settingsRoleBadge" hidden></span>
  <section id="settingsPanelWhatsapp" class="space-y-6">
    <section class="aura-card"><div class="aura-section-head"><h3>Conexão atual</h3><button onclick="loadClinicSettingsView()" class="aura-text-button">Atualizar</button></div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5"><div><p class="aura-field-hint">Situação</p><p id="waStatConfigured" class="text-sm font-semibold mt-2">Não conectado</p><p id="waStatConnectedAt" class="aura-field-hint mt-1"></p></div><div><p class="aura-field-hint">Número de atendimento</p><p id="waStatDisplayPhone" class="text-sm font-semibold mt-2">—</p></div></div>
      <div id="waVerifiedNameRow" class="hidden flex flex-wrap justify-between items-center gap-3 mt-5"><span class="aura-field-hint">Nome na Meta: <b id="waStatVerifiedName"></b></span><button id="btnDisconnectWaTop" onclick="handleDisconnectWhatsApp()" class="hidden aura-text-button">Desconectar número</button></div>
      <details class="aura-disclosure"><summary>Dados técnicos da conexão</summary><div class="aura-disclosure-content space-y-2 text-xs"><p id="waStatPhoneId"></p><p id="waStatWabaId"></p><p id="waStatTokenSource"></p><p id="waWebhookUrlText" class="break-all"></p></div></details>
    </section>
    <section class="aura-card space-y-4"><h3>Conectar um número</h3>
      <label class="aura-field" for="waNumberScenario">Qual número você vai usar?<select id="waNumberScenario" onchange="updateNumberScenarioHint()"><option value="">Selecione</option><option value="new_dedicated">Número novo, dedicado ao atendimento</option><option value="existing">Número que já utiliza WhatsApp</option></select></label>
      <p id="numberScenarioHint" class="aura-field-hint">Recomendamos um número dedicado a novos interessados.</p>
      <span id="esModeBadge" hidden></span>
      <div id="esMissingEnvAlert" class="hidden aura-note"><b class="text-xs">Conexão guiada ainda indisponível</b><p id="esMissingEnvText" class="aura-field-hint mt-1"></p></div>
      <p id="esStaffReadOnlyAlert" class="hidden aura-note">Somente o responsável pela conta pode conectar ou desconectar o número.</p>
      <div class="flex flex-wrap gap-4 items-end"><label class="aura-field" for="esPinInput">PIN do número <span class="aura-field-hint">Opcional, se solicitado pela Meta</span><input type="text" id="esPinInput" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="off" placeholder="6 dígitos"></label><button id="btnLaunchEmbeddedSignup" onclick="launchMetaEmbeddedSignup()" class="aura-primary"><span id="btnLaunchEmbeddedSignupText">Conectar com a Meta</span><span aria-hidden="true">↗</span></button></div>
      <p class="aura-field-hint">A janela da Meta orienta a autorização. O atendimento só começa depois da ativação no Aura.</p><div id="esProgressBox" class="hidden aura-note"></div>
    </section>
    <details id="manualWaDetails" class="aura-card aura-manual-connection"><summary class="text-sm font-semibold">Conexão manual <span class="aura-field-hint">· Para quem já possui as credenciais</span></summary><form onsubmit="handleSaveManualWhatsApp(event)" class="aura-disclosure-content space-y-4"><p class="aura-description">Use os identificadores e o token fornecidos pela Meta para este número.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><label class="aura-field" for="manualPhoneNumberId">Phone Number ID<input id="manualPhoneNumberId" required placeholder="Identificador do número"></label><label class="aura-field" for="manualWabaId">WABA ID<input id="manualWabaId" placeholder="Identificador da conta WhatsApp Business"></label></div>
      <label class="aura-field" for="manualAccessToken">Token de acesso<input type="password" id="manualAccessToken" autocomplete="off" placeholder="Cole o token da Meta"><span class="aura-field-hint">Na primeira conexão, informe o token. Para manter o que já está salvo, deixe em branco.</span></label>
      <div class="flex justify-between gap-3"><button type="button" id="btnDisconnectWaManual" onclick="handleDisconnectWhatsApp()" class="hidden aura-text-button">Desconectar</button><button id="btnSaveManualWa" class="aura-primary ml-auto">Verificar e conectar</button></div>
    </form></details>
    <section class="aura-card"><div class="aura-section-head"><div><h3>Está tudo funcionando?</h3><p class="aura-field-hint mt-2">Confira o número, a autorização e o recebimento de mensagens.</p></div><button id="btnRunWaDiagnose" onclick="runWhatsAppDiagnostics()" class="aura-secondary">Verificar conexão</button></div><button id="btnSubscribeWebhook" onclick="handleSubscribeWebhook()" class="hidden aura-secondary mb-4">Ativar recebimento de mensagens</button><div id="waDiagnosticsResults" class="space-y-3" aria-live="polite"></div></section>
    <section class="aura-note"><b class="text-xs">Cobrança da Meta</b><p class="mt-1">Os custos do WhatsApp são separados do plano Aura. Os valores ainda não aparecem aqui; confira-os na sua conta Meta.</p></section>
  </section>
</div></main>`;
