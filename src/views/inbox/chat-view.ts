export const INBOX_CHAT_VIEW_HTML = `
  <!-- ======================================================================= -->
  <!-- VIEW 1: CENTRAL DE ATENDIMENTO MULTI-CHAT WHATSAPP                      -->
  <!-- ======================================================================= -->
  <main id="viewChat" class="flex-1 flex overflow-hidden">
    
    <!-- COLUNA 1: LISTA DE CONVERSAS (ESQUERDA) -->
    <aside class="w-80 md:w-96 bg-white dark:bg-[#171717] border-r border-neutral-200 dark:border-neutral-800/80 flex flex-col shrink-0 transition-colors">
      
      <!-- BUSCA E FILTRO -->
      <div class="p-3 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-neutral-400 text-xs"></i>
          <input type="text" id="searchInput" oninput="filterChats()" placeholder="Pesquisar conversa ou telefone..." 
            class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)] transition">
        </div>
        <div class="flex items-center justify-between mt-2 px-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
          <span id="chatCount">Carregando conversas...</span>
          <span id="sidebarAiGlobalBadge" class="flex items-center gap-1 text-[var(--aura-accent)] "><i class="fa-solid fa-bolt text-[10px]"></i> IA Ativa 24h</span>
        </div>
      </div>

      <!-- LISTA SCROLLÁVEL DE CONVERSAS -->
      <div id="conversationList" class="flex-1 overflow-y-auto custom-scroll divide-y divide-neutral-100 dark:divide-neutral-800/40">
        <div class="p-8 text-center text-neutral-400 text-xs">
          <i class="fa-solid fa-circle-notch fa-spin text-base mb-2 block"></i>
          Sincronizando pacientes...
        </div>
      </div>

    </aside>

    <!-- COLUNA 2: HISTÓRICO DE MENSAGENS E CHAT (CENTRAL) -->
    <section class="flex-1 flex flex-col relative transition-colors duration-200">
      
      <!-- SUB-BARRA DA CONVERSA SELECIONADA (ESTILO WHATSAPP) -->
      <div id="chatHeader" class="h-14 bg-white dark:bg-[#171717] border-b border-neutral-200 dark:border-neutral-800/80 px-4 flex items-center justify-between shrink-0 shadow-sm transition-colors">
        <div class="flex items-center gap-3">
          <div id="activeAvatar" class="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center font-bold text-xs uppercase">
            ?
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 id="activeContactName" class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white leading-none">Selecione uma conversa</h2>
              <span id="activeAiBadge" class="hidden text-[10px] font-semibold px-2 py-0.5 rounded-full border"></span>
            </div>
            <p id="activeContactPhone" class="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">Nenhum chat selecionado</p>
          </div>
        </div>

        <!-- LADO DIREITO: RELÓGIO BRASÍLIA EM TEMPO REAL + BOTÃO DE IA -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- WIDGET DE DATA E HORA SINCRONIZADA EM TEMPO REAL (BRASÍLIA 24H) -->
          <div id="brasiliaTimeWidget" title="Horário de Brasília em tempo real (24h) sincronizado com o servidor"
            class="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 shadow-xs select-none">
            <span class="relative flex h-2 w-2 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--aura-accent)] opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-[var(--aura-accent)]"></span>
            </span>
            <div class="flex items-center gap-1.5 leading-none">
              <span id="liveBrasiliaDate" class="hidden sm:inline text-[11px] font-medium text-neutral-600 dark:text-neutral-300">--/--</span>
              <span class="hidden sm:inline text-neutral-300 dark:text-neutral-600 font-light">•</span>
              <span id="liveBrasiliaClock" class="text-xs font-bold font-mono text-[var(--aura-accent)] tracking-wider">--:--:--</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--aura-accent-soft)] text-[var(--aura-accent)] uppercase shrink-0">DF 24h</span>
            </div>
          </div>

          <!-- BOTÃO DE CONTROLE DA IA (HUMAN TAKEOVER) -->
          <button id="toggleAiBtn" onclick="handleToggleAi()" class="hidden text-xs font-semibold px-3 py-1.5 rounded-xl transition items-center gap-1.5 shadow-sm">
            <span id="toggleAiIcon"></span>
            <span id="toggleAiText">Carregando...</span>
          </button>
        </div>
      </div>

      <!-- BANNER DE BLOQUEIO POR TREINAMENTO INCOMPLETO -->
      <div id="chatCrucialLockBanner" class="hidden mx-4 mt-2 p-3.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-900 dark:text-rose-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-start gap-2.5">
          <i class="fa-solid fa-lock text-rose-500 mt-0.5 text-sm"></i>
          <div class="text-xs space-y-0.5">
            <span class="font-bold block text-rose-700 dark:text-rose-300">A IA precisa conhecer seu negócio</span>
            <p class="text-[11px] text-rose-800 dark:text-rose-200" id="chatCrucialLockDetails">
              Preencha as informações essenciais antes de ativar o atendimento.
            </p>
          </div>
        </div>
        <button type="button" onclick="goToTrainingAndHighlightMissing()"
          class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap transition shadow-sm self-start sm:self-center flex items-center gap-1.5">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Preencher informações</span>
        </button>
      </div>

      <!-- ÁREA DE MENSAGENS COM SCROLL -->
      <div id="messagesArea" class="flex-1 overflow-y-auto custom-scroll p-4 md:p-6 space-y-3 bg-[var(--aura-bg)] transition-all">
        <div class="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 text-xs p-6 text-center">
          <div class="w-16 h-16 rounded-2xl bg-white/60 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-center text-2xl text-neutral-300 dark:text-neutral-600 mb-3">
            <i class="fa-brands fa-whatsapp"></i>
          </div>
          <p class="font-medium text-neutral-700 dark:text-neutral-300 mb-1">Selecione um paciente na lista ao lado para ver o histórico.</p>
          <p class="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
            Ainda não recebeu mensagens ou quer testar a IA imediatamente sem conectar número?
          </p>
          <button onclick="selectNavigationTab('simulator', 'Test Drive da IA', 'fa-solid fa-flask-vial', 'purple')"
            class="px-4 py-2 rounded-xl bg-neutral-600 hover:bg-neutral-700 text-white font-bold text-xs shadow-md shadow-neutral-500/20 flex items-center gap-2 transition">
            <i class="fa-solid fa-flask-vial"></i>
            <span>Fazer Test Drive da IA no Simulador</span>
          </button>
        </div>
      </div>

      <!-- INPUT DA RECEPCIONISTA (RESPOSTA MANUAL) -->
      <div id="inputBar" class="bg-white dark:bg-[#171717] border-t border-neutral-200 dark:border-neutral-800/80 p-3 shrink-0 flex flex-col gap-1 transition-colors">
        <form onsubmit="handleSendMessage(event)" class="flex items-center gap-2">
          <input type="text" id="messageInput" disabled placeholder="Escreva sua mensagem" 
            class="flex-1 px-4 py-2.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[var(--aura-accent)] disabled:opacity-50 transition">
          <button type="submit" id="sendBtn" disabled 
            class="px-4 py-2.5 rounded-xl aura-filled disabled:opacity-40 font-semibold text-xs flex items-center gap-1.5 transition shadow-sm">
            <span>Enviar</span>
            <i class="fa-solid fa-paper-plane text-[10px]"></i>
          </button>
        </form>
        <p class="text-[10px] text-neutral-400 dark:text-neutral-500 px-1">
          💡 Sempre que você enviar uma mensagem manual, a IA será pausada para que você assuma o controle e só responderá novamente caso você a reative.
        </p>
      </div>

    </section>

    <!-- COLUNA 3: DETALHES DO PACIENTE (DIREITA) -->
    <aside class="hidden xl:flex w-80 bg-white dark:bg-[#171717] border-l border-neutral-200 dark:border-neutral-800/80 flex-col p-4 shrink-0 transition-colors">
      <div class="text-center pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
        <div id="sideAvatar" class="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-bold text-xl uppercase mx-auto mb-2 border border-neutral-200 dark:border-neutral-700">
          ?
        </div>
        <h3 id="sideContactName" class="text-sm font-bold text-neutral-900 dark:text-white">Nenhuma conversa selecionada</h3>
        <p id="sideContactPhone" class="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">-</p>
      </div>

      <div class="py-4 space-y-4 flex-1 overflow-y-auto custom-scroll text-xs">
        
        <!-- STATUS DA IA -->
        <div class="bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <span class="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">Status do Atendimento</span>
          <div class="flex items-center justify-between">
            <span id="sideAiStatusText" class="font-bold text-neutral-700 dark:text-neutral-300">Aguardando seleção</span>
            <button id="sideToggleAiBtn" onclick="handleToggleAi()" class="text-[11px] text-[var(--aura-accent)] font-semibold hover:underline hidden">Alterar</button>
          </div>
        </div>

        <!-- PROCEDIMENTO DE INTERESSE DETECTADO -->
        <div class="bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <span class="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">Procedimento de Interesse</span>
          <div id="sideProcedureDetected" class="font-bold text-neutral-800 dark:text-neutral-200">
            Nenhum detectado ainda
          </div>
        </div>

        <!-- AÇÃO DIRETA: AGENDAR CONSULTA -->
        <div class="bg-gradient-to-br from-[var(--aura-accent-soft)] to-neutral-500/5 p-3.5 rounded-xl border border-[var(--aura-accent-line)]">
          <span class="text-[10px] uppercase font-bold tracking-wider text-[var(--aura-accent)] block mb-1">Ação Comercial</span>
          <p class="text-[11px] text-neutral-600 dark:text-neutral-300 mb-2.5">Transfira este paciente diretamente para a grade de agendamentos.</p>
          <button onclick="openAppointmentModalForCurrentPatient()" id="btnScheduleThisPatient" disabled
            class="w-full py-2 px-3 rounded-xl aura-filled disabled:opacity-50 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm">
            <i class="fa-regular fa-calendar-plus"></i>
            <span>Agendar Consulta deste Paciente</span>
          </button>
        </div>

      </div>

      <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-center">
        <button onclick="handleClearCurrentChat()" id="btnClearChat" disabled
          class="text-xs text-rose-500 hover:text-rose-600 disabled:opacity-30 font-medium transition">
          <i class="fa-regular fa-trash-can mr-1"></i> Excluir histórico Deste Chat
        </button>
      </div>
    </aside>

  </main>
`;
