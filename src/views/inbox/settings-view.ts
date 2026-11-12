export const INBOX_SETTINGS_VIEW_HTML = `
  <!-- ======================================================================= -->
  <!-- VIEW 4: CONFIGURAÇÕES & PERFIL DA CLÍNICA + CONEXÃO WHATSAPP META       -->
  <!-- ======================================================================= -->
  <main id="viewSettings" class="flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 hidden bg-slate-50 dark:bg-[#0b0f17]">
    <div class="max-w-5xl mx-auto space-y-6 pb-12">

      <!-- CABEÇALHO RESUMO DA CLÍNICA -->
      <section class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center text-lg shadow-md">
            <i class="fa-solid fa-gear"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="settingsClinicHeading" class="text-base font-extrabold text-slate-900 dark:text-white">Conexão e consumo do WhatsApp</h2>
              <span id="settingsTenantBadge" class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">-</span>
              <span id="settingsRoleBadge" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">-</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Conecte um número dedicado à captação e confira seu funcionamento antes da ativação.</p>
          </div>
        </div>

        <div id="settingsWaTopPill" class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-bold flex items-center gap-2 shrink-0">
          <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
          <span>Verificando WhatsApp...</span>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- SUB-PAINEL 1: CONEXÃO WHATSAPP OFICIAL (META EMBEDDED SIGNUP)       -->
      <!-- =================================================================== -->
      <section id="settingsPanelWhatsapp" class="space-y-6">
        <label class="block p-4 border dark:border-slate-800 rounded-xl text-sm">Qual número você pretende conectar?
          <select id="waNumberScenario" class="block mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><option value="">Selecione</option><option value="new_dedicated">Número novo, dedicado a novos interessados</option><option value="existing">Número que já utiliza WhatsApp</option></select>
          <span class="block text-xs text-slate-500 mt-2">Para novas contas, a conexão de números existentes aguarda validação do procedimento, do histórico e da coexistência.</span>
        </label>
        <div class="p-4 border border-amber-500/40 rounded-xl text-sm text-amber-700 dark:text-amber-300">Prefira um número novo e dedicado. Para um número que já utiliza WhatsApp, confirme o procedimento e suas consequências antes de conectar. Preservação de histórico e coexistência dependem do caminho suportado; esta tela não comprova essas condições.</div>
        <div class="p-4 border dark:border-slate-800 rounded-xl text-sm"><b>Consumo e cobrança da Meta</b><p class="text-slate-500 mt-2">Os valores da Meta ainda estão indisponíveis no Aura. Consulte a cobrança na sua conta Meta. O contador do teste do Aura e a cota do Test Drive são independentes dessa cobrança; ausência de dados aqui não significa custo zero.</p></div>

        <!-- CARD 1: STATUS REAL DA CONEXÃO -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i class="fa-brands fa-whatsapp text-emerald-500 text-base"></i>
                <span>Status Atual da Conexão WhatsApp</span>
              </h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Credenciais reais desta clínica no WhatsApp Cloud API (sem fallback operacional para o número de laboratório).</p>
            </div>
            <button type="button" onclick="loadClinicSettingsView()" class="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
              <i class="fa-solid fa-rotate text-[11px]"></i>
              <span>Atualizar</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Situação da Conta</span>
              <div id="waStatConfigured" class="font-bold text-slate-900 dark:text-white">-</div>
              <div id="waStatConnectedAt" class="text-[10px] text-slate-500 dark:text-slate-400"></div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Phone Number ID</span>
              <div id="waStatPhoneId" class="font-mono font-bold text-slate-900 dark:text-white break-all">-</div>
              <div id="waStatDisplayPhone" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold"></div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">WABA ID & Token</span>
              <div id="waStatWabaId" class="font-mono font-bold text-slate-900 dark:text-white break-all">-</div>
              <div id="waStatTokenSource" class="text-[10px] text-slate-500 dark:text-slate-400"></div>
            </div>
          </div>

          <div id="waVerifiedNameRow" class="hidden p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
            <div class="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
              <i class="fa-solid fa-certificate text-emerald-500"></i>
              <span>Nome Verificado na Meta: <strong id="waStatVerifiedName">-</strong></span>
            </div>
            <button type="button" id="btnDisconnectWaTop" onclick="handleDisconnectWhatsApp()" class="hidden px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] transition">
              Desconectar Número
            </button>
          </div>
        </div>

        <!-- CARD 2: META EMBEDDED SIGNUP -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
                <i class="fa-brands fa-meta"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Conexão Oficial em 1 Clique (Meta Embedded Signup)</h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Conecte sua conta Meta Business diretamente por esta tela. O token é criptografado em AES-256-GCM e o webhook é assinado automaticamente.</p>
              </div>
            </div>
            <span id="esModeBadge" class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">Verificando...</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <span class="font-bold text-slate-900 dark:text-white block mb-0.5">1. Autorização Meta</span>
              <span class="text-slate-500 dark:text-slate-400">Abre o fluxo oficial da Meta para selecionar seu Portfólio Empresarial e Conta WhatsApp (WABA).</span>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <span class="font-bold text-slate-900 dark:text-white block mb-0.5">2. Troca Segura OAuth</span>
              <span class="text-slate-500 dark:text-slate-400">O código OAuth é trocado no servidor Cloudflare e armazenado com criptografia AES-256-GCM.</span>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <span class="font-bold text-slate-900 dark:text-white block mb-0.5">3. Assinatura Webhook</span>
              <span class="text-slate-500 dark:text-slate-400">Assina automaticamente o WABA para receber mensagens de pacientes na fila 24h da clínica.</span>
            </div>
          </div>

          <div id="esMissingEnvAlert" class="hidden p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 text-xs space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>Variáveis da Meta pendentes para o Embedded Signup</span>
            </div>
            <p id="esMissingEnvText" class="text-[11px] leading-relaxed"></p>
          </div>

          <div id="esStaffReadOnlyAlert" class="hidden p-3 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <i class="fa-solid fa-lock text-amber-500"></i>
            <span>Apenas usuários com perfil <strong>Administrador</strong> podem conectar ou desconectar o WhatsApp da clínica.</span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-end gap-3 pt-1">
            <div class="sm:w-64">
              <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PIN de 6 dígitos (opcional — Cloud API)
              </label>
              <input type="text" id="esPinInput" maxlength="6" pattern="\\d{6}" placeholder="Ex: 123456 (se número novo)"
                class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-[#008069]">
            </div>

            <button type="button" id="btnLaunchEmbeddedSignup" onclick="launchMetaEmbeddedSignup()"
              class="px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition">
              <i class="fa-brands fa-facebook"></i>
              <span id="btnLaunchEmbeddedSignupText">Conectar via Meta Embedded Signup</span>
            </button>
          </div>

          <div id="esProgressBox" class="hidden p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"></div>
        </div>

        <!-- CARD 3: CONEXÃO MANUAL / AVANÇADA (FALLBACK PARA CREDENCIAIS GERADAS NA META) -->
        <details id="manualWaDetails" class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <summary class="px-6 py-4 cursor-pointer flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition select-none">
            <span class="flex items-center gap-2">
              <i class="fa-solid fa-key text-amber-500"></i>
              <span>Configuração Manual / Avançada (Phone Number ID + WABA ID + Access Token)</span>
            </span>
            <span class="text-[11px] font-normal text-slate-400">Clique para expandir</span>
          </summary>

          <form onsubmit="handleSaveManualWhatsApp(event)" class="px-6 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Use esta opção caso já possua as credenciais geradas no painel Meta Developers / System User. Validamos o número direto na Graph API antes de salvar e criptografamos o token em AES-256-GCM.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Phone Number ID (Meta) *</label>
                <input type="text" id="manualPhoneNumberId" required placeholder="Ex: 1459702903890342"
                  class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:border-[#008069]">
              </div>
              <div>
                <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">WABA ID (WhatsApp Business Account)</label>
                <input type="text" id="manualWabaId" placeholder="Ex: 102030405060708"
                  class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:border-[#008069]">
              </div>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Access Token da Meta (Permanente / System User)</label>
              <input type="password" id="manualAccessToken" placeholder="EAAG... (obrigatório na primeira conexão; deixe vazio só para manter o token já salvo)"
                class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:border-[#008069]">
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button type="button" id="btnDisconnectWaManual" onclick="handleDisconnectWhatsApp()"
                class="hidden px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold transition">
                Desconectar WhatsApp
              </button>
              <button type="submit" id="btnSaveManualWa"
                class="ml-auto px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white font-bold shadow-sm transition flex items-center gap-2">
                <i class="fa-solid fa-plug-circle-check"></i>
                <span>Validar na Meta & Conectar</span>
              </button>
            </div>
          </form>
        </details>

        <!-- CARD 4: DIAGNÓSTICO DE WEBHOOK & CONEXÃO -->
        <div class="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i class="fa-solid fa-stethoscope text-sky-500"></i>
                <span>Diagnóstico de Webhook & Saúde da Conexão</span>
              </h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Verifica token criptografado, qualidade do número na Meta e assinatura de webhooks no WABA.</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" id="btnSubscribeWebhook" onclick="handleSubscribeWebhook()"
                class="hidden px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5">
                <i class="fa-solid fa-satellite-dish"></i>
                <span>Assinar Webhook Agora</span>
              </button>
              <button type="button" id="btnRunWaDiagnose" onclick="runWhatsAppDiagnostics()"
                class="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-bold text-xs transition flex items-center gap-1.5">
                <i class="fa-solid fa-heart-pulse"></i>
                <span>Testar Conexão & Diagnóstico</span>
              </button>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div class="min-w-0">
              <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Webhook Callback URL da Plataforma</span>
              <code id="waWebhookUrlText" class="text-[11px] font-mono text-slate-700 dark:text-slate-200 break-all">-</code>
            </div>
            <button type="button" onclick="copyWebhookUrl()" class="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold flex items-center gap-1.5 shrink-0 transition">
              <i class="fa-regular fa-copy"></i>
              <span>Copiar URL</span>
            </button>
          </div>

          <div id="waDiagnosticsResults" class="space-y-2 text-xs">
            <p class="text-[11px] text-slate-400 italic">Clique em "Testar Conexão & Diagnóstico" para validar em tempo real na Meta Graph API.</p>
          </div>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- SUB-PAINEL 2: DADOS CADASTRAIS DA CLÍNICA & ALTERAÇÃO DE SENHA      -->
      <!-- =================================================================== -->


      <!-- =================================================================== -->
      <!-- SUB-PAINEL 3: EQUIPE & USUÁRIOS DA CLÍNICA                          -->
      <!-- =================================================================== -->


    </div>
  </main>
`;
