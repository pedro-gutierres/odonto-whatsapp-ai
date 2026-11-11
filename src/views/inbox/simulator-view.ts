export const INBOX_SIMULATOR_VIEW_HTML = `
  <!-- ======================================================================= -->
  <!-- VIEW 5: TEST DRIVE DA IA (SIMULADOR DE ATENDIMENTO WHATSAPP)              -->
  <!-- ======================================================================= -->
  <main id="viewSimulator" class="flex-1 overflow-hidden hidden bg-slate-50 dark:bg-[#0b0f17] flex flex-col md:flex-row">
    
    <!-- COLUNA ESQUERDA: CENÁRIOS RÁPIDOS & CONTROLES DE TEST DRIVE -->
    <aside class="w-full md:w-80 lg:w-96 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 transition-colors overflow-y-auto custom-scroll p-4 md:p-5 space-y-4">
      
      <!-- CABEÇALHO DO SIMULADOR -->
      <div class="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between">
          <span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] uppercase tracking-wider border border-purple-500/20">
            Ambiente Seguro
          </span>
          <span class="text-[10px] text-slate-400 font-medium">Sem custo Meta API</span>
        </div>
        <h2 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <i class="fa-solid fa-flask-vial text-purple-600 dark:text-purple-400"></i>
          <span>Test Drive da IA</span>
        </h2>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Simule conversas reais como se fosse um paciente no WhatsApp. A IA responde utilizando os procedimentos e conduta do seu <b>Treinamento</b>.
        </p>
      </div>

      <!-- STATUS DA CONFIGURAÇÃO DA CLÍNICA -->
      <div class="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/50 text-xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 tracking-wider">Configuração Ativa</span>
          <button type="button" onclick="selectNavigationTab('config', 'Treinamento & Regras da IA', 'fa-solid fa-sliders', 'purple')"
            class="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1">
            <span>Editar</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
        <div class="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
          <div class="truncate">Clínica: <b id="simStatusClinicName">Carregando...</b></div>
          <div class="truncate">Tom de Voz: <b id="simStatusTone">Carregando...</b></div>
        </div>
      </div>

      <!-- CENÁRIOS RÁPIDOS DE TESTE (CHIPS COM 1 CLIQUE) -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <i class="fa-solid fa-wand-magic-sparkles text-purple-500 text-xs"></i>
            <span>Cenários Rápidos com 1 Clique</span>
          </span>
        </div>
        <p class="text-[10px] text-slate-500 dark:text-slate-400">Clique para enviar a pergunta simulada do paciente instantaneamente:</p>

        <div class="space-y-2">
          <!-- Cenário 1: Agendamento -->
          <button type="button" onclick="sendSimulatorScenario('Olá! Gostaria de agendar uma avaliação para clareamento dental na próxima quinta-feira às 14h, meu nome é Mariana Silva.')"
            class="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500/80 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 transition group">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="w-5 h-5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                <i class="fa-regular fa-calendar-check"></i>
              </span>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">🗓️ Agendar Avaliação</span>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">"Quero marcar clareamento qui 14h, sou a Mariana..."</p>
          </button>

          <!-- Cenário 2: Dúvida de Preço -->
          <button type="button" onclick="sendSimulatorScenario('Olá, qual é o valor para colocar lentes de resina ou facetas? Vocês parcelam?')"
            class="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500/80 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-tag"></i>
              </span>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">💰 Dúvida sobre Preço</span>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">"Qual o valor de lentes de resina? Vocês parcelam?"</p>
          </button>

          <!-- Cenário 3: Horários de Atendimento -->
          <button type="button" onclick="sendSimulatorScenario('Qual é o horário de atendimento da clínica durante a semana e aos sábados?')"
            class="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500/80 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition group">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                <i class="fa-regular fa-clock"></i>
              </span>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">⏰ Horário de Funcionamento</span>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">"Qual o horário durante a semana e aos sábados?"</p>
          </button>

          <!-- Cenário 4: Localização e Estacionamento -->
          <button type="button" onclick="sendSimulatorScenario('Onde vocês ficam localizados? Tem estacionamento no local ou convênio com algum próximo?')"
            class="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500/80 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition group">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="w-5 h-5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-location-dot"></i>
              </span>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">📍 Localização & Vagas</span>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">"Onde vocês ficam? Tem estacionamento por perto?"</p>
          </button>

          <!-- Cenário 5: Urgência Odontológica -->
          <button type="button" onclick="sendSimulatorScenario('Estou sentindo uma dor aguda quando bebo água gelada. Vocês atendem canal de urgência?')"
            class="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500/80 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition group">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="w-5 h-5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </span>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">🚨 Urgência Odonto</span>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">"Dor aguda com água gelada. Atendem canal de urgência?"</p>
          </button>
        </div>
      </div>

      <!-- AÇÃO DE REINICIAR CONVERSA -->
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onclick="resetSimulatorChat()"
          class="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition">
          <i class="fa-solid fa-rotate-right text-[11px]"></i>
          <span>Reiniciar Conversa do Simulador</span>
        </button>
      </div>

    </aside>

    <!-- COLUNA DIREITA: JANELA DE CHAT ESTILO WHATSAPP -->
    <section class="flex-1 flex flex-col relative transition-colors duration-200 overflow-hidden">
      
      <!-- SUB-BARRA DA SIMULAÇÃO (TOPO) -->
      <div class="h-14 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-4 flex items-center justify-between shrink-0 shadow-sm transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-none">Paciente Virtual (WhatsApp)</h3>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                Test Drive
              </span>
            </div>
            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Aura AI Conectada (Haiku 3.5 com Prompt Caching)</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" onclick="selectNavigationTab('agenda', 'Agenda', 'fa-regular fa-calendar-check', 'sky')"
            class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-sky-600 dark:text-sky-400 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <i class="fa-regular fa-calendar-check"></i>
            <span>Ver Agenda</span>
          </button>
          <button type="button" onclick="resetSimulatorChat()" title="Reiniciar conversa"
            class="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center text-xs transition">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      </div>

      <!-- BANNER DE BLOQUEIO POR TRIAL EXPIRADO OU LIMITE ATINGIDO -->
      <div id="simulatorLockBanner" class="hidden mx-4 mt-3 p-3.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-900 dark:text-rose-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div class="flex items-start gap-2.5">
          <i class="fa-solid fa-lock text-rose-500 mt-0.5 text-sm"></i>
          <div class="text-xs space-y-0.5">
            <span class="font-bold block text-rose-700 dark:text-rose-300">Test Drive Finalizado ou Limite de 100 Mensagens Atingido</span>
            <p class="text-[11px] text-rose-800 dark:text-rose-200">
              Novas mensagens no simulador estão pausadas. Suas consultas na Agenda e configurações permanecem salvas e acessíveis.
            </p>
          </div>
        </div>
        <a href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Gostaria%20de%20ativar%20meu%20plano%20da%20Aura%20AI" 
           target="_blank" rel="noopener"
           class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap transition shadow-sm flex items-center gap-1.5 self-start sm:self-center">
          <i class="fa-solid fa-crown text-amber-300"></i>
          <span>Ativar Assinatura</span>
        </a>
      </div>

      <!-- ÁREA DE MENSAGENS COM SCROLL (ESTILO WHATSAPP) -->
      <div id="simulatorMessagesArea" class="flex-1 overflow-y-auto custom-scroll p-4 md:p-6 space-y-3.5 wa-bg-light dark:wa-bg-dark transition-all">
        <!-- Renderizado dinamicamente via public/js/inbox/simulator.js -->
      </div>

      <!-- INDICADOR DE DIGITAÇÃO (IA FORMULANDO RESPOSTA) -->
      <div id="simulatorTypingIndicator" class="hidden px-6 py-2.5 wa-bg-light dark:wa-bg-dark shrink-0">
        <div class="flex items-center gap-2 p-2.5 bg-white/90 dark:bg-[#202c33]/90 rounded-2xl rounded-tl-sm w-fit shadow-xs border border-slate-200/50 dark:border-slate-700/30 text-xs text-slate-500 dark:text-slate-400">
          <span class="text-[11px] font-bold text-purple-600 dark:text-purple-400">Aura AI</span>
          <span class="flex gap-1 items-center px-1">
            <span class="w-2 h-2 rounded-full bg-purple-500 animate-bounce"></span>
            <span class="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]"></span>
            <span class="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]"></span>
          </span>
          <span class="text-[10px] text-slate-400 ml-1">formulando resposta...</span>
        </div>
      </div>

      <!-- INPUT INFERIOR DA CONVERSA -->
      <div id="simulatorInputBar" class="bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800/80 p-3 shrink-0 flex flex-col gap-1.5 transition-colors">
        <form onsubmit="handleSimulatorSubmit(event)" class="flex items-center gap-2">
          <input type="text" id="simulatorMessageInput" maxlength="1000" oninput="updateSimulatorCharCount()" placeholder="Digite como se fosse um paciente no WhatsApp..." 
            class="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 transition">
          <span id="simulatorCharCount" class="text-[10px] text-slate-400 font-mono hidden sm:inline px-1">0 / 1000</span>
          <button type="submit" id="simulatorSendBtn" 
            class="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm">
            <span>Enviar</span>
            <i class="fa-solid fa-paper-plane text-[10px]"></i>
          </button>
        </form>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 px-1 flex items-center justify-between">
          <span>🔒 Test Drive seguro: Suas mensagens não são enviadas pela Meta e não poluem sua lista de pacientes reais.</span>
          <span class="hidden md:inline font-medium text-purple-600 dark:text-purple-400">1 mensagem = 1 consumo do trial</span>
        </p>
      </div>

    </section>

  </main>
`;
