export const INBOX_HTML = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Central da Recepcionista | Aura AI Odonto & Estética</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              DEFAULT: '#008069',
              dark: '#006a57',
              light: '#25d366'
            }
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .wa-bg-light {
      background-color: #efeae2;
      background-image: radial-gradient(#d1d7db 1px, transparent 1px);
      background-size: 18px 18px;
    }
    .wa-bg-dark {
      background-color: #0b141a;
      background-image: radial-gradient(#1f2c34 1px, transparent 1px);
      background-size: 18px 18px;
    }
    .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.25); border-radius: 9999px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.45); }
  </style>
</head>
<body class="bg-slate-100 dark:bg-[#0b0f17] text-slate-800 dark:text-slate-100 h-screen flex flex-col overflow-hidden selection:bg-[#008069] selection:text-white transition-colors duration-200">

  <!-- CABEÇALHO SUPERIOR GLOBAL -->
  <header class="h-16 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-6 flex items-center justify-between shrink-0 z-30 transition-colors relative">
    
    <!-- LADO ESQUERDO: LOGO E CLÍNICA -->
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#008069] to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/10 font-bold text-base">
        <i class="fa-solid fa-sparkles"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">Aura<span class="text-emerald-500 dark:text-emerald-400">AI</span></span>
          <span id="topClinicNameBadge" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/60 max-w-[160px] truncate">
            Clínica Sorriso & Estética
          </span>
        </div>
        <span class="text-[10px] block font-medium text-slate-500 dark:text-slate-400">Odontologia & Estética Avançada 24h</span>
      </div>
    </div>

    <!-- CENTRO SUPERIOR: SELETOR DE MÓDULOS (MENU VERTICAL) -->
    <div class="relative flex items-center justify-center" id="verticalMenuContainer">
      <!-- Botão Seletor Principal -->
      <button id="verticalMenuTrigger" onclick="toggleVerticalMenu(event)" 
        class="flex items-center gap-2.5 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700/60 shadow-sm transition font-semibold text-xs sm:text-sm">
        <div id="selectedMenuIcon" class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
          <i class="fa-solid fa-comments"></i>
        </div>
        <span id="selectedMenuLabel" class="tracking-tight">Atendimento WhatsApp</span>
        <i id="verticalMenuChevron" class="fa-solid fa-chevron-down text-slate-400 text-[10px] ml-1 transition-transform duration-200"></i>
      </button>

      <!-- Menu Vertical Dropdown Flutuante -->
      <div id="verticalMenuDropdown" class="hidden absolute top-full mt-2 w-72 bg-white dark:bg-[#151c28] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 transition-all duration-200 backdrop-blur-md">
        
        <div class="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
          Navegação da Plataforma
        </div>

        <!-- Opção 1: Atendimento WhatsApp -->
        <button onclick="selectNavigationTab('chat', 'Atendimento WhatsApp', 'fa-solid fa-comments', 'emerald')" 
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition group">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
              <i class="fa-solid fa-comments"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-900 dark:text-white block">Atendimento WhatsApp</span>
              <span class="text-[10px] text-slate-500 dark:text-slate-400">Multi-chat ao vivo e mensagens</span>
            </div>
          </div>
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </button>

        <!-- Opção 2: Agenda -->
        <button onclick="selectNavigationTab('agenda', 'Agenda', 'fa-regular fa-calendar-check', 'sky')" 
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition group">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
              <i class="fa-regular fa-calendar-check"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-900 dark:text-white block">Agenda</span>
              <span class="text-[10px] text-slate-500 dark:text-slate-400">Grade de consultas e confirmações</span>
            </div>
          </div>
          <span id="menuAppointmentsBadge" class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">0</span>
        </button>

        <!-- Opção 3: Configurações & Treinamento da IA (Questionário) -->
        <button onclick="selectNavigationTab('config', 'Treinamento & Regras da IA', 'fa-solid fa-sliders', 'purple')" 
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition group">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
              <i class="fa-solid fa-sliders"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-900 dark:text-white block">Treinamento & IA</span>
              <span class="text-[10px] text-slate-500 dark:text-slate-400">Questionário Estética & Odonto</span>
            </div>
          </div>
          <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold">IA</span>
        </button>

      </div>
    </div>

    <!-- LADO DIREITO: DARK MODE E USUÁRIO LOGADO -->
    <div class="flex items-center gap-2.5">
      
      <!-- BOTÃO TOGGLE DARK/LIGHT MODE -->
      <button onclick="toggleTheme()" title="Alternar Modo Escuro/Claro"
        class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-xs transition">
        <i id="themeIcon" class="fa-solid fa-moon"></i>
      </button>

      <!-- USUÁRIO LOGADO & LOGOUT -->
      <div class="pl-2 border-l border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold flex items-center justify-center text-xs">
          <i class="fa-solid fa-user-doctor"></i>
        </div>
        <div class="hidden xl:block text-left">
          <span id="topUserName" class="text-xs font-bold text-slate-900 dark:text-white block leading-none">Recepção</span>
          <span id="topUserEmail" class="text-[10px] text-slate-400 font-medium">Carregando...</span>
        </div>
        <button onclick="handleLogout()" title="Sair da Plataforma"
          class="w-8 h-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center text-xs transition ml-1">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>

    </div>
  </header>

  <!-- ======================================================================= -->
  <!-- VIEW 1: CENTRAL DE ATENDIMENTO MULTI-CHAT WHATSAPP                      -->
  <!-- ======================================================================= -->
  <main id="viewChat" class="flex-1 flex overflow-hidden">
    
    <!-- COLUNA 1: LISTA DE CONVERSAS (ESQUERDA) -->
    <aside class="w-80 md:w-96 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 transition-colors">
      
      <!-- BUSCA E FILTRO -->
      <div class="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          <input type="text" id="searchInput" oninput="filterChats()" placeholder="Pesquisar conversa ou telefone..." 
            class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#008069] transition">
        </div>
        <div class="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span id="chatCount">Carregando conversas...</span>
          <span id="sidebarAiGlobalBadge" class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-bolt text-[10px]"></i> IA Ativa 24h</span>
        </div>
      </div>

      <!-- LISTA SCROLLÁVEL DE CONVERSAS -->
      <div id="conversationList" class="flex-1 overflow-y-auto custom-scroll divide-y divide-slate-100 dark:divide-slate-800/40">
        <div class="p-8 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-circle-notch fa-spin text-base mb-2 block"></i>
          Sincronizando pacientes...
        </div>
      </div>

    </aside>

    <!-- COLUNA 2: HISTÓRICO DE MENSAGENS E CHAT (CENTRAL) -->
    <section class="flex-1 flex flex-col relative transition-colors duration-200">
      
      <!-- SUB-BARRA DA CONVERSA SELECIONADA (ESTILO WHATSAPP) -->
      <div id="chatHeader" class="h-14 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-4 flex items-center justify-between shrink-0 shadow-sm transition-colors">
        <div class="flex items-center gap-3">
          <div id="activeAvatar" class="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs uppercase">
            ?
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 id="activeContactName" class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-none">Selecione uma conversa</h2>
              <span id="activeAiBadge" class="hidden text-[10px] font-semibold px-2 py-0.5 rounded-full border"></span>
            </div>
            <p id="activeContactPhone" class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">Nenhum chat selecionado</p>
          </div>
        </div>

        <!-- LADO DIREITO: RELÓGIO BRASÍLIA EM TEMPO REAL + BOTÃO DE IA -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- WIDGET DE DATA E HORA SINCRONIZADA EM TEMPO REAL (BRASÍLIA 24H) -->
          <div id="brasiliaTimeWidget" title="Horário de Brasília em tempo real (24h) sincronizado com o servidor"
            class="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs select-none">
            <span class="relative flex h-2 w-2 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div class="flex items-center gap-1.5 leading-none">
              <span id="liveBrasiliaDate" class="hidden sm:inline text-[11px] font-medium text-slate-600 dark:text-slate-300">--/--</span>
              <span class="hidden sm:inline text-slate-300 dark:text-slate-600 font-light">•</span>
              <span id="liveBrasiliaClock" class="text-xs font-bold font-mono text-[#008069] dark:text-emerald-400 tracking-wider">--:--:--</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-[#008069] dark:text-emerald-300 uppercase shrink-0">DF 24h</span>
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
            <span class="font-bold block text-rose-700 dark:text-rose-300">Atendimento Chat e IA Desligados — Treinamento Obrigatório Pendente</span>
            <p class="text-[11px] text-rose-800 dark:text-rose-200" id="chatCrucialLockDetails">
              Faltam informações cruciais no Treinamento da IA (destacadas em vermelho) para liberar o atendimento automático.
            </p>
          </div>
        </div>
        <button type="button" onclick="goToTrainingAndHighlightMissing()"
          class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap transition shadow-sm self-start sm:self-center flex items-center gap-1.5">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Ver Pendências em Vermelho</span>
        </button>
      </div>

      <!-- ÁREA DE MENSAGENS COM SCROLL -->
      <div id="messagesArea" class="flex-1 overflow-y-auto custom-scroll p-4 md:p-6 space-y-3 wa-bg-light dark:wa-bg-dark transition-all">
        <div class="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
          <div class="w-16 h-16 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-2xl text-slate-300 dark:text-slate-600 mb-3">
            <i class="fa-brands fa-whatsapp"></i>
          </div>
          <p class="font-medium">Selecione um paciente na lista ao lado para ver o histórico.</p>
        </div>
      </div>

      <!-- INPUT DA RECEPCIONISTA (RESPOSTA MANUAL) -->
      <div id="inputBar" class="bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800/80 p-3 shrink-0 flex flex-col gap-1 transition-colors">
        <form onsubmit="handleSendMessage(event)" class="flex items-center gap-2">
          <input type="text" id="messageInput" disabled placeholder="Escreva sua mensagem" 
            class="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#008069] disabled:opacity-50 transition">
          <button type="submit" id="sendBtn" disabled 
            class="px-4 py-2.5 rounded-xl bg-[#008069] hover:bg-[#006a57] disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm">
            <span>Enviar</span>
            <i class="fa-solid fa-paper-plane text-[10px]"></i>
          </button>
        </form>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 px-1">
          💡 Sempre que você enviar uma mensagem manual, a IA será pausada para que você assuma o controle e só responderá novamente caso você a reative.
        </p>
      </div>

    </section>

    <!-- COLUNA 3: DETALHES DO PACIENTE (DIREITA) -->
    <aside class="hidden xl:flex w-80 bg-white dark:bg-[#111827] border-l border-slate-200 dark:border-slate-800/80 flex-col p-4 shrink-0 transition-colors">
      <div class="text-center pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div id="sideAvatar" class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xl uppercase mx-auto mb-2 border border-slate-200 dark:border-slate-700">
          ?
        </div>
        <h3 id="sideContactName" class="text-sm font-bold text-slate-900 dark:text-white">Nenhum Paciente</h3>
        <p id="sideContactPhone" class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">-</p>
      </div>

      <div class="py-4 space-y-4 flex-1 overflow-y-auto custom-scroll text-xs">
        
        <!-- STATUS DA IA -->
        <div class="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Status do Atendimento</span>
          <div class="flex items-center justify-between">
            <span id="sideAiStatusText" class="font-bold text-slate-700 dark:text-slate-300">Aguardando seleção</span>
            <button id="sideToggleAiBtn" onclick="handleToggleAi()" class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline hidden">Alterar</button>
          </div>
        </div>

        <!-- PROCEDIMENTO DE INTERESSE DETECTADO -->
        <div class="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Procedimento de Interesse</span>
          <div id="sideProcedureDetected" class="font-bold text-slate-800 dark:text-slate-200">
            Nenhum detectado ainda
          </div>
        </div>

        <!-- AÇÃO DIRETA: AGENDAR CONSULTA -->
        <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3.5 rounded-xl border border-emerald-500/20">
          <span class="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">Ação Comercial</span>
          <p class="text-[11px] text-slate-600 dark:text-slate-300 mb-2.5">Transfira este paciente diretamente para a grade de agendamentos.</p>
          <button onclick="openAppointmentModalForCurrentPatient()" id="btnScheduleThisPatient" disabled
            class="w-full py-2 px-3 rounded-xl bg-[#008069] hover:bg-[#006a57] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm">
            <i class="fa-regular fa-calendar-plus"></i>
            <span>Agendar Consulta deste Paciente</span>
          </button>
        </div>

      </div>

      <div class="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
        <button onclick="handleClearCurrentChat()" id="btnClearChat" disabled
          class="text-xs text-rose-500 hover:text-rose-600 disabled:opacity-30 font-medium transition">
          <i class="fa-regular fa-trash-can mr-1"></i> Limpar Histórico Deste Chat
        </button>
      </div>
    </aside>

  </main>

  <!-- ======================================================================= -->
  <!-- VIEW 2: AGENDA (CALENDÁRIO INTERATIVO & GRADE DE CONSULTAS)             -->
  <!-- ======================================================================= -->
  <main id="viewAgenda" class="flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 hidden bg-slate-50 dark:bg-[#0b0f17]">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- TOPO DA AGENDA: TÍTULO & AÇÕES -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center gap-2.5">
          <span class="w-3 h-3 rounded-full bg-sky-500 animate-pulse"></span>
          <h2 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Agenda</h2>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="loadAppointments()" class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition" title="Atualizar">
            <i class="fa-solid fa-rotate-right" id="agendaRefreshIcon"></i>
          </button>
          <button id="btnNewAppointmentAgenda" onclick="openAppointmentModal()" class="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition">
            <i class="fa-solid fa-calendar-plus"></i>
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      <!-- BANNER DE BLOQUEIO DA AGENDA POR TREINAMENTO INCOMPLETO -->
      <div id="agendaCrucialLockBanner" class="hidden p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-900 dark:text-rose-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-lock text-sm"></i>
          </div>
          <div class="text-xs space-y-0.5">
            <span class="font-bold block text-sm text-rose-700 dark:text-rose-300">Agendamentos e IA Bloqueados — Treinamento Obrigatório Pendente</span>
            <p class="text-[11px] text-rose-800 dark:text-rose-200" id="agendaCrucialLockDetails">
              Faltam informações cruciais no Treinamento da IA (destacadas em vermelho) para liberar a realização de novos agendamentos.
            </p>
          </div>
        </div>
        <button type="button" onclick="goToTrainingAndHighlightMissing()"
          class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap transition shadow-sm self-start sm:self-center flex items-center gap-1.5">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Ver Pendências em Vermelho</span>
        </button>
      </div>

      <!-- CARDS DE MÉTRICAS RÁPIDAS -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Total Cadastrados</span>
            <i class="fa-solid fa-comments text-slate-400 text-sm"></i>
          </div>
          <div class="text-2xl font-black text-slate-900 dark:text-white" id="metricTotal">0</div>
          <span class="text-[10px] text-slate-400">Conversas no chat</span>
        </div>

        <div class="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between text-amber-500 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Agendados</span>
            <i class="fa-solid fa-clock text-sm"></i>
          </div>
          <div class="text-2xl font-black text-amber-600 dark:text-amber-400" id="metricAgendados">0</div>
          <span class="text-[10px] text-slate-400">Consultas marcadas</span>
        </div>

        <div class="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between text-emerald-500 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Confirmados</span>
            <i class="fa-solid fa-calendar-check text-sm"></i>
          </div>
          <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400" id="metricConfirmed">0</div>
          <span class="text-[10px] text-slate-400">Confirmados pela IA</span>
        </div>

        <div class="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between text-sky-500 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Concluídos</span>
            <i class="fa-solid fa-circle-check text-sm"></i>
          </div>
          <div class="text-2xl font-black text-sky-600 dark:text-sky-400" id="metricConcluidos">0</div>
          <span class="text-[10px] text-slate-400">Atendimentos finalizados</span>
        </div>
      </div>

      <!-- SEÇÃO CALENDÁRIO INTERATIVO & GRADE DIÁRIA (ORGANIZADO POR DIA, MÊS E ANO) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- CALENDÁRIO VISUAL MENSAL (LADO ESQUERDO / 7 COLUNAS) -->
        <div class="lg:col-span-7 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <!-- CABEÇALHO DO MÊS / ANO & NAVEGAÇÃO -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm font-bold">
                <i class="fa-regular fa-calendar-days"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white" id="calendarMonthTitle">Carregando mês...</h3>
                <p class="text-[10px] text-slate-400">Clique em qualquer data para abrir a grade horária</p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="calNavigateMonth(-1)" class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition" title="Mês anterior">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <button onclick="calGoToToday()" class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
                Hoje
              </button>
              <button onclick="calNavigateMonth(1)" class="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition" title="Próximo mês">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>

          <!-- DIAS DA SEMANA -->
          <div class="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 dark:text-slate-500 py-1 uppercase tracking-wider">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          <!-- GRADE DE DIAS DO MÊS -->
          <div id="calendarGrid" class="grid grid-cols-7 gap-1.5 text-xs">
            <!-- Células geradas via JS -->
          </div>
        </div>

        <!-- GRADE DO DIA SELECIONADO (LADO DIREITO / 5 COLUNAS) -->
        <div class="lg:col-span-5 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col">
          <div class="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white" id="dailyScheduleTitle">Selecione uma data</h3>
          </div>

          <!-- LISTA DE HORÁRIOS & ATENDIMENTOS DO DIA -->
          <div id="dailyScheduleList" class="flex-1 overflow-y-auto custom-scroll space-y-2.5 max-h-[460px] pr-1">
            <div class="p-8 text-center text-slate-400 text-xs">Carregando horários...</div>
          </div>
        </div>

      </div>

      <!-- TABELA DETALHADA DE AGENDAMENTOS COM FILTROS -->
      <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        
        <!-- CABEÇALHO DA TABELA & FILTROS -->
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <div>
            <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Histórico Geral de Consultas</h3>
            <p class="text-[10px] text-slate-400">Consulte, filtre ou altere o status de qualquer paciente agendado</p>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <div class="relative w-full sm:w-64">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input type="text" id="appointmentSearchInput" oninput="filterAppointments()" placeholder="Buscar por paciente ou procedimento..."
                class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <select id="appointmentStatusFilter" onchange="filterAppointments()"
              class="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:outline-none">
              <option value="todos">Todos os Status</option>
              <option value="agendado">Apenas Agendados</option>
              <option value="confirmado">Confirmados</option>
              <option value="concluido">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>

        <!-- TABELA -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th class="py-3 px-4">Paciente</th>
                <th class="py-3 px-4">Procedimento</th>
                <th class="py-3 px-4">Data / Horário</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-center">Informações</th>
              </tr>
            </thead>
            <tbody id="appointmentTableBody" class="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              <tr>
                <td colspan="5" class="p-8 text-center text-slate-400">Carregando agendamentos...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </main>

  <!-- ======================================================================= -->
  <!-- VIEW 3: CONFIGURAÇÕES & TREINAMENTO DA IA (ODONTO & ESTÉTICA)           -->
  <!-- ======================================================================= -->
  <main id="viewConfig" class="flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 hidden bg-slate-50 dark:bg-[#0b0f17]">
    <div class="max-w-5xl mx-auto space-y-6">

      <!-- FORMULÁRIO COMPLETO DO QUESTIONÁRIO -->
      <form id="clinicConfigForm" onsubmit="event.preventDefault(); saveClinicConfig();" oninput="updateTrainingValidationHighlights()" onchange="updateTrainingValidationHighlights()" class="space-y-6">

        <!-- BANNER EXPLÍCITO DE STATUS DO TREINAMENTO & PENDÊNCIAS EM VERMELHO -->
        <div id="configCrucialStatusBanner" class="hidden rounded-2xl p-5 shadow-md transition-all"></div>

        <!-- AVISO DE FUNCIONAMENTO & CONDUTA PARA CAMPOS NÃO PREENCHIDOS -->
        <div class="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex items-start gap-3.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-[#008069] dark:text-emerald-400 flex items-center justify-center shrink-0 text-base">
              <i class="fa-solid fa-circle-info"></i>
            </div>
            <div class="flex-1 space-y-1">
              <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Como a IA utiliza estas informações
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Preenchimento Obrigatório</span>
              </h3>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                A Secretária IA utiliza <strong>todas as informações salvas nesta página</strong> para conduzir o atendimento no WhatsApp com precisão. <strong>Não é obrigatório preencher todos os campos</strong> para ela funcionar.
              </p>
            </div>
          </div>

          <div class="pt-3 border-t border-emerald-500/20 space-y-2">
            <span class="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Caso o paciente pergunte algo sobre um assunto ou procedimento que você deixou em branco, como a IA deve proceder?
            </span>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs">
              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 cursor-pointer hover:border-emerald-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="avaliacao" checked class="mt-0.5 text-[#008069] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-slate-900 dark:text-white block mb-0.5">🩺 Avaliação Presencial</span>
                  <span class="text-slate-500 dark:text-slate-400">Informa que essas dúvidas são tiradas exclusivamente na consulta presencial.</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 cursor-pointer hover:border-emerald-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="contato_secundario" class="mt-0.5 text-[#008069] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-slate-900 dark:text-white block mb-0.5">📞 Contato Secundário</span>
                  <span class="text-slate-500 dark:text-slate-400">Disponibiliza o WhatsApp secundário da clínica para falar direto com a equipe.</span>
                </div>
              </label>

              <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 cursor-pointer hover:border-emerald-500 transition">
                <input type="radio" name="unfilledFallbackRadio" value="aguardar_humano" class="mt-0.5 text-[#008069] focus:ring-0">
                <div class="text-[11px] leading-snug">
                  <span class="font-bold text-slate-900 dark:text-white block mb-0.5">⏳ Aguardar Atendente</span>
                  <span class="text-slate-500 dark:text-slate-400">Avisa com clareza que não pode responder no momento e pede para aguardar resposta humana no mesmo número.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- CARD 1: IDENTIDADE DA CLÍNICA & RESPONSÁVEL TÉCNICO -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Identidade da Clínica & Responsável Técnico</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Dados oficiais que geram autoridade e confiança imediata ao paciente.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label id="lblCfgClinicName" class="block font-semibold mb-1 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Nome Oficial da Clínica</span>
                <span id="badgeCfgClinicName" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400">* Obrigatório</span>
              </label>
              <input type="text" id="cfgClinicName" placeholder="Ex: Clínica Sorriso & Estética Integrada" required
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] transition">
              <p id="errCfgClinicName" class="hidden text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1"></p>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Doutor(a) Responsável Técnico</label>
              <input type="text" id="cfgDoctorName" placeholder="Ex: Dra. Fernanda Alves"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Registro Profissional (CRO / CRM)</label>
              <input type="text" id="cfgDoctorCro" placeholder="Ex: CRO-SP 102.450 / Harmonização Orofacial"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tom de Voz da Secretária IA</label>
              <select id="cfgTone" 
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] font-medium">
                <option value="acolhedor">🌸 Acolhedor & Gentil (Caloroso, empático, ideal para clínica geral)</option>
                <option value="sofisticado">✨ Sofisticado & Exclusivo (Boutique, foco em estética de alto padrão)</option>
                <option value="clinico">🩺 Clínico & Técnico (Objetivo, seguro, rigor científico e formal)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- CARD 2: CATÁLOGO DE PROCEDIMENTOS (ODONTO + ESTÉTICA) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Procedimentos, Duração & Observações</h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Ative os procedimentos oferecidos, defina o tempo médio e regras clínicas para a IA informar aos pacientes com precisão.</p>
              </div>
            </div>
          </div>

          <!-- CARD EXCLUSIVO: AVALIAÇÃO INICIAL / CONSULTA -->
          <div id="cardInitEvalContainer" class="p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-emerald-500/20">
                  <i class="fa-solid fa-stethoscope"></i>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Avaliação Inicial / Consulta Médica</h4>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Card exclusivo para triagem e conversão de novos pacientes em Odontologia ou Estética.</p>
                </div>
              </div>
              <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                ⭐ Principal Porta de Entrada
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label id="lblCfgInitEvalDuration" class="block font-semibold text-[11px] mb-1 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Tempo de Duração da Avaliação Inicial</span>
                  <span id="badgeCfgInitEvalDuration" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400">* Obrigatório</span>
                </label>
                <input type="text" id="cfgInitEvalDuration" placeholder="Ex: 30 min"
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#008069] transition">
                <p id="errCfgInitEvalDuration" class="hidden text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1"></p>
              </div>
              <div>
                <label class="block font-semibold text-[11px] mb-1 text-slate-700 dark:text-slate-300">
                  Preço da Consulta (se for paga)
                  <span class="text-[10px] text-amber-600 dark:text-amber-400 font-normal ml-1">*(Deixe vazio se for gratuita)*</span>
                </label>
                <input type="text" id="cfgInitEvalPrice" placeholder="Ex: R$ 150,00 ou Deixe vazio se gratuita"
                  class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
              </div>
            </div>

            <div>
              <label class="block font-semibold text-[11px] mb-1 text-slate-700 dark:text-slate-300">Como funciona essa Avaliação Inicial / Consulta?</label>
              <textarea id="cfgInitEvalDetails" rows="3" placeholder="Ex: Realizamos exame clínico completo, fotografias digitais intraorais em alta resolução, avaliação do histórico de saúde bucal e apresentação de plano de tratamento personalizado sem compromisso."
                class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#008069] leading-relaxed resize-none"></textarea>
            </div>
          </div>

          <!-- ALERTA EM VERMELHO DE PROCEDIMENTOS SEM NOME/DURAÇÃO -->
          <div id="proceduresCrucialAlert" class="hidden p-3.5 rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"></div>

          <!-- SEÇÃO 1: ODONTOLOGIA -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <i class="fa-solid fa-tooth"></i> Procedimentos Odontológicos
              </span>
              <button type="button" onclick="addNewProcedureRow('odonto')" 
                class="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition border border-emerald-200 dark:border-emerald-800/60">
                <i class="fa-solid fa-plus text-[10px]"></i>
                <span>Adicionar Linha em Odonto</span>
              </button>
            </div>
            
            <!-- LISTA VERTICAL DE ODONTO -->
            <div id="odontoList" class="space-y-2">
              <!-- Linhas geradas dinamicamente via JS -->
            </div>
          </div>

          <!-- SEÇÃO 2: ESTÉTICA OROFACIAL & CORPORAL -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Procedimentos de Estética & Harmonização
              </span>
              <button type="button" onclick="addNewProcedureRow('estetica')" 
                class="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 transition border border-purple-200 dark:border-purple-800/60">
                <i class="fa-solid fa-plus text-[10px]"></i>
                <span>Adicionar Linha em Estética</span>
              </button>
            </div>

            <!-- LISTA VERTICAL DE ESTÉTICA -->
            <div id="esteticaList" class="space-y-2">
              <!-- Linhas geradas dinamicamente via JS -->
            </div>
          </div>
        </div>

        <!-- CARD 3: ESTRATÉGIA COMERCIAL DE PREÇOS & AVALIAÇÃO -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Conduta sobre Preços & Avaliação</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Como a IA deve responder quando o paciente pergunta: "Quanto custa?"</p>
            </div>
          </div>

          <div class="space-y-2.5 text-xs">
            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="avaliacao" checked class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">🔒 Apenas Avaliação Presencial (Padrão Ouro Recomendado)</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA nunca dá preços no WhatsApp. Explica com elegância que cada anatomia é única e induz o agendamento da consulta.</span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="a_partir_de" class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">📊 Informar Faixa Inicial ("A partir de R$...")</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA passa um valor base de referência mas reforça que a consulta presencial é indispensável para o plano definitivo.</span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="tabela_fixa" class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">🏷️ Tabela Fixa Aberta</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA informa diretamente os valores praticados para quem perguntar e já oferece horários para fechar.</span>
              </div>
            </label>
          </div>

          <div class="pt-2">
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300 text-xs">
              A Consulta de Avaliação Inicial é Paga ou Gratuita? (Regras de Cobrança da Consulta)
            </label>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              Explique aqui se a clínica cobra pela primeira consulta de avaliação e se esse valor é abatido no tratamento. Assim, a IA responde com precisão quando o paciente perguntar sobre custos da consulta.
            </p>
            <textarea id="cfgPricesNote" rows="4" placeholder="Ex: A primeira avaliação é gratuita e sem compromisso.&#10;Ex: A consulta de avaliação custa R$ 150 com raio-X incluso, mas esse valor é 100% deduzido caso o tratamento seja iniciado."
              class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
          </div>
        </div>

        <!-- CARD 4: FORMAS DE PAGAMENTO, PARCELAMENTO & CONVÊNIOS (12 LINHAS) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Formas de Pagamento & Convênios</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Condições comerciais e facilidades que aumentam a taxa de fechamento de tratamentos.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Condições de Pagamento & Parcelamento</label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Descontos no Pix/à vista, parcelas no cartão, boleto ou financiamento.</p>
              <textarea id="cfgPaymentMethods" rows="12" placeholder="Ex:&#10;- Pix ou Dinheiro: 10% de desconto à vista.&#10;- Cartão de Crédito: Em até 12x sem juros (parcela mínima de R$ 150).&#10;- Financiamento odontológico/estético: Em até 24x com aprovação imediata no consultório.&#10;- Aceitamos cartões de débito e crédito de todas as bandeiras."
                class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed font-mono text-[11px]"></textarea>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Política de Convênios & Reembolso</label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Particular exclusivo com recibo para reembolso ou convênios atendidos.</p>
              <textarea id="cfgInsurance" rows="12" placeholder="Ex:&#10;- Atendimento Particular Exclusivo.&#10;- Emitimos nota fiscal detalhada, prontuário e relatório técnico para o paciente solicitar reembolso integral ou parcial no seu plano de saúde/odontológico (como Bradesco, Amil, SulAmérica, Porto Seguro).&#10;- Nossa equipe auxilia no processo de pedido de reembolso caso o paciente precise."
                class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed font-mono text-[11px]"></textarea>
            </div>
          </div>
        </div>

        <!-- CARD 5: HORÁRIOS, LOCALIZAÇÃO & ESTACIONAMENTO (6 LINHAS) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              5
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Horários, Endereço & Estacionamento</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Informações precisas para que o paciente chegue sem dúvidas à clínica.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label id="lblCfgHours" class="block font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Horários e Dias de Atendimento</span>
                  <span id="badgeCfgHours" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400">* Obrigatório</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  <input type="checkbox" id="cfgHolidayService" class="rounded text-[#008069] focus:ring-0">
                  <span>Atende em Feriados</span>
                </label>
              </div>
              <textarea id="cfgHours" rows="6" placeholder="Ex:&#10;Segunda a Sexta: das 08:00 às 19:30&#10;Sábados: das 08:00 às 13:00&#10;Domingos: Fechado"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed transition"></textarea>
              <p id="errCfgHours" class="hidden text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1"></p>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tolerância para Atrasos & Políticas de Comparecimento</label>
              <textarea id="cfgDelayTolerance" rows="6" placeholder="Ex:&#10;- Tolerância máxima de 15 minutos para pontualidade de todos os atendimentos.&#10;- Pedimos aviso prévio de 24 horas em caso de reagendamento para liberar a grade para outros pacientes."
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Endereço Completo & Pontos de Referência</label>
              <textarea id="cfgAddress" rows="6" placeholder="Ex:&#10;Av. Paulista, 1800 - Conjunto 124, 12º Andar&#10;Bela Vista - São Paulo/SP&#10;Ponto de referência: Em frente ao metrô Trianon-Masp"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Estacionamento, Valet & Logística de Chegada</label>
              <textarea id="cfgParking" rows="6" placeholder="Ex:&#10;- Estacionamento conveniado no subsolo do edifício com manobrista (cortesia para pacientes na primeira hora).&#10;- Acesso com rampa e elevadores para cadeirantes."
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
            </div>
          </div>
        </div>

        <!-- CARD 6: REGRAS DE OURO CLÍNICAS & SEGURANÇA JURÍDICA (ESPAÇO AMPLO) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              6
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Regras de Ouro Clínicas & Segurança Jurídica</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Proteção contra processos, erros médicos e proibições éticas expressas.</p>
            </div>
          </div>

          <div class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Regras Clínicas Especiais, Contraindicações & Prioridades</label>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Orientações de biossegurança que a IA deve respeitar rigidamente antes de agendar qualquer tratamento.</p>
              <textarea id="cfgClinicalRules" rows="8" placeholder="Ex:&#10;- Gestantes e lactantes não podem realizar toxina botulínica, preenchedores ou procedimentos invasivos.&#10;- Pacientes com dor de dente aguda, inchaço visível ou trauma têm prioridade absoluta de encaixe no mesmo dia.&#10;- Proibido prescrever analgésicos, anti-inflamatórios ou antibióticos pelo chat.&#10;- Pacientes menores de 18 anos precisam de acompanhante legal."
                class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">WhatsApp de Transbordo Humano / Urgências</label>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Telefone para onde a IA direciona casos graves ou quando o paciente solicita a recepção.</p>
                <textarea id="cfgEmergencyContact" rows="5" placeholder="Ex:&#10;WhatsApp de Urgência: (11) 98888-0000 (Dra. Fernanda)&#10;Telefone Fixo da Recepção: (11) 3333-2222&#10;Horário de plantão telefônico: 24h para pós-operatório."
                  class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
              </div>
              <div>
                <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Diferenciais Tecnológicos & Estrutura da Clínica</label>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Equipamentos e comodidades que a IA pode citar para encantar e converter o paciente.</p>
                <textarea id="cfgExtra" rows="5" placeholder="Ex:&#10;- Escaneamento 3D intraoral sem moldeira de massa.&#10;- Anestesia computadorizada sem dor.&#10;- Ambiente climatizado com aromaterapia e lounge café premium.&#10;- Sedação consciente com óxido nitroso disponível para pacientes ansiosos."
                  class="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD 7: ENCAMINHAMENTO DE CONTATO PÓS-AGENDAMENTO -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              7
            </div>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Encaminhamento de Contato Pós-Agendamento</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Fluxo de transição e envio de dados para continuidade do atendimento.</p>
            </div>
          </div>

          <label class="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
            <input type="checkbox" id="cfgSendSecondaryContact" class="mt-0.5 rounded text-[#008069] focus:ring-0 w-4 h-4 cursor-pointer">
            <div class="text-xs space-y-1">
              <span class="font-bold text-slate-900 dark:text-white block">
                Ao concluir cada agendamento/avaliação, a IA deve encaminhar o número de telefone secundário da clínica?
              </span>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Se marcado, assim que o paciente informar nome e procedimento preferido, a IA confirma o registro e envia uma mensagem com os dados de contato secundário da recepção/plantão para que o paciente salve e possa continuar por lá se preferir.
              </p>
            </div>
          </label>
        </div>

        <!-- BARRA FINAL DE SALVAR (NO RODAPÉ) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 pb-12 border-t border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">As alterações entram em vigor instantaneamente para todas as próximas mensagens.</span>
          </div>
          <div class="flex items-center gap-3">
            <button type="submit" id="btnSaveConfig" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#008069] to-emerald-600 hover:from-[#006a57] hover:to-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition">
              <i class="fa-solid fa-floppy-disk"></i>
              <span id="btnSaveConfigText">Salvar Alterações na IA</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  </main>

  <!-- ======================================================================= -->
  <!-- MODAL: NOVO AGENDAMENTO DE CONSULTA                                     -->
  <!-- ======================================================================= -->
  <div id="appointmentModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-900 dark:text-white">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2">
          <i class="fa-solid fa-calendar-plus text-emerald-500"></i>
          <span>Registrar Agendamento de Consulta</span>
        </h3>
        <button onclick="closeAppointmentModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form onsubmit="handleSaveAppointment(event)" class="space-y-3 pt-4 text-xs">
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nome do Paciente</label>
          <input type="text" id="appPatientName" required placeholder="Ex: Mariana Silveira"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">WhatsApp</label>
          <input type="text" id="appPatientPhone" required placeholder="Ex: 5511988881234"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Procedimento / Serviço</label>
          <select id="appProcedure" required onchange="onAppointmentTimeOrProcChange()"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
            <!-- Preenchido dinamicamente com base nos serviços cadastrados -->
          </select>
        </div>

        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Data & Horário de Início (Formato 24h)</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <!-- SELETOR DE DATA INTERATIVO -->
            <div onclick="const el = document.getElementById('appDate'); if (el.showPicker) { el.showPicker(); } else { el.focus(); }" 
              class="group p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1e293b] hover:border-[#008069] dark:hover:border-[#008069] transition cursor-pointer flex flex-col justify-between gap-1 shadow-sm select-none">
              <div class="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#008069] transition">
                <span class="flex items-center gap-1.5">
                  <i class="fa-regular fa-calendar-days text-[#008069]"></i>
                  <span>Data da Consulta</span>
                </span>
                <span class="text-[9px] text-slate-400 font-normal">dd/mm/aaaa</span>
              </div>
              <input type="date" id="appDate" required onchange="onAppointmentTimeOrProcChange()" onclick="event.stopPropagation(); if (this.showPicker) this.showPicker();"
                class="w-full bg-transparent text-slate-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer">
            </div>

            <!-- SELETOR DE HORA (24H) E MINUTOS (10 EM 10 MINUTOS) -->
            <div class="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#1e293b] flex flex-col justify-between gap-1 shadow-sm">
              <div class="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span class="flex items-center gap-1.5">
                  <i class="fa-regular fa-clock text-[#008069]"></i>
                  <span>Horário Início</span>
                </span>
                <span class="text-[9px] text-slate-400 font-normal">Hora : Minutos</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <select id="appHourSelect" onchange="onAppointmentTimeOrProcChange()"
                  class="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-[#008069]">
                  <!-- Preenchido com 00 a 23 via JS -->
                </select>
                <select id="appMinuteSelect" onchange="onAppointmentTimeOrProcChange()"
                  class="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-[#008069]">
                  <option value="00">00 min</option>
                  <option value="10">10 min</option>
                  <option value="20">20 min</option>
                  <option value="30">30 min</option>
                  <option value="40">40 min</option>
                  <option value="50">50 min</option>
                </select>
              </div>
            </div>
          </div>

          <!-- FEEDBACK DE CONSUMO DE TEMPO & VERIFICAÇÃO DE CONFLITO EM TEMPO REAL -->
          <div id="appTimeSlotFeedback" class="mt-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 text-[11px] transition-all">
            <!-- Preenchido dinamicamente por onAppointmentTimeOrProcChange() -->
          </div>
        </div>

        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Status</label>
          <select id="appStatus" class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none">
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Observações Clínicas / Preferências</label>
          <textarea id="appNotes" rows="4" placeholder="Ex: Paciente tem preferência por horário matutino, histórico de sensibilidade, regras específicas..."
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069] leading-relaxed resize-none"></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeAppointmentModal()" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">Cancelar</button>
          <button type="submit" id="btnSaveAppointmentModal" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold shadow-sm transition">Salvar Agendamento</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ======================================================================= -->
  <!-- MODAL 3: DETALHES COMPLETOS & EDIÇÃO DO AGENDAMENTO (VER MAIS / EDITAR) -->
  <!-- ======================================================================= -->
  <div id="appointmentDetailsModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2">
          <i class="fa-solid fa-notes-medical text-emerald-500"></i>
          <span>Informações do Atendimento</span>
        </h3>
        <button onclick="closeAppointmentDetailsModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <input type="hidden" id="detAppId">

      <!-- CARDS DE INFORMAÇÕES RESUMIDAS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Paciente</span>
          <div class="font-bold text-sm text-slate-900 dark:text-white truncate" id="detPatientName">-</div>
          <div class="flex items-center justify-between pt-1">
            <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400" id="detPatientPhone">-</span>
            <button id="detBtnOpenChat" type="button" onclick="handleDetailOpenChat()" class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
              <i class="fa-brands fa-whatsapp"></i> Conversar
            </button>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Procedimento & Duração</span>
          <div class="font-bold text-sm text-slate-900 dark:text-white truncate" id="detProcedure">-</div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-1">
            <i class="fa-regular fa-clock text-emerald-500"></i>
            <span id="detDuration">-</span>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1 sm:col-span-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Data & Horário Agendado</span>
            <span id="detConfirmationBadge" class="text-[10px] font-bold"></span>
          </div>
          <div class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <i class="fa-regular fa-calendar-check text-[#008069]"></i>
            <span id="detScheduledAt">-</span>
          </div>
        </div>
      </div>

      <!-- CAMPOS EDITÁVEIS: STATUS & OBSERVAÇÕES AMPLAS (6 LINHAS) -->
      <div class="space-y-3 pt-1 text-xs">
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Alterar Status da Consulta</label>
          <select id="detStatus" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#008069]">
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Observações Clínicas, Histórico & Anotações
            <span class="text-[10px] text-slate-400 font-normal ml-1">(Espaço amplo para anotações detalhadas)</span>
          </label>
          <textarea id="detNotes" rows="6" placeholder="Registre aqui todas as observações do atendimento, sintomas relatados, preferências de horário, materiais necessários..."
            class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-[#008069]"></textarea>
        </div>
      </div>

      <!-- RODAPÉ DE AÇÕES -->
      <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onclick="handleDeleteDetailAppointment()" class="px-3 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition flex items-center gap-1.5">
          <i class="fa-regular fa-trash-can"></i>
          <span>Excluir</span>
        </button>
        <div class="flex items-center gap-2">
          <button type="button" onclick="closeAppointmentDetailsModal()" class="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition">Fechar</button>
          <button type="button" onclick="handleSaveAppointmentDetails()" id="btnSaveAppointmentDetails" class="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- TOAST DE NOTIFICAÇÃO FLUTUANTE -->
  <div id="toastNotification" class="fixed bottom-6 right-6 z-50 transform translate-y-20 opacity-0 transition-all duration-300 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold">
    <i id="toastIcon" class="fa-solid fa-circle-check text-emerald-400"></i>
    <span id="toastMsg">Alterações salvas com sucesso!</span>
  </div>

  <!-- JAVASCRIPT GLOBAL DA PLATAFORMA -->
  <script>
    // ESTADO GLOBAL
    let conversations = [];
    let activePhone = null;
    let activeAiPaused = false;
    let appointments = [];
    let currentConfig = null;

    // Otimização de polling
    let highestKnownMsgId = 0;
    let highestActiveMsgId = 0;
    let isPollingBusy = false;
    let pollingInterval = null;

    // PROCEDIMENTOS PRÉ-CONFIGURADOS (ODONTO & ESTÉTICA)
    const DEFAULT_ODONTO_SERVICES = [
      { name: "Limpeza & Profilaxia", duration: "30 min", note: "Remoção de tártaro e jato de bicarbonato" },
      { name: "Clareamento Dental a Laser", duration: "45 min", note: "Resultados nítidos na primeira sessão" },
      { name: "Clareamento Caseiro com Moldeira", duration: "30 min", note: "Moldeira personalizada para uso noturno" },
      { name: "Alinhadores Invisíveis / Ortodontia", duration: "45 min", note: "Escaneamento 3D inicial e planejamento digital" },
      { name: "Aparelho Fixo Estético / Metálico", duration: "45 min", note: "Manutenção mensal" },
      { name: "Lentes de Resina / Facetas", duration: "2h", note: "Transformação estética sem desgaste dental" },
      { name: "Lentes de Contato de Porcelana", duration: "1h30", note: "Lentes ultrafinas de alta durabilidade" },
      { name: "Implantes Dentários & Próteses", duration: "1h", note: "Cirurgia guiada com anestesia sem dor" },
      { name: "Tratamento de Canal (Endodontia)", duration: "1h", note: "Tecnologia mecanizada em sessão única" },
      { name: "Extração do Siso", duration: "45 min", note: "Avaliação radiográfica prévia obrigatória" },
      { name: "Restaurações Estéticas", duration: "40 min", note: "Resinas com a cor exata do dente" },
      { name: "Tratamento de Gengiva (Periodontia)", duration: "45 min", note: "Controle de sangramentos e inflamações" }
    ];

    const DEFAULT_ESTETICA_SERVICES = [
      { name: "Toxina Botulínica (Botox Facial)", duration: "30 min", note: "Prevenção e suavização de rugas dinâmicas" },
      { name: "Preenchimento Labial com Ácido Hialurônico", duration: "45 min", note: "Definição, contorno e volume natural" },
      { name: "Preenchimento de Malar / Olheiras", duration: "45 min", note: "Efeito lifting e rejuvenescimento do olhar" },
      { name: "Bioestimulador de Colágeno (Sculptra / Radiesse)", duration: "45 min", note: "Firmeza progressiva e combate à flacidez" },
      { name: "Fios de PDO de Sustentação", duration: "1h", note: "Tração tecidual imediata e estímulo de colágeno" },
      { name: "Fios de PDO de Estímulo de Colágeno", duration: "40 min", note: "Melhora da textura e linhas finas" },
      { name: "Lipoaspiração Enzimática de Papada", duration: "30 min", note: "Redução de gordura localizada submentoniana" },
      { name: "Rinomodelação sem Cirurgia", duration: "45 min", note: "Harmonização do dorso e ponta nasal" },
      { name: "Skinbooster / Hidratação Injetável", duration: "30 min", note: "Luminosidade e hidratação profunda da pele" },
      { name: "Microagulhamento com Drug Delivery", duration: "45 min", note: "Tratamento de manchas, poros e cicatrizes" },
      { name: "Peeling Químico Renovador", duration: "30 min", note: "Renovação celular e uniformização do tom" },
      { name: "Drenagem Linfática Facial Pós-Procedimento", duration: "40 min", note: "Redução de edema e recuperação acelerada" }
    ];

    // 1. TEMA (DARK / LIGHT)
    function initTheme() {
      const savedTheme = localStorage.getItem('aura_theme');
      if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-sun';
      } else {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-moon';
      }
    }

    function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('aura_theme', isDark ? 'dark' : 'light');
      document.getElementById('themeIcon').className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

    // 2. SELETOR DE MÓDULOS (MENU VERTICAL)
    function toggleVerticalMenu(e) {
      if (e) e.stopPropagation();
      const dropdown = document.getElementById('verticalMenuDropdown');
      const chevron = document.getElementById('verticalMenuChevron');
      const isClosed = dropdown.classList.contains('hidden');

      if (isClosed) {
        dropdown.classList.remove('hidden');
        chevron.classList.add('rotate-180');
      } else {
        dropdown.classList.add('hidden');
        chevron.classList.remove('rotate-180');
      }
    }

    function closeVerticalMenu() {
      const dropdown = document.getElementById('verticalMenuDropdown');
      const chevron = document.getElementById('verticalMenuChevron');
      if (dropdown) dropdown.classList.add('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
    }

    document.addEventListener('click', (e) => {
      const container = document.getElementById('verticalMenuContainer');
      if (container && !container.contains(e.target)) {
        closeVerticalMenu();
      }
    });

    function selectNavigationTab(tabId, labelText, iconClass, colorTheme) {
      closeVerticalMenu();

      // Atualiza botão seletor superior
      const label = document.getElementById('selectedMenuLabel');
      const iconContainer = document.getElementById('selectedMenuIcon');
      if (label) label.innerText = labelText;
      if (iconContainer) {
        iconContainer.innerHTML = \`<i class="\${iconClass}"></i>\`;
        if (colorTheme === 'sky') {
          iconContainer.className = "w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs";
        } else if (colorTheme === 'purple') {
          iconContainer.className = "w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs";
        } else {
          iconContainer.className = "w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs";
        }
      }

      // Alterna Views
      const viewChat = document.getElementById('viewChat');
      const viewAgenda = document.getElementById('viewAgenda');
      const viewConfig = document.getElementById('viewConfig');

      viewChat.classList.add('hidden');
      viewAgenda.classList.add('hidden');
      viewConfig.classList.add('hidden');

      if (tabId === 'agenda') {
        viewAgenda.classList.remove('hidden');
        loadAppointments();
      } else if (tabId === 'config') {
        viewConfig.classList.remove('hidden');
        loadClinicConfig().then(() => updateTrainingValidationHighlights());
      } else {
        viewChat.classList.remove('hidden');
      }
    }

    // 3. INICIALIZAÇÃO GERAL
    async function loadCurrentUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.status === 401) {
          window.location.href = '/login';
          return false;
        }
        const data = await res.json();
        if (data && data.user) {
          const nameEl = document.getElementById('topUserName');
          const emailEl = document.getElementById('topUserEmail');
          if (nameEl) nameEl.innerText = data.user.name || 'Recepção';
          if (emailEl) emailEl.innerText = data.user.email || '';
        }
        return true;
      } catch (err) {
        console.error("Erro ao carregar usuário logado:", err);
        return true;
      }
    }

    async function init() {
      initTheme();
      const ok = await loadCurrentUser();
      if (!ok) return;
      startLiveBrasiliaSync();
      await loadConversations(false);
      await loadAppointments();
      await loadClinicConfig();
      updateCrucialTrainingLockUI();
      startPolling();
    }

    // 4. ATENDIMENTO WHATSAPP MULTI-CHAT
    async function loadConversations(isAutoRefresh = false) {
      try {
        const res = await fetch('/api/conversations');
        const data = await res.json();
        if (data.server_time) syncServerTime(data.server_time);
        conversations = data.conversations || [];

        const countSpan = document.getElementById('chatCount');
        if (countSpan) countSpan.innerText = \`\${conversations.length} conversas ativas\`;

        renderConversationList();

        if (activePhone) {
          const current = conversations.find(c => c.contact_wa_id === activePhone);
          if (current && typeof current.ai_paused !== 'undefined') {
            activeAiPaused = current.ai_paused === 1;
            updateAiStatusUI();
          }
        }

        if (!activePhone && conversations.length > 0 && !isAutoRefresh) {
          selectChat(conversations[0].contact_wa_id);
        }
      } catch (err) {
        console.error("Erro ao carregar conversas:", err);
        const container = document.getElementById('conversationList');
        if (container && conversations.length === 0) {
          container.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">Erro ao sincronizar pacientes. Tentando reconectar...</div>';
        }
      }
    }

    function renderConversationList() {
      const container = document.getElementById('conversationList');
      const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

      const filtered = conversations.filter(c => 
        (c.contact_name || '').toLowerCase().includes(search) || 
        (c.contact_wa_id || '').includes(search) ||
        (c.last_body || '').toLowerCase().includes(search)
      );

      if (filtered.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">Nenhum paciente encontrado.</div>';
        return;
      }

      const trainingComplete = isCrucialTrainingComplete();

      container.innerHTML = filtered.map(c => {
        const isSelected = c.contact_wa_id === activePhone;
        const initial = (c.contact_name || c.contact_wa_id)[0].toUpperCase();
        const timeStr = formatConversationItemTime(c.last_created_at);
        const isAiOn = trainingComplete && c.ai_paused === 0;
        const statusDotClass = !trainingComplete ? 'bg-rose-500' : (isAiOn ? 'bg-emerald-500' : 'bg-amber-500');
        const statusBadgeClass = !trainingComplete
          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
          : (isAiOn
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40');
        const statusBadgeText = !trainingComplete ? 'IA Desligada' : (isAiOn ? 'IA Ativa' : 'IA Pausada');

        return \`
          <div onclick="selectChat('\${c.contact_wa_id}')" 
            class="p-3.5 flex items-center gap-3 cursor-pointer transition select-none \${
              isSelected 
                ? 'bg-slate-100 dark:bg-slate-800/90 border-l-4 border-[#008069]' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm uppercase">
                \${initial}
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#111827] \${statusDotClass}"></span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate">\${c.contact_name || c.contact_wa_id}</h4>
                <span class="text-[10px] text-slate-400 font-medium">\${timeStr}</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                \${c.last_direction === 'out' ? '<span class="text-slate-400">Você: </span>' : ''}\${c.last_body || 'Sem mensagens'}
              </p>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded \${statusBadgeClass}">
                  \${statusBadgeText}
                </span>
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function selectChat(phone) {
      if (activePhone === phone && highestActiveMsgId > 0) return;
      activePhone = phone;
      highestActiveMsgId = 0;

      const target = conversations.find(c => c.contact_wa_id === phone);
      const name = target?.contact_name || phone;
      const initial = name[0].toUpperCase();

      document.getElementById('activeContactName').innerText = name;
      document.getElementById('activeContactPhone').innerText = phone;
      document.getElementById('activeAvatar').innerText = initial;

      document.getElementById('sideContactName').innerText = name;
      document.getElementById('sideContactPhone').innerText = phone;
      document.getElementById('sideAvatar').innerText = initial;

      // Habilita controles
      document.getElementById('messageInput').disabled = false;
      document.getElementById('messageInput').placeholder = "Escreva sua mensagem";
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('btnScheduleThisPatient').disabled = !isCrucialTrainingComplete();
      document.getElementById('btnClearChat').disabled = false;

      // Atualiza imediatamente o status da IA para o contato selecionado
      activeAiPaused = target ? target.ai_paused === 1 : false;
      updateAiStatusUI();

      renderConversationList();

      document.getElementById('messagesArea').innerHTML = \`
        <div class="h-full flex items-center justify-center text-slate-400 text-xs">
          <i class="fa-solid fa-circle-notch fa-spin text-sm mr-2"></i> Abrindo conversa...
        </div>
      \`;

      await loadActiveMessages();
    }

    async function loadActiveMessages() {
      if (!activePhone) return;
      try {
        const res = await fetch(\`/api/messages?phone=\${encodeURIComponent(activePhone)}\`);
        const data = await res.json();
        if (data.server_time) syncServerTime(data.server_time);
        const msgs = data.messages || [];

        activeAiPaused = !!data.ai_paused;
        updateAiStatusUI();

        if (msgs.length > 0) {
          highestActiveMsgId = Math.max(...msgs.map(m => m.id));
        }

        renderMessages(msgs);
        detectProcedureFromChat(msgs);
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
      }
    }

    function renderMessages(msgs) {
      const area = document.getElementById('messagesArea');
      if (msgs.length === 0) {
        area.innerHTML = '<div class="h-full flex items-center justify-center text-slate-400 text-xs">Nenhuma mensagem nesta conversa ainda.</div>';
        return;
      }

      let lastDateKey = null;
      const htmlParts = [];

      msgs.forEach(m => {
        const d = parseIsoDate(m.created_at);
        const dateKey = d ? getBrasiliaDateKey(d) : 'sem_data';

        if (d && dateKey !== lastDateKey) {
          lastDateKey = dateKey;
          const dividerLabel = getWhatsAppDateDividerLabel(d);
          htmlParts.push(\`
            <div class="flex justify-center my-3.5 sticky top-1 z-10 select-none">
              <span class="px-3.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/95 dark:bg-[#182229]/95 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/70 dark:border-slate-700/60 backdrop-blur-md">
                \${escapeHtml(dividerLabel)}
              </span>
            </div>
          \`);
        }

        const isPatient = m.direction === 'in';
        const isHumanAgent = m.status === 'human';
        const timeStr = formatMessageTime(m.created_at);

        if (isPatient) {
          htmlParts.push(\`
            <div class="flex flex-col items-start max-w-[85%] md:max-w-[70%]">
              <div class="bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200/50 dark:border-slate-700/30 text-xs leading-relaxed">
                \${escapeHtml(m.body)}
                <div class="text-[9px] text-slate-400 dark:text-slate-400 text-right mt-1 font-mono">\${timeStr}</div>
              </div>
            </div>
          \`);
        } else {
          htmlParts.push(\`
            <div class="flex flex-col items-end max-w-[85%] md:max-w-[70%] ml-auto">
              <div class="\${
                isHumanAgent 
                  ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-200 dark:border-sky-800/60 text-sky-950 dark:text-sky-100' 
                  : 'bg-[#d9fdd3] dark:bg-[#005c4b] border-emerald-200 dark:border-emerald-700/40 text-slate-900 dark:text-white'
              } p-3 rounded-2xl rounded-tr-sm shadow-sm border text-xs leading-relaxed">
                <div class="text-[9px] font-bold uppercase tracking-wider mb-1 \${
                  isHumanAgent ? 'text-sky-600 dark:text-sky-300' : 'text-emerald-700 dark:text-emerald-300'
                }">
                  \${isHumanAgent ? 'Você' : 'Atendente IA'}
                </div>
                \${escapeHtml(m.body)}
                <div class="text-[9px] opacity-75 text-right mt-1 font-mono flex items-center justify-end gap-1">
                  <span>\${timeStr}</span>
                  <i class="fa-solid fa-check-double text-[9px] text-[#53bdeb]" title="Entregue e sincronizado"></i>
                </div>
              </div>
            </div>
          \`);
        }
      });

      area.innerHTML = htmlParts.join('');
      area.scrollTop = area.scrollHeight;
    }

    function updateAiStatusUI() {
      const badge = document.getElementById('activeAiBadge');
      const toggleBtn = document.getElementById('toggleAiBtn');
      const toggleText = document.getElementById('toggleAiText');
      const toggleIcon = document.getElementById('toggleAiIcon');
      const sideText = document.getElementById('sideAiStatusText');
      const sideBtn = document.getElementById('sideToggleAiBtn');

      badge.classList.remove('hidden');
      toggleBtn.classList.remove('hidden');

      if (!isCrucialTrainingComplete()) {
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60";
        badge.innerText = "IA Desligada (Treinamento Pendente)";

        toggleBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition shadow-sm";
        toggleIcon.className = "fa-solid fa-lock text-[10px]";
        toggleText.innerText = "Completar Treinamento";

        sideText.innerText = "IA Desligada (Pendências em vermelho)";
        sideText.className = "font-bold text-rose-600 dark:text-rose-400";
        sideBtn.classList.add('hidden');
        return;
      }

      sideBtn.classList.remove('hidden');

      if (activeAiPaused) {
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60";
        badge.innerText = "Atendimento Humano (IA Pausada)";

        toggleBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition shadow-sm";
        toggleIcon.className = "fa-solid fa-play text-[10px]";
        toggleText.innerText = "Reativar IA neste Chat";

        sideText.innerText = "IA Pausada (Você no controle)";
        sideText.className = "font-bold text-amber-600 dark:text-amber-400";
      } else {
        badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60";
        badge.innerText = "IA Respondendo 24h";

        toggleBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition shadow-sm";
        toggleIcon.className = "fa-solid fa-pause text-[10px]";
        toggleText.innerText = "Pausar IA (Assumir)";

        sideText.innerText = "IA Ativa e Respondendo";
        sideText.className = "font-bold text-emerald-600 dark:text-emerald-400";
      }
    }

    async function handleSendMessage(e) {
      e.preventDefault();
      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      if (!text || !activePhone) return;

      input.value = '';

      try {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, text })
        });
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao enviar mensagem");
        }
        if (data.warning) {
          showToast(data.warning, "amber");
        }

        activeAiPaused = true;
        const target = conversations.find(c => c.contact_wa_id === activePhone);
        if (target) target.ai_paused = 1;
        updateAiStatusUI();
        renderConversationList();

        await loadActiveMessages();
        await loadConversations(true);
      } catch (err) {
        alert("Erro ao enviar mensagem");
      }
    }

    async function handleToggleAi() {
      if (!activePhone) return;
      if (!isCrucialTrainingComplete()) {
        goToTrainingAndHighlightMissing();
        return;
      }
      const targetState = !activeAiPaused;

      try {
        const res = await fetch('/api/toggle-ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, paused: targetState })
        });
        const data = await res.json();

        activeAiPaused = targetState;
        const target = conversations.find(c => c.contact_wa_id === activePhone);
        if (target) target.ai_paused = targetState ? 1 : 0;
        updateAiStatusUI();
        renderConversationList();

        await loadConversations(true);
      } catch (err) {
        alert("Erro ao alterar status da IA");
      }
    }

    function detectProcedureFromChat(msgs) {
      const container = document.getElementById('sideProcedureDetected');
      const allText = msgs.map(m => m.body).join(' ').toLowerCase();

      const procedures = [
        "botox", "toxina botulínica", "preenchimento", "harmonização", "clareamento", 
        "aparelho", "invisalign", "implante", "lentes", "canal", "limpeza", "siso", "papada"
      ];

      const found = procedures.filter(p => allText.includes(p));
      if (found.length > 0) {
        container.innerHTML = found.map(p => 
          \`<span class="inline-block px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] mr-1 mb-1 capitalize border border-emerald-200 dark:border-emerald-800/40">\${p}</span>\`
        ).join('');
      } else {
        container.innerText = "Em análise pela conversa...";
      }
    }

    function openAppointmentModalForCurrentPatient() {
      if (!activePhone) return;
      const target = conversations.find(c => c.contact_wa_id === activePhone);
      const name = target?.contact_name || '';

      document.getElementById('appPatientName').value = name;
      document.getElementById('appPatientPhone').value = activePhone;
      openAppointmentModal("Avaliação Inicial / Consulta");
    }

    async function handleClearCurrentChat() {
      if (!activePhone) return;
      if (confirm("Tem certeza que deseja apagar o histórico de mensagens deste paciente?")) {
        try {
          await fetch('/api/clear-chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ phone: activePhone })
          });
          await loadActiveMessages();
          await loadConversations(true);
        } catch (err) {
          alert("Erro ao limpar histórico");
        }
      }
    }

    function filterChats() {
      renderConversationList();
    }

    // 5. GESTÃO DA AGENDA DE CONSULTAS & CALENDÁRIO INTERATIVO
    let calCurrentYear = new Date().getFullYear();
    let calCurrentMonth = new Date().getMonth();
    let calSelectedDate = new Date().toISOString().slice(0, 10);

    const MONTH_NAMES = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const WEEKDAY_NAMES = [
      "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
      "Quinta-feira", "Sexta-feira", "Sábado"
    ];

    async function loadAppointments() {
      const icon = document.getElementById('agendaRefreshIcon');
      if (icon) icon.classList.add('fa-spin');
      try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        appointments = data.appointments || [];
        updateAppointmentMetrics();
        renderAppointmentsTable();
        renderCalendar();

        const badge = document.getElementById('menuAppointmentsBadge');
        if (badge) badge.innerText = appointments.length;
      } catch (err) {
        console.error("Erro ao carregar agenda:", err);
      } finally {
        if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 400);
      }
    }

    function formatScheduleDateTime(dateStr) {
      if (!dateStr) return '-';
      const match = dateStr.match(/^(\\d{4})-(\\d{2})-(\\d{2})(?:[ T](\\d{2}):(\\d{2}))?/);
      if (match) {
        const [_, y, m, d, hh, mm] = match;
        const dateFormatted = d + '/' + m + '/' + y;
        if (hh && mm) {
          return dateFormatted + ' às ' + hh + ':' + mm;
        }
        return dateFormatted;
      }
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        const day = String(dt.getDate()).padStart(2, '0');
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const year = dt.getFullYear();
        const hours = String(dt.getHours()).padStart(2, '0');
        const minutes = String(dt.getMinutes()).padStart(2, '0');
        return day + '/' + month + '/' + year + ' às ' + hours + ':' + minutes;
      }
      return dateStr;
    }

    function populateProcedureSelect(selectedProc = '') {
      const select = document.getElementById('appProcedure');
      if (!select) return;

      let odontoList = [];
      let esteticaList = [];

      if (currentConfig && Array.isArray(currentConfig.procedure_items) && currentConfig.procedure_items.length > 0) {
        odontoList = currentConfig.procedure_items.filter(p => p.checked !== false && (p.category === 'odonto' || !p.category)).map(p => p.name);
        esteticaList = currentConfig.procedure_items.filter(p => p.checked !== false && p.category === 'estetica').map(p => p.name);
      } else {
        odontoList = DEFAULT_ODONTO_SERVICES.map(p => p.name);
        esteticaList = DEFAULT_ESTETICA_SERVICES.map(p => p.name);
      }

      let optionsHtml = '';
      optionsHtml += '<optgroup label="Consulta / Avaliação">';
      optionsHtml += '<option value="Avaliação Inicial / Consulta">Avaliação Inicial / Consulta</option>';
      optionsHtml += '</optgroup>';

      if (odontoList.length > 0) {
        optionsHtml += '<optgroup label="Procedimentos Odontológicos">';
        odontoList.forEach(name => {
          optionsHtml += '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
        });
        optionsHtml += '</optgroup>';
      }

      if (esteticaList.length > 0) {
        optionsHtml += '<optgroup label="Estética & Harmonização">';
        esteticaList.forEach(name => {
          optionsHtml += '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
        });
        optionsHtml += '</optgroup>';
      }

      select.innerHTML = optionsHtml;

      if (selectedProc) {
        const found = Array.from(select.options).some(o => o.value.toLowerCase() === selectedProc.toLowerCase());
        if (found) {
          select.value = selectedProc;
        } else {
          const opt = document.createElement('option');
          opt.value = selectedProc;
          opt.textContent = selectedProc;
          opt.selected = true;
          select.appendChild(opt);
        }
      }
    }

    function updateAppointmentMetrics() {
      // 1. Total cadastrados: número de conversas no chat (com fallback para total de agendamentos)
      const totalCadastrados = conversations.length > 0 ? conversations.length : appointments.length;
      const metricTotalEl = document.getElementById('metricTotal');
      if (metricTotalEl) metricTotalEl.innerText = totalCadastrados;

      // 2. Agendados: pessoas com procedimentos, consultas ou avaliações agendados com antecedência
      const agendados = appointments.filter(a => a.status === 'agendado' || a.status === 'pre_agendado').length;
      const metricAgendadosEl = document.getElementById('metricAgendados');
      if (metricAgendadosEl) metricAgendadosEl.innerText = agendados;

      // 3. Confirmados: somente quando houver confirmação
      const confirmed = appointments.filter(a => a.status === 'confirmado').length;
      const metricConfirmedEl = document.getElementById('metricConfirmed');
      if (metricConfirmedEl) metricConfirmedEl.innerText = confirmed;

      // 4. Concluídos: atendimentos finalizados
      const concluidos = appointments.filter(a => a.status === 'concluido').length;
      const metricConcluidosEl = document.getElementById('metricConcluidos');
      if (metricConcluidosEl) metricConcluidosEl.innerText = concluidos;
    }

    function calNavigateMonth(offset) {
      calCurrentMonth += offset;
      if (calCurrentMonth < 0) {
        calCurrentMonth = 11;
        calCurrentYear--;
      } else if (calCurrentMonth > 11) {
        calCurrentMonth = 0;
        calCurrentYear++;
      }
      renderCalendar();
    }

    function calGoToToday() {
      const today = new Date();
      calCurrentYear = today.getFullYear();
      calCurrentMonth = today.getMonth();
      calSelectedDate = today.toISOString().slice(0, 10);
      renderCalendar();
    }

    function calSelectDay(dateStr) {
      calSelectedDate = dateStr;
      renderCalendar();
      renderDailySchedule();
    }

    function openAppointmentModalForSelectedDay() {
      openAppointmentModal('', calSelectedDate, '09:00');
    }

    function renderCalendar() {
      const titleEl = document.getElementById('calendarMonthTitle');
      if (titleEl) {
        titleEl.innerText = \`\${MONTH_NAMES[calCurrentMonth]} de \${calCurrentYear}\`;
      }

      const gridEl = document.getElementById('calendarGrid');
      if (!gridEl) return;

      const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
      const totalDays = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
      const todayStr = new Date().toISOString().slice(0, 10);

      const cells = [];

      for (let i = 0; i < firstDayIndex; i++) {
        cells.push('<div class="p-1 min-h-[64px] rounded-xl bg-slate-50/40 dark:bg-slate-800/20 opacity-30 select-none"></div>');
      }

      for (let day = 1; day <= totalDays; day++) {
        const dayPadded = String(day).padStart(2, '0');
        const monthPadded = String(calCurrentMonth + 1).padStart(2, '0');
        const dateKey = \`\${calCurrentYear}-\${monthPadded}-\${dayPadded}\`;

        const isToday = dateKey === todayStr;
        const isSelected = dateKey === calSelectedDate;

        const dayAppointments = appointments.filter(a => {
          if (!a.scheduled_at) return false;
          return a.scheduled_at.startsWith(dateKey) || a.scheduled_at.includes(dateKey);
        });

        const hasConfirmed = dayAppointments.some(a => a.status === 'confirmado');
        const hasScheduled = dayAppointments.some(a => a.status === 'agendado' || a.status === 'pre_agendado');

        let borderClass = 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600';
        if (isSelected) {
          borderClass = 'border-sky-500 dark:border-sky-400 ring-2 ring-sky-500/30 bg-sky-50/50 dark:bg-sky-950/30';
        } else if (isToday) {
          borderClass = 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20';
        }

        let badgeHtml = '';
        if (dayAppointments.length > 0) {
          const count = dayAppointments.length;
          let color = 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300';
          if (hasConfirmed && !hasScheduled) {
            color = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300';
          }
          badgeHtml = \`
            <div class="mt-1 flex items-center justify-center">
              <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold \${color} truncate max-w-full">
                \${count} \${count === 1 ? 'consulta' : 'consultas'}
              </span>
            </div>
          \`;
        }

        cells.push(\`
          <div onclick="calSelectDay('\${dateKey}')" 
            class="p-1.5 sm:p-2 min-h-[64px] rounded-xl border \${borderClass} bg-white dark:bg-[#151d2e] cursor-pointer transition flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold \${isToday ? 'w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]' : isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'}">
                \${day}
              </span>
              \${isToday ? '<span class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hidden sm:inline">Hoje</span>' : ''}
            </div>
            \${badgeHtml}
          </div>
        \`);
      }

      gridEl.innerHTML = cells.join('');
      renderDailySchedule();
    }

    function renderDailySchedule() {
      const container = document.getElementById('dailyScheduleList');
      const titleEl = document.getElementById('dailyScheduleTitle');
      if (!container) return;

      const [y, m, d] = calSelectedDate.split('-').map(Number);
      const selectedDateObj = new Date(y, (m || 1) - 1, d || 1);
      const weekday = WEEKDAY_NAMES[selectedDateObj.getDay()] || '';
      const dateFormatted = weekday + ', ' + d + ' de ' + MONTH_NAMES[(m || 1) - 1] + ' de ' + y;

      if (titleEl) titleEl.innerText = dateFormatted;

      const dayAppointments = appointments.filter(a => {
        if (!a.scheduled_at) return false;
        return a.scheduled_at.startsWith(calSelectedDate) || a.scheduled_at.includes(calSelectedDate);
      });

      if (dayAppointments.length === 0) {
        container.innerHTML = 
          '<div class="p-8 text-center text-slate-400 space-y-2">' +
            '<div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-xl mx-auto">' +
              '<i class="fa-regular fa-calendar-check"></i>' +
            '</div>' +
            '<p class="text-xs font-medium">Nenhum agendamento neste dia.</p>' +
          '</div>';
        return;
      }

      container.innerHTML = dayAppointments.map(a => {
        const timePart = a.scheduled_at.includes(' ') ? a.scheduled_at.split(' ')[1] : a.scheduled_at;
        const isConfirmed = a.status === 'confirmado';
        const isDone = a.status === 'concluido';

        let statusBadge = '';
        if (isConfirmed) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800/60">Confirmado</span>';
        } else if (isDone) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-400 font-bold text-[10px] border border-sky-200 dark:border-sky-800/60">Concluído</span>';
        } else if (a.status === 'cancelado') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">Cancelado</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60">Agendado</span>';
        }

        const noteHtml = a.notes ? '<p class="text-[11px] text-slate-500 dark:text-slate-400 italic">“' + escapeHtml(a.notes) + '”</p>' : '';
        const conclBtn = (!isDone && a.status !== 'cancelado') ? '<button onclick="handleConcludeAppointment(' + a.id + ')" class="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[10px] font-bold transition">Concluir</button>' : '';

        return [
          '<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 hover:border-slate-300 dark:hover:border-slate-600 transition">',
            '<div class="flex items-start justify-between gap-2">',
              '<div class="flex items-center gap-2">',
                '<span class="px-2 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-black text-xs font-mono">' + escapeHtml(timePart) + '</span>',
                '<div>',
                  '<h4 class="font-bold text-xs text-slate-900 dark:text-white leading-tight">' + escapeHtml(a.patient_name) + '</h4>',
                  '<span class="text-[10px] text-slate-400 font-mono">' + escapeHtml(a.contact_wa_id) + '</span>',
                '</div>',
              '</div>',
              '<div>' + statusBadge + '</div>',
            '</div>',
            '<div class="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/40 text-slate-600 dark:text-slate-300">',
              '<div class="flex items-center gap-1.5 truncate">',
                '<i class="fa-solid fa-tooth text-slate-400 text-[10px]"></i>',
                '<span class="font-medium">' + escapeHtml(a.procedure || 'Consulta') + '</span>',
              '</div>',
            '</div>',
            noteHtml,
            '<div class="flex items-center justify-end gap-1.5 pt-1">',
              '<button type="button" onclick="openAppointmentDetailsModal(' + a.id + ')" class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition flex items-center gap-1" title="Ver mais informações e editar">',
                '<i class="fa-solid fa-file-lines text-[#008069] dark:text-emerald-400"></i>',
                '<span>Ver mais</span>',
              '</button>',
              '<button onclick="goToChatWithPatient(&quot;' + escapeHtml(a.contact_wa_id) + '&quot;)" class="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-bold transition flex items-center gap-1" title="Abrir conversa no WhatsApp">',
                '<i class="fa-brands fa-whatsapp"></i>',
                '<span>WhatsApp</span>',
              '</button>',
              conclBtn,
              '<button onclick="handleDeleteAppointment(' + a.id + ')" class="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition" title="Excluir agendamento">',
                '<i class="fa-regular fa-trash-can text-xs"></i>',
              '</button>',
            '</div>',
          '</div>'
        ].join('');
      }).join('');
    }

    function renderAppointmentsTable() {
      const tbody = document.getElementById('appointmentTableBody');
      const search = (document.getElementById('appointmentSearchInput')?.value || '').toLowerCase().trim();
      const filter = document.getElementById('appointmentStatusFilter')?.value || 'todos';

      const filtered = appointments.filter(a => {
        const matchSearch = (a.patient_name || '').toLowerCase().includes(search) || 
                            (a.procedure || '').toLowerCase().includes(search) || 
                            (a.contact_wa_id || '').includes(search);
        const matchStatus = filter === 'todos' || 
                            (filter === 'agendado' ? (a.status === 'agendado' || a.status === 'pre_agendado') : a.status === filter);
        return matchSearch && matchStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Nenhum agendamento encontrado para os filtros selecionados.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(a => {
        let statusBadge = '';
        if (a.status === 'confirmado') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800/60">Confirmado</span>';
        } else if (a.status === 'concluido') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-400 font-bold text-[10px] border border-sky-200 dark:border-sky-800/60">Concluído</span>';
        } else if (a.status === 'cancelado') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">Cancelado</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60">Agendado</span>';
        }

        const formattedDate = formatScheduleDateTime(a.scheduled_at);

        return [
          '<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">',
            '<td class="py-3 px-4">',
              '<div class="font-bold text-slate-900 dark:text-white">' + escapeHtml(a.patient_name) + '</div>',
              '<div class="text-[10px] text-slate-400 font-mono">' + escapeHtml(a.contact_wa_id) + '</div>',
            '</td>',
            '<td class="py-3 px-4">',
              '<div class="font-semibold text-slate-800 dark:text-slate-200">' + escapeHtml(a.procedure || 'Avaliação Inicial') + '</div>',
            '</td>',
            '<td class="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">',
              '<i class="fa-regular fa-clock mr-1 text-slate-400"></i>' + escapeHtml(formattedDate),
            '</td>',
            '<td class="py-3 px-4">',
              statusBadge,
            '</td>',
            '<td class="py-3 px-4 text-center whitespace-nowrap">',
              '<button type="button" onclick="openAppointmentDetailsModal(' + a.id + ')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-[#008069] dark:text-emerald-400 font-bold text-xs transition shadow-sm">',
                '<i class="fa-solid fa-file-lines text-xs"></i>',
                '<span>Ver mais / Editar</span>',
              '</button>',
            '</td>',
          '</tr>'
        ].join('');
      }).join('');
    }

    function filterAppointments() {
      renderAppointmentsTable();
    }

    function handleConcludeAppointment(id) {
      handleUpdateAppointmentStatus(id, 'concluido');
    }

    async function handleUpdateAppointmentStatus(id, newStatus) {
      try {
        await fetch('/api/appointments', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus })
        });
        const target = appointments.find(a => a.id === id);
        if (target) {
          target.status = newStatus;
          if (newStatus === 'confirmado') {
            target.confirmed_by = 'ai';
            target.confirmed_at = new Date().toISOString();
          }
        }
        updateAppointmentMetrics();
        renderAppointmentsTable();
        renderCalendar();
        renderDailySchedule();
        showToast("Status da consulta atualizado!", "emerald");
      } catch (err) {
        alert("Erro ao alterar status");
      }
    }

    async function handleDeleteAppointment(id) {
      if (!confirm("Tem certeza que deseja excluir esta consulta da agenda?")) return;
      try {
        await fetch('/api/appointments?id=' + id, { method: 'DELETE' });
        appointments = appointments.filter(a => a.id !== id);
        updateAppointmentMetrics();
        renderAppointmentsTable();
        renderCalendar();
        renderDailySchedule();
        showToast("Agendamento excluído!", "amber");
      } catch (err) {
        alert("Erro ao excluir agendamento");
      }
    }

    function goToChatWithPatient(phone) {
      selectNavigationTab('chat', 'Atendimento WhatsApp', 'fa-solid fa-comments', 'emerald');
      selectChat(phone);
    }

    // UTILITÁRIOS DE DURAÇÃO & TEMPO DA GRADE
    function parseDurationMinutes(durationStr) {
      if (!durationStr) return 30;
      const s = String(durationStr).toLowerCase().trim();
      let total = 0;
      const hMatch = s.match(/(\\d+)\\s*(?:h|hora)/);
      if (hMatch) total += parseInt(hMatch[1], 10) * 60;
      const mMatch = s.match(/(\\d+)\\s*(?:m|min)/);
      if (mMatch) total += parseInt(mMatch[1], 10);
      if (total === 0) {
        const num = parseInt(s, 10);
        if (!isNaN(num) && num > 0) return num;
      }
      return total > 0 ? total : 30;
    }

    function getProcedureDuration(procName) {
      if (!procName) return '30 min';
      const nameNorm = procName.toLowerCase().trim();
      if (nameNorm.includes('avaliação') || nameNorm.includes('avaliacao') || nameNorm.includes('consulta')) {
        if (currentConfig && currentConfig.initial_consultation && currentConfig.initial_consultation.duration) {
          return currentConfig.initial_consultation.duration;
        }
        return '30 min';
      }
      if (currentConfig && Array.isArray(currentConfig.procedure_items)) {
        const item = currentConfig.procedure_items.find(p => (p.name || '').toLowerCase().trim() === nameNorm);
        if (item && item.duration) return item.duration;
      }
      return '30 min';
    }

    function populateHourSelect(selectedHour = '09') {
      const select = document.getElementById('appHourSelect');
      if (!select) return;
      let html = '';
      for (let h = 0; h < 24; h++) {
        const hh = String(h).padStart(2, '0');
        const isSel = hh === selectedHour ? 'selected' : '';
        html += '<option value="' + hh + '" ' + isSel + '>' + hh + ':00h</option>';
      }
      select.innerHTML = html;
    }

    function checkLocalConflict(dateStr, startMinutes, endMinutes, excludeId = null) {
      for (const a of appointments) {
        if (excludeId && a.id === excludeId) continue;
        if (a.status === 'cancelado') continue;
        if (!a.scheduled_at) continue;

        let aDate = '';
        let aTime = '09:00';
        if (a.scheduled_at.includes('T')) {
          const parts = a.scheduled_at.split('T');
          aDate = parts[0];
          aTime = (parts[1] || '09:00').slice(0, 5);
        } else if (a.scheduled_at.includes(' ')) {
          const parts = a.scheduled_at.split(' ');
          aDate = parts[0];
          aTime = (parts[1] || '09:00').slice(0, 5);
        } else {
          aDate = a.scheduled_at.slice(0, 10);
        }

        if (aDate !== dateStr) continue;

        const [ah, am] = aTime.split(':').map(Number);
        const aStart = (ah || 0) * 60 + (am || 0);
        const aDur = parseDurationMinutes(a.duration || getProcedureDuration(a.procedure));
        const aEnd = aStart + aDur;

        // Sobreposição: startMinutes < aEnd && endMinutes > aStart
        if (startMinutes < aEnd && endMinutes > aStart) {
          const aEndH = String(Math.floor(aEnd / 60) % 24).padStart(2, '0');
          const aEndM = String(aEnd % 60).padStart(2, '0');
          return {
            conflict: true,
            patientName: a.patient_name || 'Paciente',
            procedure: a.procedure || 'Consulta',
            startStr: aTime,
            endStr: aEndH + ':' + aEndM
          };
        }
      }
      return { conflict: false };
    }

    function onAppointmentTimeOrProcChange() {
      const dateInput = document.getElementById('appDate');
      const hourSelect = document.getElementById('appHourSelect');
      const minSelect = document.getElementById('appMinuteSelect');
      const procSelect = document.getElementById('appProcedure');
      const feedbackEl = document.getElementById('appTimeSlotFeedback');
      const submitBtn = document.getElementById('btnSaveAppointmentModal');

      if (!feedbackEl) return;

      const dateVal = dateInput ? dateInput.value : '';
      const hourVal = hourSelect ? hourSelect.value : '09';
      const minVal = minSelect ? minSelect.value : '00';
      const procVal = procSelect ? procSelect.value : '';

      const durStr = getProcedureDuration(procVal);
      const durMin = parseDurationMinutes(durStr);

      const startTotalMin = parseInt(hourVal, 10) * 60 + parseInt(minVal, 10);
      const endTotalMin = startTotalMin + durMin;

      const startHStr = String(Math.floor(startTotalMin / 60) % 24).padStart(2, '0');
      const startMStr = String(startTotalMin % 60).padStart(2, '0');
      const endHStr = String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0');
      const endMStr = String(endTotalMin % 60).padStart(2, '0');

      const timeSlotText = startHStr + ':' + startMStr + ' às ' + endHStr + ':' + endMStr + ' (' + durMin + ' min)';

      if (!dateVal) {
        feedbackEl.innerHTML = '<span class="text-slate-500 dark:text-slate-400">Horário estimado: <strong>' + timeSlotText + '</strong>. Selecione uma data para verificar conflitos.</span>';
        feedbackEl.className = "mt-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 text-[11px] transition-all";
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      const check = checkLocalConflict(dateVal, startTotalMin, endTotalMin);
      if (check.conflict) {
        feedbackEl.innerHTML = [
          '<div class="flex items-start gap-2 text-rose-600 dark:text-rose-400 font-medium">',
            '<i class="fa-solid fa-triangle-exclamation text-rose-500 mt-0.5"></i>',
            '<div>',
              '<span class="font-bold block">Horário Indisponível (Conflito de Agenda)!</span>',
              '<span>Já existe consulta para <strong>' + escapeHtml(check.patientName) + '</strong> agendada das <strong>' + check.startStr + ' às ' + check.endStr + '</strong>. Escolha outro horário ou data.</span>',
            '</div>',
          '</div>'
        ].join('');
        feedbackEl.className = "mt-2 p-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-[11px] transition-all";
        if (submitBtn) submitBtn.disabled = true;
      } else {
        feedbackEl.innerHTML = [
          '<div class="flex items-center justify-between text-emerald-700 dark:text-emerald-300">',
            '<div class="flex items-center gap-2">',
              '<i class="fa-solid fa-circle-check text-emerald-500"></i>',
              '<span>Grade Consumida: <strong>' + timeSlotText + '</strong></span>',
            '</div>',
            '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">Disponível</span>',
          '</div>'
        ].join('');
        feedbackEl.className = "mt-2 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-[11px] transition-all";
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    function openAppointmentModal(defaultProc = '', defaultDate = '', defaultTime = '09:00') {
      if (!isCrucialTrainingComplete()) {
        const missing = getMissingListFromConfig(currentConfig);
        alert("Treinamento obrigatório pendente:\\n• " + missing.join("\\n• ") + "\\n\\nVamos abrir o Treinamento da IA com os campos destacados em vermelho.");
        goToTrainingAndHighlightMissing();
        return;
      }

      populateProcedureSelect(defaultProc);

      const dateInput = document.getElementById('appDate');
      if (dateInput) {
        dateInput.value = defaultDate || calSelectedDate || new Date().toISOString().slice(0, 10);
      }

      let defaultHour = '09';
      let defaultMinute = '00';
      if (defaultTime && defaultTime.includes(':')) {
        const parts = defaultTime.split(':');
        defaultHour = (parts[0] || '09').padStart(2, '0');
        const m = parseInt(parts[1] || '0', 10);
        const snappedM = Math.min(50, Math.floor(m / 10) * 10);
        defaultMinute = String(snappedM).padStart(2, '0');
      }

      populateHourSelect(defaultHour);

      const minSelect = document.getElementById('appMinuteSelect');
      if (minSelect) {
        minSelect.value = defaultMinute;
      }

      onAppointmentTimeOrProcChange();
      document.getElementById('appointmentModal').classList.remove('hidden');
    }

    function closeAppointmentModal() {
      document.getElementById('appointmentModal').classList.add('hidden');
    }

    async function handleSaveAppointment(e) {
      e.preventDefault();
      const patientName = document.getElementById('appPatientName').value.trim();
      const contactWaId = document.getElementById('appPatientPhone').value.trim();
      const procedure = document.getElementById('appProcedure').value.trim();
      const dateVal = document.getElementById('appDate').value;
      const hourVal = document.getElementById('appHourSelect')?.value || '09';
      const minVal = document.getElementById('appMinuteSelect')?.value || '00';
      const status = document.getElementById('appStatus').value;
      const notes = document.getElementById('appNotes').value.trim();

      if (!patientName || !contactWaId || !dateVal) return;

      const duration = getProcedureDuration(procedure);
      const scheduledAt = dateVal + ' ' + hourVal + ':' + minVal;

      const saveBtn = document.getElementById('btnSaveAppointmentModal');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Salvando...';
      }

      try {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ patientName, contactWaId, procedure, scheduledAt, status, notes, duration })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Erro ao salvar agendamento na grade");
          return;
        }
        closeAppointmentModal();
        await loadAppointments();
        showToast("Agendamento salvo com sucesso!", "emerald");
      } catch (err) {
        alert("Erro de comunicação ao salvar agendamento.");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerText = 'Salvar Agendamento';
        }
      }
    }

    // CONTROLE DO MODAL DE DETALHES (VER MAIS / EDITAR)
    let activeDetailAppointmentId = null;

    function openAppointmentDetailsModal(id) {
      const app = appointments.find(a => a.id === id);
      if (!app) return;

      activeDetailAppointmentId = id;
      document.getElementById('detAppId').value = id;
      document.getElementById('detPatientName').innerText = app.patient_name || '-';
      document.getElementById('detPatientPhone').innerText = app.contact_wa_id || '-';
      document.getElementById('detProcedure').innerText = app.procedure || 'Avaliação Inicial';

      const dur = app.duration || getProcedureDuration(app.procedure);
      document.getElementById('detDuration').innerText = dur ? dur + ' estimada' : 'Tempo padrão';

      document.getElementById('detScheduledAt').innerText = formatScheduleDateTime(app.scheduled_at);

      const confirmBadge = document.getElementById('detConfirmationBadge');
      if (confirmBadge) {
        if (app.status === 'confirmado') {
          confirmBadge.innerHTML = '<span class="text-emerald-600 dark:text-emerald-400 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Confirmado ' + (app.confirmed_by === 'ai' ? 'pela IA' : '') + '</span>';
        } else {
          confirmBadge.innerHTML = '';
        }
      }

      const detStatus = document.getElementById('detStatus');
      if (detStatus) {
        detStatus.value = (app.status === 'pre_agendado') ? 'agendado' : (app.status || 'agendado');
      }

      const detNotes = document.getElementById('detNotes');
      if (detNotes) {
        detNotes.value = app.notes || '';
      }

      document.getElementById('appointmentDetailsModal').classList.remove('hidden');
    }

    function closeAppointmentDetailsModal() {
      document.getElementById('appointmentDetailsModal').classList.add('hidden');
      activeDetailAppointmentId = null;
    }

    function handleDetailOpenChat() {
      const app = appointments.find(a => a.id === activeDetailAppointmentId);
      if (!app || !app.contact_wa_id) return;
      closeAppointmentDetailsModal();
      goToChatWithPatient(app.contact_wa_id);
    }

    async function handleSaveAppointmentDetails() {
      if (!activeDetailAppointmentId) return;
      const newStatus = document.getElementById('detStatus').value;
      const newNotes = document.getElementById('detNotes').value.trim();

      const saveBtn = document.getElementById('btnSaveAppointmentDetails');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Salvando...';
      }

      try {
        const res = await fetch('/api/appointments', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: activeDetailAppointmentId, status: newStatus, notes: newNotes })
        });
        if (!res.ok) throw new Error("Falha ao salvar");

        const target = appointments.find(a => a.id === activeDetailAppointmentId);
        if (target) {
          target.status = newStatus;
          target.notes = newNotes;
          if (newStatus === 'confirmado' && !target.confirmed_at) {
            target.confirmed_by = 'manual';
            target.confirmed_at = new Date().toISOString();
          }
        }

        updateAppointmentMetrics();
        renderAppointmentsTable();
        renderCalendar();
        renderDailySchedule();
        closeAppointmentDetailsModal();
        showToast("Alterações salvas com sucesso!", "emerald");
      } catch (err) {
        alert("Erro ao salvar alterações da consulta.");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerText = 'Salvar Alterações';
        }
      }
    }

    async function handleDeleteDetailAppointment() {
      if (!activeDetailAppointmentId) return;
      if (!confirm("Tem certeza que deseja excluir esta consulta da agenda?")) return;
      try {
        await fetch('/api/appointments?id=' + activeDetailAppointmentId, { method: 'DELETE' });
        appointments = appointments.filter(a => a.id !== activeDetailAppointmentId);
        updateAppointmentMetrics();
        renderAppointmentsTable();
        renderCalendar();
        renderDailySchedule();
        closeAppointmentDetailsModal();
        showToast("Consulta excluída com sucesso!", "amber");
      } catch (err) {
        alert("Erro ao excluir consulta.");
      }
    }

    // VERIFICAÇÃO DE TREINAMENTO CRUCIAL & DESTAQUE VISUAL EM VERMELHO
    function getMissingListFromConfig(cfg) {
      const missing = [];
      if (!cfg || !cfg.clinic_name || !cfg.clinic_name.trim()) {
        missing.push('Nome Oficial da Clínica');
      }
      if (!cfg || !cfg.initial_consultation || !cfg.initial_consultation.duration || !cfg.initial_consultation.duration.trim()) {
        missing.push('Tempo de Duração da Avaliação Inicial');
      }
      if (!cfg || !Array.isArray(cfg.procedure_items)) {
        missing.push('Procedimentos e Tempos de Duração (clique em Salvar Alterações na IA)');
      } else {
        const activeItems = cfg.procedure_items.filter(p => p.checked !== false);
        if (activeItems.length === 0) {
          missing.push('Pelo menos 1 Procedimento ativo com Duração');
        } else {
          const invalidCount = activeItems.filter(p => !p.name || !p.name.trim() || !p.duration || !p.duration.trim()).length;
          if (invalidCount > 0) {
            missing.push(invalidCount + ' procedimento(s) selecionado(s) sem Nome ou Tempo de Duração');
          }
        }
      }
      if (!cfg || !cfg.hours || !cfg.hours.trim()) {
        missing.push('Horários e Dias de Atendimento');
      }
      return missing;
    }

    function isCrucialTrainingComplete() {
      return getMissingListFromConfig(currentConfig).length === 0;
    }

    function scrollToMissingField(elementId) {
      const el = document.getElementById(elementId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        try { el.focus({ preventScroll: true }); } catch {}
      }, 350);
    }

    function scrollToFirstInvalidProcedure() {
      const rows = document.querySelectorAll('.proc-row');
      for (const row of rows) {
        const cb = row.querySelector('.proc-checkbox');
        if (!cb || !cb.checked) continue;
        const nameEl = row.querySelector('.proc-name');
        const durEl = row.querySelector('.proc-duration');
        if (!nameEl || !nameEl.value.trim()) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => { if (nameEl) nameEl.focus({ preventScroll: true }); }, 350);
          return;
        }
        if (!durEl || !durEl.value.trim()) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => { if (durEl) durEl.focus({ preventScroll: true }); }, 350);
          return;
        }
      }
      const listEl = document.getElementById('odontoList');
      if (listEl) listEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function goToTrainingAndHighlightMissing() {
      selectNavigationTab('config', 'Treinamento da IA', 'fa-solid fa-brain', 'purple');
      setTimeout(() => {
        updateTrainingValidationHighlights();
        const mainConfig = document.getElementById('viewConfig');
        if (mainConfig) mainConfig.scrollTo({ top: 0, behavior: 'smooth' });
      }, 120);
    }

    function updateTrainingValidationHighlights() {
      const missingLive = [];

      // 1. Nome Oficial da Clínica (Card 1)
      const clinicNameEl = document.getElementById('cfgClinicName');
      const lblClinicName = document.getElementById('lblCfgClinicName');
      const badgeClinicName = document.getElementById('badgeCfgClinicName');
      const errClinicName = document.getElementById('errCfgClinicName');
      const hasClinicName = !!(clinicNameEl && clinicNameEl.value.trim());

      if (clinicNameEl) {
        if (!hasClinicName) {
          clinicNameEl.classList.add('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          clinicNameEl.classList.remove('border', 'border-slate-200', 'dark:border-slate-700/60', 'bg-slate-50', 'dark:bg-slate-800/80');
          if (lblClinicName) {
            lblClinicName.classList.add('text-rose-600', 'dark:text-rose-400');
            lblClinicName.classList.remove('text-slate-700', 'dark:text-slate-300');
          }
          if (badgeClinicName) {
            badgeClinicName.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white';
            badgeClinicName.innerText = 'Obrigatório';
          }
          if (errClinicName) {
            errClinicName.innerText = '⚠️ Campo obrigatório em vermelho: informe o nome oficial da clínica.';
            errClinicName.classList.remove('hidden');
          }
          missingLive.push({ action: "scrollToMissingField('cfgClinicName')", label: 'Nome Oficial da Clínica (Card 1)' });
        } else {
          clinicNameEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          clinicNameEl.classList.add('border', 'border-slate-200', 'dark:border-slate-700/60', 'bg-slate-50', 'dark:bg-slate-800/80');
          if (lblClinicName) {
            lblClinicName.classList.remove('text-rose-600', 'dark:text-rose-400');
            lblClinicName.classList.add('text-slate-700', 'dark:text-slate-300');
          }
          if (badgeClinicName) {
            badgeClinicName.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
            badgeClinicName.innerText = '✓ Preenchido';
          }
          if (errClinicName) errClinicName.classList.add('hidden');
        }
      }

      // 2. Avaliação Inicial: Tempo de Duração (Card 2)
      const initDurEl = document.getElementById('cfgInitEvalDuration');
      const cardInitContainer = document.getElementById('cardInitEvalContainer');
      const lblInitDur = document.getElementById('lblCfgInitEvalDuration');
      const badgeInitDur = document.getElementById('badgeCfgInitEvalDuration');
      const errInitDur = document.getElementById('errCfgInitEvalDuration');
      const hasInitDur = !!(initDurEl && initDurEl.value.trim());

      if (initDurEl) {
        if (!hasInitDur) {
          initDurEl.classList.add('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/60', 'dark:bg-rose-950/30');
          initDurEl.classList.remove('border', 'border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
          if (cardInitContainer) {
            cardInitContainer.classList.add('border-rose-500', 'bg-rose-50/40', 'dark:bg-rose-950/20');
            cardInitContainer.classList.remove('border-emerald-500/30', 'bg-emerald-50/40', 'dark:bg-emerald-950/20');
          }
          if (lblInitDur) {
            lblInitDur.classList.add('text-rose-600', 'dark:text-rose-400');
            lblInitDur.classList.remove('text-slate-700', 'dark:text-slate-300');
          }
          if (badgeInitDur) {
            badgeInitDur.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white';
            badgeInitDur.innerText = 'Obrigatório';
          }
          if (errInitDur) {
            errInitDur.innerText = '⚠️ Campo obrigatório em vermelho: informe o tempo da Avaliação Inicial (ex: 30 min).';
            errInitDur.classList.remove('hidden');
          }
          missingLive.push({ action: "scrollToMissingField('cfgInitEvalDuration')", label: 'Tempo de Duração da Avaliação Inicial / Consulta (Card 2)' });
        } else {
          initDurEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/60', 'dark:bg-rose-950/30');
          initDurEl.classList.add('border', 'border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
          if (cardInitContainer) {
            cardInitContainer.classList.remove('border-rose-500', 'bg-rose-50/40', 'dark:bg-rose-950/20');
            cardInitContainer.classList.add('border-emerald-500/30', 'bg-emerald-50/40', 'dark:bg-emerald-950/20');
          }
          if (lblInitDur) {
            lblInitDur.classList.remove('text-rose-600', 'dark:text-rose-400');
            lblInitDur.classList.add('text-slate-700', 'dark:text-slate-300');
          }
          if (badgeInitDur) {
            badgeInitDur.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
            badgeInitDur.innerText = '✓ Preenchido';
          }
          if (errInitDur) errInitDur.classList.add('hidden');
        }
      }

      // 3. Procedimentos Selecionados e Durações (Card 2)
      const procRows = document.querySelectorAll('.proc-row');
      let checkedProcCount = 0;
      let invalidProcCount = 0;

      procRows.forEach(row => {
        const cb = row.querySelector('.proc-checkbox');
        const nameEl = row.querySelector('.proc-name');
        const durEl = row.querySelector('.proc-duration');
        const nameErrEl = row.querySelector('.proc-name-err');
        const durErrEl = row.querySelector('.proc-duration-err');
        const isChecked = !!(cb && cb.checked);

        if (isChecked) {
          checkedProcCount++;
          const hasName = !!(nameEl && nameEl.value.trim());
          const hasDur = !!(durEl && durEl.value.trim());

          if (!hasName || !hasDur) {
            invalidProcCount++;
            row.classList.add('border-2', 'border-rose-500', 'bg-rose-50/50', 'dark:bg-rose-950/30');
            row.classList.remove('border', 'border-slate-200', 'dark:border-slate-700/60', 'bg-slate-50', 'dark:bg-slate-800/40');
          } else {
            row.classList.remove('border-2', 'border-rose-500', 'bg-rose-50/50', 'dark:bg-rose-950/30');
            row.classList.add('border', 'border-slate-200', 'dark:border-slate-700/60', 'bg-slate-50', 'dark:bg-slate-800/40');
          }

          if (nameEl) {
            if (!hasName) {
              nameEl.classList.add('border-b-2', 'border-rose-500', 'text-rose-700', 'dark:text-rose-300');
              if (nameErrEl) nameErrEl.classList.remove('hidden');
            } else {
              nameEl.classList.remove('border-b-2', 'border-rose-500', 'text-rose-700', 'dark:text-rose-300');
              if (nameErrEl) nameErrEl.classList.add('hidden');
            }
          }

          if (durEl) {
            if (!hasDur) {
              durEl.classList.add('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50', 'dark:bg-rose-950/40');
              durEl.classList.remove('border', 'border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
              if (durErrEl) durErrEl.classList.remove('hidden');
            } else {
              durEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50', 'dark:bg-rose-950/40');
              durEl.classList.add('border', 'border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
              if (durErrEl) durErrEl.classList.add('hidden');
            }
          }
        } else {
          row.classList.remove('border-2', 'border-rose-500', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          row.classList.add('border', 'border-slate-200', 'dark:border-slate-700/60', 'bg-slate-50', 'dark:bg-slate-800/40');
          if (nameEl) nameEl.classList.remove('border-b-2', 'border-rose-500', 'text-rose-700', 'dark:text-rose-300');
          if (durEl) {
            durEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50', 'dark:bg-rose-950/40');
            durEl.classList.add('border', 'border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
          }
          if (nameErrEl) nameErrEl.classList.add('hidden');
          if (durErrEl) durErrEl.classList.add('hidden');
        }
      });

      const procAlertEl = document.getElementById('proceduresCrucialAlert');
      if (procRows.length > 0 && checkedProcCount === 0) {
        if (procAlertEl) {
          procAlertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-500 shrink-0"></i><span>Selecione (marque) pelo menos 1 procedimento oferecido pela clínica com seu respectivo tempo de duração.</span>';
          procAlertEl.classList.remove('hidden');
        }
        missingLive.push({ action: "scrollToMissingField('odontoList')", label: 'Pelo menos 1 Procedimento marcado em Odonto ou Estética (Card 2)' });
      } else if (invalidProcCount > 0) {
        if (procAlertEl) {
          procAlertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-500 shrink-0"></i><span>Existem <strong>' + invalidProcCount + ' procedimento(s) marcado(s) em vermelho</strong> sem Nome ou Tempo de Duração. Preencha ou desmarque-os.</span>';
          procAlertEl.classList.remove('hidden');
        }
        missingLive.push({ action: "scrollToFirstInvalidProcedure()", label: invalidProcCount + ' procedimento(s) selecionado(s) sem Nome ou Tempo de Duração (Card 2)' });
      } else if (procAlertEl) {
        procAlertEl.classList.add('hidden');
      }

      // 4. Horários e Dias de Atendimento (Card 5)
      const hoursEl = document.getElementById('cfgHours');
      const lblHours = document.getElementById('lblCfgHours');
      const badgeHours = document.getElementById('badgeCfgHours');
      const errHours = document.getElementById('errCfgHours');
      const hasHours = !!(hoursEl && hoursEl.value.trim());

      if (hoursEl) {
        if (!hasHours) {
          hoursEl.classList.add('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          hoursEl.classList.remove('border', 'border-slate-200', 'dark:border-slate-700/60', 'bg-slate-50', 'dark:bg-slate-800/80');
          if (lblHours) {
            lblHours.classList.add('text-rose-600', 'dark:text-rose-400');
            lblHours.classList.remove('text-slate-700', 'dark:text-slate-300');
          }
          if (badgeHours) {
            badgeHours.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white';
            badgeHours.innerText = 'Obrigatório';
          }
          if (errHours) {
            errHours.innerText = '⚠️ Campo obrigatório em vermelho: informe os horários e dias em que a clínica atende.';
            errHours.classList.remove('hidden');
          }
          missingLive.push({ action: "scrollToMissingField('cfgHours')", label: 'Horários e Dias de Atendimento (Card 5)' });
        } else {
          hoursEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          hoursEl.classList.add('border', 'border-slate-200', 'dark:border-slate-700/60', 'bg-slate-50', 'dark:bg-slate-800/80');
          if (lblHours) {
            lblHours.classList.remove('text-rose-600', 'dark:text-rose-400');
            lblHours.classList.add('text-slate-700', 'dark:text-slate-300');
          }
          if (badgeHours) {
            badgeHours.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
            badgeHours.innerText = '✓ Preenchido';
          }
          if (errHours) errHours.classList.add('hidden');
        }
      }

      // 5. Renderiza o Banner Explícito no Topo do Treinamento
      const statusBanner = document.getElementById('configCrucialStatusBanner');
      if (!statusBanner) return;

      const savedComplete = isCrucialTrainingComplete();
      statusBanner.classList.remove('hidden');

      if (missingLive.length > 0) {
        const itemsHtml = missingLive.map(m => [
          '<li class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/60 border border-rose-200 dark:border-rose-800/60">',
            '<span class="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">',
              '<i class="fa-solid fa-circle-xmark text-rose-500 shrink-0"></i>',
              '<span>' + escapeHtml(m.label) + '</span>',
            '</span>',
            '<button type="button" onclick="' + m.action + '" class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold whitespace-nowrap transition shadow-xs">',
              'Ir para campo ↴',
            '</button>',
          '</li>'
        ].join('')).join('');

        statusBanner.className = 'rounded-2xl p-5 shadow-md border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 space-y-3 transition-all';
        statusBanner.innerHTML = [
          '<div class="flex items-start gap-3">',
            '<div class="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 text-base shadow-sm">',
              '<i class="fa-solid fa-lock"></i>',
            '</div>',
            '<div class="flex-1 space-y-1">',
              '<h3 class="text-sm font-extrabold text-rose-700 dark:text-rose-300">Preenchimento Obrigatório Pendente — Chat (IA) e Agenda Bloqueados</h3>',
              '<p class="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">',
                'Para liberar o atendimento automático no Chat e os agendamentos na Agenda, preencha os campos destacados em <strong>vermelho</strong> abaixo e clique em <strong>“Salvar Alterações na IA”</strong>:',
              '</p>',
            '</div>',
          '</div>',
          '<ul class="space-y-2 pt-1">' + itemsHtml + '</ul>'
        ].join('');
      } else if (!savedComplete) {
        statusBanner.className = 'rounded-2xl p-5 shadow-md border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all';
        statusBanner.innerHTML = [
          '<div class="flex items-start gap-3">',
            '<div class="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 text-base shadow-sm">',
              '<i class="fa-solid fa-floppy-disk"></i>',
            '</div>',
            '<div class="space-y-0.5">',
              '<h3 class="text-sm font-extrabold text-rose-700 dark:text-rose-300">Falta Apenas SALVAR para Liberar o Chat e a Agenda!</h3>',
              '<p class="text-xs text-rose-800 dark:text-rose-200">',
                'Todos os campos obrigatórios já estão preenchidos nesta tela, mas suas alterações ainda não foram salvas no banco da IA.',
              '</p>',
            '</div>',
          '</div>',
          '<button type="button" onclick="saveClinicConfig()" class="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap transition shadow-md flex items-center gap-2 shrink-0 self-start sm:self-center">',
            '<i class="fa-solid fa-check-double"></i>',
            '<span>Salvar Alterações e Liberar Agora</span>',
          '</button>'
        ].join('');
      } else {
        statusBanner.className = 'rounded-2xl p-4 shadow-sm border border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 transition-all';
        statusBanner.innerHTML = [
          '<div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-sm">',
            '<i class="fa-solid fa-circle-check"></i>',
          '</div>',
          '<div class="text-xs">',
            '<span class="font-bold text-emerald-800 dark:text-emerald-300 block">Treinamento Obrigatório Concluído — Atendimento Chat (IA) e Agenda Liberados!</span>',
            '<span class="text-[11px] text-emerald-700 dark:text-emerald-400">Todas as informações essenciais estão ativas e sincronizadas com a Secretária IA.</span>',
          '</div>'
        ].join('');
      }
    }

    function updateCrucialTrainingLockUI() {
      const missingSaved = getMissingListFromConfig(currentConfig);
      const complete = missingSaved.length === 0;
      const missingText = missingSaved.length > 0
        ? 'Pendências em vermelho no Treinamento: ' + missingSaved.join(' • ') + '.'
        : 'Todas as informações cruciais estão salvas.';

      // Badge global na sidebar do chat
      const sidebarBadge = document.getElementById('sidebarAiGlobalBadge');
      if (sidebarBadge) {
        if (complete) {
          sidebarBadge.className = 'flex items-center gap-1 text-emerald-600 dark:text-emerald-400';
          sidebarBadge.innerHTML = '<i class="fa-solid fa-bolt text-[10px]"></i> IA Ativa 24h';
        } else {
          sidebarBadge.className = 'flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold';
          sidebarBadge.innerHTML = '<i class="fa-solid fa-power-off text-[10px]"></i> IA Desligada';
        }
      }

      // Banner do Chat
      const chatBanner = document.getElementById('chatCrucialLockBanner');
      const chatDetails = document.getElementById('chatCrucialLockDetails');
      if (chatBanner) {
        if (complete) chatBanner.classList.add('hidden');
        else chatBanner.classList.remove('hidden');
      }
      if (chatDetails) {
        chatDetails.innerText = missingText;
      }

      // Banner da Agenda
      const agendaBanner = document.getElementById('agendaCrucialLockBanner');
      const agendaDetails = document.getElementById('agendaCrucialLockDetails');
      if (agendaBanner) {
        if (complete) agendaBanner.classList.add('hidden');
        else agendaBanner.classList.remove('hidden');
      }
      if (agendaDetails) {
        agendaDetails.innerText = missingText;
      }

      // Botão da Agenda
      const newAppBtn = document.getElementById('btnNewAppointmentAgenda');
      if (newAppBtn) {
        newAppBtn.title = complete ? 'Criar agendamento' : 'Complete os campos em vermelho no Treinamento para agendar';
      }

      // Botão no card do paciente ativo
      const schedPatientBtn = document.getElementById('btnScheduleThisPatient');
      if (schedPatientBtn && activePhone) {
        schedPatientBtn.disabled = !complete;
        schedPatientBtn.title = complete ? 'Agendar consulta deste paciente' : 'Complete o treinamento para agendar';
      }

      if (activePhone) {
        updateAiStatusUI();
      }
      renderConversationList();
    }

    // 6. QUESTIONÁRIO DE CONFIGURAÇÃO & TREINAMENTO DA IA (ODONTO & ESTÉTICA REFINADO)
    function createProcedureRowHtml(proc, category) {
      const isChecked = proc.checked !== false;
      const name = proc.name || '';
      const duration = proc.duration || '';
      const price = proc.price || '';
      const note = proc.note || '';

      return \`
        <div class="proc-row flex flex-col md:flex-row md:items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition" data-category="\${category}">
          <!-- Checkbox + Nome -->
          <div class="flex items-start gap-2 md:w-5/12 min-w-0 md:pt-1.5">
            <input type="checkbox" class="proc-checkbox rounded text-[#008069] focus:ring-0 w-4 h-4 shrink-0 cursor-pointer mt-0.5" \${isChecked ? 'checked' : ''}>
            <div class="w-full">
              <input type="text" class="proc-name w-full bg-transparent font-bold text-xs text-slate-800 dark:text-slate-100 border-b border-transparent hover:border-slate-300 focus:border-[#008069] focus:outline-none px-1" value="\${escapeHtml(name)}" placeholder="Nome do procedimento">
              <span class="proc-name-err hidden text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">⚠️ Informe o nome do procedimento!</span>
            </div>
          </div>
          
          <!-- Duração e Preço -->
          <div class="md:w-3/12 flex flex-col gap-1.5 md:pt-0.5">
            <div>
              <input type="text" class="proc-duration w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#008069]" placeholder="Duração (ex: 45 min)" value="\${escapeHtml(duration)}">
              <span class="proc-duration-err hidden text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">⚠️ Falta duração!</span>
            </div>
            <input type="text" class="proc-price w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#008069]" placeholder="Preço (ex: R$ 250 ou A partir de...)" value="\${escapeHtml(price)}">
          </div>

          <!-- Observações (3 linhas) + Remover -->
          <div class="flex-1 flex items-start gap-2">
            <textarea rows="3" class="proc-note w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#008069] leading-relaxed resize-none" placeholder="Observações e regras do procedimento...">\${escapeHtml(note)}</textarea>
            <button type="button" onclick="removeProcedureRow(this)" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition shrink-0 md:mt-1" title="Remover procedimento">
              <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      \`;
    }

    function addNewProcedureRow(category) {
      const containerId = category === 'odonto' ? 'odontoList' : 'esteticaList';
      const container = document.getElementById(containerId);
      if (!container) return;

      const newRowHtml = createProcedureRowHtml({ name: '', checked: true, duration: '', price: '', note: '' }, category);
      container.insertAdjacentHTML('beforeend', newRowHtml);

      updateTrainingValidationHighlights();

      const rows = container.querySelectorAll('.proc-row');
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        const inputName = lastRow.querySelector('.proc-name');
        if (inputName) inputName.focus();
      }
    }

    function removeProcedureRow(btn) {
      const row = btn.closest('.proc-row');
      if (row) row.remove();
      updateTrainingValidationHighlights();
    }

    function renderProceduresLists(savedItems) {
      const odontoContainer = document.getElementById('odontoList');
      const esteticaContainer = document.getElementById('esteticaList');

      if (!odontoContainer || !esteticaContainer) return;

      if (savedItems && savedItems.length > 0) {
        const odontoItems = savedItems.filter(p => p.category === 'odonto');
        const esteticaItems = savedItems.filter(p => p.category === 'estetica' || p.category !== 'odonto');

        odontoContainer.innerHTML = odontoItems.map(p => createProcedureRowHtml(p, 'odonto')).join('');
        esteticaContainer.innerHTML = esteticaItems.map(p => createProcedureRowHtml(p, 'estetica')).join('');
      } else {
        // Usa os padrões iniciais de Odonto & Estética
        odontoContainer.innerHTML = DEFAULT_ODONTO_SERVICES.map(p => createProcedureRowHtml({ ...p, checked: true }, 'odonto')).join('');
        esteticaContainer.innerHTML = DEFAULT_ESTETICA_SERVICES.map(p => createProcedureRowHtml({ ...p, checked: true }, 'estetica')).join('');
      }

      updateTrainingValidationHighlights();
    }

    async function loadClinicConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        currentConfig = data.config || {};

        // Preenche campos
        document.getElementById('cfgClinicName').value = currentConfig.clinic_name || '';
        if (currentConfig.clinic_name) {
          document.getElementById('topClinicNameBadge').innerText = currentConfig.clinic_name;
        }
        if (currentConfig.doctor_name) document.getElementById('cfgDoctorName').value = currentConfig.doctor_name;
        if (currentConfig.doctor_cro) document.getElementById('cfgDoctorCro').value = currentConfig.doctor_cro;
        if (currentConfig.tone) document.getElementById('cfgTone').value = currentConfig.tone;
        if (currentConfig.prices_note) document.getElementById('cfgPricesNote').value = currentConfig.prices_note;
        if (currentConfig.payment_methods) document.getElementById('cfgPaymentMethods').value = currentConfig.payment_methods;
        if (currentConfig.insurance) document.getElementById('cfgInsurance').value = currentConfig.insurance;
        document.getElementById('cfgHours').value = currentConfig.hours || '';
        if (document.getElementById('cfgHolidayService')) {
          document.getElementById('cfgHolidayService').checked = !!currentConfig.holiday_service;
        }
        if (currentConfig.delay_tolerance) document.getElementById('cfgDelayTolerance').value = currentConfig.delay_tolerance;
        if (currentConfig.address) document.getElementById('cfgAddress').value = currentConfig.address;
        if (currentConfig.parking) document.getElementById('cfgParking').value = currentConfig.parking;
        if (currentConfig.clinical_rules) document.getElementById('cfgClinicalRules').value = currentConfig.clinical_rules;
        if (currentConfig.emergency_contact) document.getElementById('cfgEmergencyContact').value = currentConfig.emergency_contact;
        if (currentConfig.extra) document.getElementById('cfgExtra').value = currentConfig.extra;

        // Fallback para dúvidas não cadastradas (campos vazios)
        const fallbackRadios = document.getElementsByName('unfilledFallbackRadio');
        for (const r of fallbackRadios) {
          if (r.value === (currentConfig.unfilled_fallback || 'avaliacao')) {
            r.checked = true;
          }
        }

        // Toggle pós-agendamento de envio de contato secundário
        const sendSecEl = document.getElementById('cfgSendSecondaryContact');
        if (sendSecEl) {
          sendSecEl.checked = !!currentConfig.send_secondary_contact_on_finish;
        }

        // Estratégia de preço (radios)
        const radios = document.getElementsByName('priceStrategyRadio');
        for (const r of radios) {
          if (r.value === (currentConfig.price_strategy || 'avaliacao')) {
            r.checked = true;
          }
        }

        // Avaliação Inicial / Consulta
        const evalDurEl = document.getElementById('cfgInitEvalDuration');
        const evalPriceEl = document.getElementById('cfgInitEvalPrice');
        const evalDetailsEl = document.getElementById('cfgInitEvalDetails');
        if (currentConfig.initial_consultation) {
          const ic = currentConfig.initial_consultation;
          if (evalDurEl) evalDurEl.value = ic.duration || '';
          if (evalPriceEl) evalPriceEl.value = ic.price || '';
          if (evalDetailsEl) evalDetailsEl.value = ic.details || '';
        } else {
          if (evalDurEl) evalDurEl.value = '';
          if (evalPriceEl) evalPriceEl.value = '';
          if (evalDetailsEl) evalDetailsEl.value = '';
        }

        // Renderiza listas verticais detalhadas de procedimentos e atualiza destaques
        renderProceduresLists(currentConfig.procedure_items);
        updateCrucialTrainingLockUI();
        updateTrainingValidationHighlights();

      } catch (err) {
        console.error("Erro ao carregar configurações da clínica:", err);
      }
    }

    async function saveClinicConfig() {
      const btn = document.getElementById('btnSaveConfig');
      const btnText = document.getElementById('btnSaveConfigText');

      if (btnText) btnText.innerText = "Salvando na IA...";
      if (btn) btn.disabled = true;

      // Colhe procedimentos de todas as linhas verticais
      const procedureItems = [];
      let hasInvalidCheckedProc = false;
      document.querySelectorAll('.proc-row').forEach(row => {
        const isChecked = row.querySelector('.proc-checkbox').checked;
        const name = row.querySelector('.proc-name').value.trim();
        const duration = row.querySelector('.proc-duration').value.trim();
        const price = row.querySelector('.proc-price')?.value.trim();
        const note = row.querySelector('.proc-note').value.trim();
        const category = row.dataset.category || 'odonto';

        if (isChecked && (!name || !duration)) {
          hasInvalidCheckedProc = true;
        }

        if (name || isChecked) {
          procedureItems.push({
            name,
            checked: isChecked,
            duration: duration || undefined,
            price: price || undefined,
            note: note || undefined,
            category
          });
        }
      });

      // Colhe estratégia de preço
      let priceStrategy = 'avaliacao';
      const radios = document.getElementsByName('priceStrategyRadio');
      for (const r of radios) {
        if (r.checked) priceStrategy = r.value;
      }

      // Colhe fallback para dúvidas não cadastradas
      let unfilledFallback = 'avaliacao';
      const fallbackRadios = document.getElementsByName('unfilledFallbackRadio');
      for (const r of fallbackRadios) {
        if (r.checked) unfilledFallback = r.value;
      }

      const holidayService = document.getElementById('cfgHolidayService')?.checked || false;
      const sendSecondaryContact = document.getElementById('cfgSendSecondaryContact')?.checked || false;

      const initialConsultation = {
        duration: document.getElementById('cfgInitEvalDuration')?.value.trim() || undefined,
        price: document.getElementById('cfgInitEvalPrice')?.value.trim() || undefined,
        details: document.getElementById('cfgInitEvalDetails')?.value.trim() || undefined,
      };

      const clinicNameVal = document.getElementById('cfgClinicName').value.trim();

      const configPayload = {
        clinic_name: clinicNameVal,
        doctor_name: document.getElementById('cfgDoctorName').value.trim() || undefined,
        doctor_cro: document.getElementById('cfgDoctorCro').value.trim() || undefined,
        tone: document.getElementById('cfgTone').value,
        unfilled_fallback: unfilledFallback,
        send_secondary_contact_on_finish: sendSecondaryContact,
        initial_consultation: initialConsultation,
        procedure_items: procedureItems,
        procedures: procedureItems.filter(p => p.checked && p.name).map(p => p.name),
        price_strategy: priceStrategy,
        prices_note: document.getElementById('cfgPricesNote').value.trim() || undefined,
        payment_methods: document.getElementById('cfgPaymentMethods').value.trim() || undefined,
        insurance: document.getElementById('cfgInsurance').value.trim() || undefined,
        hours: document.getElementById('cfgHours').value.trim() || undefined,
        holiday_service: holidayService,
        delay_tolerance: document.getElementById('cfgDelayTolerance').value.trim() || undefined,
        address: document.getElementById('cfgAddress').value.trim() || undefined,
        parking: document.getElementById('cfgParking').value.trim() || undefined,
        clinical_rules: document.getElementById('cfgClinicalRules').value.trim() || undefined,
        emergency_contact: document.getElementById('cfgEmergencyContact').value.trim() || undefined,
        extra: document.getElementById('cfgExtra').value.trim() || undefined,
      };

      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ config: configPayload })
        });
        const data = await res.json();

        if (data.success) {
          currentConfig = configPayload;
          if (configPayload.clinic_name) {
            document.getElementById('topClinicNameBadge').innerText = configPayload.clinic_name;
          }
          updateCrucialTrainingLockUI();
          updateTrainingValidationHighlights();

          if (isCrucialTrainingComplete() && !hasInvalidCheckedProc) {
            showToast("✅ Treinamento salvo! Chat (IA) e Agenda liberados!", "emerald");
          } else {
            showToast("Salvo! Preencha os campos em vermelho para liberar o Chat e a Agenda.", "amber");
            const mainConfig = document.getElementById('viewConfig');
            if (mainConfig) mainConfig.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          alert("Erro ao salvar: " + (data.error || "Tente novamente"));
        }
      } catch (err) {
        alert("Erro na requisição ao salvar dados da clínica");
      } finally {
        if (btnText) btnText.innerText = "Salvar Alterações na IA";
        if (btn) btn.disabled = false;
      }
    }

    // 7. LOGOUT
    async function handleLogout() {
      if (confirm("Deseja sair do painel da clínica?")) {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
          window.location.href = '/login';
        }
      }
    }

    // 9. POLLING DE SINCRONIZAÇÃO EM SEGUNDO PLANO (1 ROW READ)
    function startPolling() {
      if (pollingInterval) clearInterval(pollingInterval);
      pollingInterval = setInterval(checkSync, 3500);
    }

    async function checkSync() {
      if (isPollingBusy || document.hidden) return;
      isPollingBusy = true;
      try {
        const p = activePhone || '';
        const url = \`/api/sync-check?last_id=\${highestKnownMsgId}&active_phone=\${encodeURIComponent(p)}&active_msg_id=\${highestActiveMsgId}\`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.server_time) syncServerTime(data.server_time);

        if (activePhone && typeof data.active_ai_paused === 'boolean') {
          if (activeAiPaused !== data.active_ai_paused) {
            activeAiPaused = data.active_ai_paused;
            const target = conversations.find(c => c.contact_wa_id === activePhone);
            if (target) target.ai_paused = data.active_ai_paused ? 1 : 0;
            updateAiStatusUI();
            renderConversationList();
          }
        }

        if (data.has_new_global) {
          highestKnownMsgId = data.latest_id;
          await loadConversations(true);
        }

        if (data.has_new_active && activePhone) {
          highestActiveMsgId = data.active_latest_id;
          await loadActiveMessages();
        }
      } catch (err) {
        // Silêncio em polling
      } finally {
        isPollingBusy = false;
      }
    }

    // 10. UTILITÁRIOS
    function showToast(msg, color = "emerald") {
      const toast = document.getElementById('toastNotification');
      const toastMsg = document.getElementById('toastMsg');
      const toastIcon = document.getElementById('toastIcon');

      if (!toast || !toastMsg) return;

      toastMsg.innerText = msg;
      if (color === "purple") {
        toastIcon.className = "fa-solid fa-wand-magic-sparkles text-purple-400";
      } else {
        toastIcon.className = "fa-solid fa-circle-check text-emerald-400";
      }

      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 3000);
    }

    // -------------------------------------------------------------------------
    // 10. SINCRONIZAÇÃO E FORMATAÇÃO DE DATA E HORA (ESTILO WHATSAPP 24H BRASÍLIA)
    // -------------------------------------------------------------------------
    let serverClockDelta = 0;
    let liveClockInterval = null;

    function syncServerTime(serverIsoString) {
      if (!serverIsoString) return;
      const srv = new Date(serverIsoString).getTime();
      if (!isNaN(srv)) {
        serverClockDelta = srv - Date.now();
        updateLiveBrasiliaClock();
      }
    }

    function getNowBrasilia() {
      return new Date(Date.now() + serverClockDelta);
    }

    function parseIsoDate(isoString) {
      if (!isoString) return null;
      let s = String(isoString).trim();
      if (!s) return null;
      if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T');
      if (!s.endsWith('Z') && !/[+-]\\d{2}:?\\d{2}$/.test(s)) s += 'Z';
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    function getBrasiliaDateParts(d) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const ymd = formatter.format(d);
      const [year, month, day] = ymd.split('-').map(Number);
      return { key: ymd, dateObj: new Date(year, month - 1, day) };
    }

    function getBrasiliaDateKey(d) {
      return getBrasiliaDateParts(d).key;
    }

    function capitalizeFirst(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function formatMessageTime(isoString) {
      const d = parseIsoDate(isoString);
      if (!d) return '';
      return d.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    function formatConversationItemTime(isoString) {
      const d = parseIsoDate(isoString);
      if (!d) return '';
      const now = getNowBrasilia();
      const bMsgDate = getBrasiliaDateParts(d);
      const bNowDate = getBrasiliaDateParts(now);

      const diffDays = Math.round((bNowDate.dateObj.getTime() - bMsgDate.dateObj.getTime()) / 86400000);

      if (diffDays <= 0) {
        return d.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } else if (diffDays === 1) {
        return 'Ontem';
      } else if (diffDays > 1 && diffDays < 7) {
        const weekday = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' });
        return capitalizeFirst(weekday.replace('.', ''));
      } else {
        return d.toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        });
      }
    }

    function getWhatsAppDateDividerLabel(d) {
      if (!d || isNaN(d.getTime())) return '';
      const now = getNowBrasilia();
      const bMsgDate = getBrasiliaDateParts(d);
      const bNowDate = getBrasiliaDateParts(now);

      const diffDays = Math.round((bNowDate.dateObj.getTime() - bMsgDate.dateObj.getTime()) / 86400000);

      if (diffDays <= 0) {
        return 'Hoje';
      } else if (diffDays === 1) {
        return 'Ontem';
      } else if (diffDays > 1 && diffDays < 7) {
        const weekday = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' });
        return capitalizeFirst(weekday);
      } else {
        return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    function updateLiveBrasiliaClock() {
      const now = getNowBrasilia();

      const timeStr = now.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const shortTimeStr = now.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const weekday = now.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'short',
      }).replace('.', '');
      const dayMonth = now.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
      });
      const fullDateStr = \`\${capitalizeFirst(weekday)}, \${dayMonth}\`;

      const elClock = document.getElementById('liveBrasiliaClock');
      if (elClock) elClock.innerText = timeStr;

      const elDate = document.getElementById('liveBrasiliaDate');
      if (elDate) elDate.innerText = fullDateStr;
    }

    function startLiveBrasiliaSync() {
      updateLiveBrasiliaClock();
      if (!liveClockInterval) {
        liveClockInterval = setInterval(updateLiveBrasiliaClock, 1000);
      }
      fetchServerTime();
    }

    async function fetchServerTime() {
      try {
        const res = await fetch('/api/time');
        const data = await res.json();
        if (data.server_time) {
          syncServerTime(data.server_time);
        }
      } catch (e) {
        // Fallback para relógio local com timezone America/Sao_Paulo
      }
    }

    const formatTime = formatMessageTime;

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Inicializa ao carregar DOM
    window.addEventListener('DOMContentLoaded', init);
  </script>
</body>
</html>
`;
