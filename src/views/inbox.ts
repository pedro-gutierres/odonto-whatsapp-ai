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

        <!-- Opção 2: Agenda & Pré-Agendamentos -->
        <button onclick="selectNavigationTab('agenda', 'Agenda & Pré-Agendamentos', 'fa-regular fa-calendar-check', 'sky')" 
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-left transition group">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm group-hover:scale-105 transition-transform">
              <i class="fa-regular fa-calendar-check"></i>
            </div>
            <div>
              <span class="text-xs font-bold text-slate-900 dark:text-white block">Agenda & Consultas</span>
              <span class="text-[10px] text-slate-500 dark:text-slate-400">CRM de pré-agendamentos</span>
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

    <!-- LADO DIREITO: DARK MODE, SIMULADOR, NOVO TESTE, USUÁRIO -->
    <div class="flex items-center gap-2.5">
      
      <!-- BOTÃO TOGGLE DARK/LIGHT MODE -->
      <button onclick="toggleTheme()" title="Alternar Modo Escuro/Claro"
        class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-xs transition">
        <i id="themeIcon" class="fa-solid fa-moon"></i>
      </button>

      <!-- LINK DO SIMULADOR -->
      <a href="/simulador" target="_blank" title="Abrir Simulador de Paciente"
        class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 text-xs font-medium border border-slate-200 dark:border-slate-700/60 transition">
        <i class="fa-solid fa-mobile-screen-button text-emerald-500"></i>
        <span>Simulador</span>
      </a>

      <!-- BOTÃO NOVO PACIENTE -->
      <button onclick="openNewPatientModal()" 
        class="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white flex items-center gap-1.5 transition shadow-sm">
        <i class="fa-solid fa-user-plus text-xs"></i>
        <span class="hidden sm:inline">Novo Teste</span>
      </button>

      <!-- USUÁRIO LOGADO & LOGOUT -->
      <div class="pl-2 border-l border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold flex items-center justify-center text-xs">
          <i class="fa-solid fa-user-doctor"></i>
        </div>
        <div class="hidden xl:block text-left">
          <span class="text-xs font-bold text-slate-900 dark:text-white block leading-none">Recepção</span>
          <span class="text-[10px] text-slate-400 font-medium">admin@clinica.com</span>
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
          <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-bolt text-[10px]"></i> IA Ativa 24h</span>
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
          <input type="text" id="messageInput" disabled placeholder="Escreva sua mensagem..." 
            class="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#008069] disabled:opacity-50 transition">
          <button type="submit" id="sendBtn" disabled 
            class="px-4 py-2.5 rounded-xl bg-[#008069] hover:bg-[#006a57] disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm">
            <span>Enviar</span>
            <i class="fa-solid fa-paper-plane text-[10px]"></i>
          </button>
        </form>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 px-1">
          💡 Ao enviar uma mensagem manual, a IA é pausada para você assumir o controle e só voltará a responder se for reativada.
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

        <!-- TESTAR COMO ESTE PACIENTE (SIMULAÇÃO) -->
        <div class="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Testar como este paciente</span>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Simule uma nova pergunta vinda deste número para ver a IA respondendo.</p>
          <textarea id="simulateMsgInput" rows="2" placeholder="Ex: Qual o preço do clareamento?" 
            class="w-full p-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-[#008069]"></textarea>
          <button onclick="handleSimulateForCurrentPatient()" id="btnSimulateCurrent" disabled
            class="w-full py-1.5 px-3 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-play text-[10px]"></i>
            <span>Simular Envio do Paciente</span>
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
  <!-- VIEW 2: AGENDA & PRÉ-AGENDAMENTOS (CRM DE CONSULTAS)                    -->
  <!-- ======================================================================= -->
  <main id="viewAgenda" class="flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 hidden bg-slate-50 dark:bg-[#0b0f17]">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- TOPO DA AGENDA: RESUMO & NOVO AGENDAMENTO -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Agenda de Pacientes & Triagem</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gerencie os pedidos de consulta captados automaticamente pela IA e confirmados pela equipe.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="loadAppointments()" class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition" title="Atualizar">
            <i class="fa-solid fa-rotate-right" id="agendaRefreshIcon"></i>
          </button>
          <button onclick="openAppointmentModal()" class="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition">
            <i class="fa-solid fa-calendar-plus"></i>
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      <!-- CARDS DE MÉTRICAS RÁPIDAS -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Total</span>
            <i class="fa-solid fa-users text-slate-400 text-sm"></i>
          </div>
          <div class="text-2xl font-black text-slate-900 dark:text-white" id="metricTotal">0</div>
          <span class="text-[10px] text-slate-400">Pacientes cadastrados</span>
        </div>

        <div class="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between text-amber-500 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Pré-Agendados</span>
            <i class="fa-solid fa-clock-rotate-left text-sm"></i>
          </div>
          <div class="text-2xl font-black text-amber-600 dark:text-amber-400" id="metricPre">0</div>
          <span class="text-[10px] text-slate-400">Pela IA (Aguardando)</span>
        </div>

        <div class="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between text-emerald-500 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Confirmados</span>
            <i class="fa-solid fa-calendar-check text-sm"></i>
          </div>
          <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400" id="metricConfirmed">0</div>
          <span class="text-[10px] text-slate-400">Na grade da clínica</span>
        </div>

        <div class="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between text-teal-500 mb-2">
            <span class="text-xs font-bold uppercase tracking-wider">Estimado</span>
            <i class="fa-solid fa-hand-holding-dollar text-sm"></i>
          </div>
          <div class="text-2xl font-black text-teal-600 dark:text-teal-400" id="metricValue">R$ 0</div>
          <span class="text-[10px] text-slate-400">Potencial de faturamento</span>
        </div>
      </div>

      <!-- TABELA DE AGENDAMENTOS COM FILTROS -->
      <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <!-- FILTROS -->
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative w-full sm:w-72">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="appointmentSearchInput" oninput="filterAppointments()" placeholder="Filtrar por nome ou procedimento..."
              class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#008069]">
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <select id="appointmentStatusFilter" onchange="filterAppointments()"
              class="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-white font-medium focus:outline-none">
              <option value="todos">Todos os Status</option>
              <option value="pre_agendado">Apenas Pré-Agendados</option>
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
                <th class="py-3 px-4">Observações</th>
                <th class="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody id="appointmentTableBody" class="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              <tr>
                <td colspan="6" class="p-8 text-center text-slate-400">Carregando agendamentos...</td>
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
      <form id="clinicConfigForm" onsubmit="event.preventDefault(); saveClinicConfig();" class="space-y-6">

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
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nome Oficial da Clínica</label>
              <input type="text" id="cfgClinicName" placeholder="Ex: Clínica Sorriso & Estética Integrada" required
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
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
                <label class="block font-semibold text-slate-700 dark:text-slate-300">Horários e Dias de Atendimento</label>
                <label class="flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  <input type="checkbox" id="cfgHolidayService" class="rounded text-[#008069] focus:ring-0">
                  <span>Atende em Feriados</span>
                </label>
              </div>
              <textarea id="cfgHours" rows="6" placeholder="Ex:&#10;Segunda a Sexta: das 08:00 às 19:30&#10;Sábados: das 08:00 às 13:00&#10;Domingos: Fechado"
                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] leading-relaxed"></textarea>
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
  <!-- MODAL 1: NOVO PACIENTE SIMULADO                                         -->
  <!-- ======================================================================= -->
  <div id="newPatientModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
    <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-900 dark:text-white">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-sm font-bold flex items-center gap-2">
          <i class="fa-solid fa-user-plus text-emerald-500"></i>
          <span>Simular Entrada de Novo Paciente</span>
        </h3>
        <button onclick="closeNewPatientModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form onsubmit="handleCreateNewPatient(event)" class="space-y-3 pt-4 text-xs">
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nome do Paciente</label>
          <input type="text" id="newPatientName" placeholder="Ex: Camila Rossi" required
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">WhatsApp (com DDD)</label>
          <input type="text" id="newPatientPhone" placeholder="Ex: 5511977778888" required
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Primeira Mensagem do Paciente</label>
          <textarea id="newPatientText" rows="2" placeholder="Ex: Olá! Gostaria de saber os horários para botox nesta sexta-feira." required
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]"></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeNewPatientModal()" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold">Iniciar Conversa</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ======================================================================= -->
  <!-- MODAL 2: NOVO AGENDAMENTO / PRÉ-AGENDAMENTO                             -->
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
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Procedimento de Interesse</label>
          <input type="text" id="appProcedure" required placeholder="Ex: Botox / Toxina Botulínica"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Data & Período Sugerido</label>
          <input type="text" id="appScheduledAt" required placeholder="Ex: Quinta-feira às 14:00"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Status</label>
          <select id="appStatus" class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none">
            <option value="pre_agendado">Pré-Agendado (Triagem)</option>
            <option value="confirmado">Confirmado na Grade</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Observações Clínicas / Preferências</label>
          <input type="text" id="appNotes" placeholder="Ex: Paciente tem preferência de horário matutino"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeAppointmentModal()" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold">Salvar Agendamento</button>
        </div>
      </form>
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
        loadClinicConfig();
      } else {
        viewChat.classList.remove('hidden');
      }
    }

    // 3. INICIALIZAÇÃO GERAL
    async function init() {
      initTheme();
      startLiveBrasiliaSync();
      await loadConversations(false);
      await loadAppointments();
      await loadClinicConfig();
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

      container.innerHTML = filtered.map(c => {
        const isSelected = c.contact_wa_id === activePhone;
        const initial = (c.contact_name || c.contact_wa_id)[0].toUpperCase();
        const timeStr = formatConversationItemTime(c.last_created_at);
        const isAiOn = c.ai_paused === 0;

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
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#111827] \${
                isAiOn ? 'bg-emerald-500' : 'bg-amber-500'
              }"></span>
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
                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded \${
                  isAiOn 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' 
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                }">
                  \${isAiOn ? 'IA Ativa' : 'IA Pausada'}
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
      document.getElementById('messageInput').placeholder = "Escreva sua mensagem...";
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('btnScheduleThisPatient').disabled = false;
      document.getElementById('btnSimulateCurrent').disabled = false;
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
                  \${isHumanAgent ? '👤 Recepcionista (Atendimento Manual)' : '✨ Secretária IA (Claude 24h)'}
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
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, text })
        });

        activeAiPaused = true;
        updateAiStatusUI();
        await loadActiveMessages();
        await loadConversations(true);
      } catch (err) {
        alert("Erro ao enviar mensagem");
      }
    }

    async function handleToggleAi() {
      if (!activePhone) return;
      const targetState = !activeAiPaused;

      try {
        await fetch('/api/toggle-ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, paused: targetState })
        });

        activeAiPaused = targetState;
        updateAiStatusUI();
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
      document.getElementById('appProcedure').value = "Avaliação / Consulta Inicial";
      document.getElementById('appScheduledAt').value = "A combinar com o paciente";

      document.getElementById('appointmentModal').classList.remove('hidden');
    }

    async function handleSimulateForCurrentPatient() {
      const input = document.getElementById('simulateMsgInput');
      const text = input.value.trim();
      if (!text || !activePhone) return;

      input.value = '';
      const target = conversations.find(c => c.contact_wa_id === activePhone);
      const name = target?.contact_name || activePhone;

      try {
        await fetch('/api/simulate-patient', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, name, text })
        });
        showToast("Mensagem simulada enviada!", "emerald");
        setTimeout(async () => {
          await loadActiveMessages();
          await loadConversations(true);
        }, 1500);
      } catch (err) {
        alert("Erro ao simular mensagem");
      }
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

    // 5. GESTÃO DA AGENDA DE CONSULTAS & PRÉ-AGENDAMENTOS
    async function loadAppointments() {
      const icon = document.getElementById('agendaRefreshIcon');
      if (icon) icon.classList.add('fa-spin');
      try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        appointments = data.appointments || [];
        renderAppointmentsTable();
        updateAppointmentMetrics();

        const badge = document.getElementById('menuAppointmentsBadge');
        if (badge) badge.innerText = appointments.length;
      } catch (err) {
        console.error("Erro ao carregar agenda:", err);
      } finally {
        if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 400);
      }
    }

    function renderAppointmentsTable() {
      const tbody = document.getElementById('appointmentTableBody');
      const search = (document.getElementById('appointmentSearchInput')?.value || '').toLowerCase().trim();
      const filter = document.getElementById('appointmentStatusFilter')?.value || 'todos';

      const filtered = appointments.filter(a => {
        const matchSearch = (a.patient_name || '').toLowerCase().includes(search) || 
                            (a.procedure || '').toLowerCase().includes(search) || 
                            (a.contact_wa_id || '').includes(search);
        const matchStatus = filter === 'todos' || a.status === filter;
        return matchSearch && matchStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhum agendamento encontrado para os filtros selecionados.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(a => {
        let statusBadge = '';
        if (a.status === 'pre_agendado') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60">Pré-Agendado (IA)</span>';
        } else if (a.status === 'confirmado') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800/60">Confirmado</span>';
        } else if (a.status === 'concluido') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-400 font-bold text-[10px] border border-sky-200 dark:border-sky-800/60">Concluído</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">Cancelado</span>';
        }

        return \`
          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
            <td class="py-3 px-4">
              <div class="font-bold text-slate-900 dark:text-white">\${escapeHtml(a.patient_name)}</div>
              <div class="text-[10px] text-slate-400 font-mono">\${escapeHtml(a.contact_wa_id)}</div>
            </td>
            <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
              \${escapeHtml(a.procedure || 'Avaliação Inicial')}
            </td>
            <td class="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
              <i class="fa-regular fa-clock mr-1 text-slate-400"></i>\${escapeHtml(a.scheduled_at)}
            </td>
            <td class="py-3 px-4">
              \${statusBadge}
            </td>
            <td class="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
              \${escapeHtml(a.notes || '-')}
            </td>
            <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
              <button onclick="goToChatWithPatient('\${a.contact_wa_id}')" title="Abrir conversa no WhatsApp" 
                class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400">
                <i class="fa-brands fa-whatsapp text-sm"></i>
              </button>
              <select onchange="handleUpdateAppointmentStatus(\${a.id}, this.value)" 
                class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] rounded-lg px-2 py-1 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none">
                <option value="pre_agendado" \${a.status === 'pre_agendado' ? 'selected' : ''}>Pré-Agendado</option>
                <option value="confirmado" \${a.status === 'confirmado' ? 'selected' : ''}>Confirmar</option>
                <option value="concluido" \${a.status === 'concluido' ? 'selected' : ''}>Concluir</option>
                <option value="cancelado" \${a.status === 'cancelado' ? 'selected' : ''}>Cancelar</option>
              </select>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function updateAppointmentMetrics() {
      const total = appointments.length;
      const pre = appointments.filter(a => a.status === 'pre_agendado').length;
      const confirmed = appointments.filter(a => a.status === 'confirmado').length;

      document.getElementById('metricTotal').innerText = total;
      document.getElementById('metricPre').innerText = pre;
      document.getElementById('metricConfirmed').innerText = confirmed;

      // Estimativa média de R$ 850 por procedimento em Estética/Odonto
      const val = (pre + confirmed) * 850;
      document.getElementById('metricValue').innerText = 'R$ ' + val.toLocaleString('pt-BR');
    }

    function filterAppointments() {
      renderAppointmentsTable();
    }

    async function handleUpdateAppointmentStatus(id, newStatus) {
      try {
        await fetch('/api/appointments', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus })
        });
        const target = appointments.find(a => a.id === id);
        if (target) target.status = newStatus;
        updateAppointmentMetrics();
        renderAppointmentsTable();
        showToast("Status da consulta atualizado!", "emerald");
      } catch (err) {
        alert("Erro ao alterar status");
      }
    }

    function goToChatWithPatient(phone) {
      selectNavigationTab('chat', 'Atendimento WhatsApp', 'fa-solid fa-comments', 'emerald');
      selectChat(phone);
    }

    function openAppointmentModal() {
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
      const scheduledAt = document.getElementById('appScheduledAt').value.trim();
      const status = document.getElementById('appStatus').value;
      const notes = document.getElementById('appNotes').value.trim();

      if (!patientName || !contactWaId || !scheduledAt) return;

      closeAppointmentModal();

      try {
        await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ patientName, contactWaId, procedure, scheduledAt, status, notes })
        });
        await loadAppointments();
        showToast("Agendamento salvo com sucesso!", "emerald");
      } catch (err) {
        alert("Erro ao salvar agendamento");
      }
    }

    // 6. QUESTIONÁRIO DE CONFIGURAÇÃO & TREINAMENTO DA IA (ODONTO & ESTÉTICA REFINADO)
    function createProcedureRowHtml(proc, category) {
      const isChecked = proc.checked !== false;
      const name = proc.name || '';
      const duration = proc.duration || '';
      const note = proc.note || '';

      return \`
        <div class="proc-row flex flex-col md:flex-row md:items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition" data-category="\${category}">
          <!-- Checkbox + Nome -->
          <div class="flex items-center gap-2 md:w-5/12 min-w-0 md:pt-1.5">
            <input type="checkbox" class="proc-checkbox rounded text-[#008069] focus:ring-0 w-4 h-4 shrink-0 cursor-pointer" \${isChecked ? 'checked' : ''}>
            <input type="text" class="proc-name w-full bg-transparent font-bold text-xs text-slate-800 dark:text-slate-100 border-b border-transparent hover:border-slate-300 focus:border-[#008069] focus:outline-none px-1" value="\${escapeHtml(name)}" placeholder="Nome do procedimento">
          </div>
          
          <!-- Duração -->
          <div class="md:w-3/12 md:pt-0.5">
            <input type="text" class="proc-duration w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#008069]" placeholder="Duração (ex: 45 min)" value="\${escapeHtml(duration)}">
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

      const newRowHtml = createProcedureRowHtml({ name: '', checked: true, duration: '', note: '' }, category);
      container.insertAdjacentHTML('beforeend', newRowHtml);

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
    }

    async function loadClinicConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        currentConfig = data.config || {};

        // Preenche campos
        if (currentConfig.clinic_name) {
          document.getElementById('cfgClinicName').value = currentConfig.clinic_name;
          document.getElementById('topClinicNameBadge').innerText = currentConfig.clinic_name;
        }
        if (currentConfig.doctor_name) document.getElementById('cfgDoctorName').value = currentConfig.doctor_name;
        if (currentConfig.doctor_cro) document.getElementById('cfgDoctorCro').value = currentConfig.doctor_cro;
        if (currentConfig.tone) document.getElementById('cfgTone').value = currentConfig.tone;
        if (currentConfig.prices_note) document.getElementById('cfgPricesNote').value = currentConfig.prices_note;
        if (currentConfig.payment_methods) document.getElementById('cfgPaymentMethods').value = currentConfig.payment_methods;
        if (currentConfig.insurance) document.getElementById('cfgInsurance').value = currentConfig.insurance;
        if (currentConfig.hours) document.getElementById('cfgHours').value = currentConfig.hours;
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

        // Renderiza listas verticais detalhadas de procedimentos
        renderProceduresLists(currentConfig.procedure_items);

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
      document.querySelectorAll('.proc-row').forEach(row => {
        const isChecked = row.querySelector('.proc-checkbox').checked;
        const name = row.querySelector('.proc-name').value.trim();
        const duration = row.querySelector('.proc-duration').value.trim();
        const note = row.querySelector('.proc-note').value.trim();
        const category = row.dataset.category || 'odonto';

        if (name) {
          procedureItems.push({
            name,
            checked: isChecked,
            duration: duration || undefined,
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

      const configPayload = {
        clinic_name: document.getElementById('cfgClinicName').value.trim() || "Clínica Sorriso & Estética",
        doctor_name: document.getElementById('cfgDoctorName').value.trim() || undefined,
        doctor_cro: document.getElementById('cfgDoctorCro').value.trim() || undefined,
        tone: document.getElementById('cfgTone').value,
        unfilled_fallback: unfilledFallback,
        send_secondary_contact_on_finish: sendSecondaryContact,
        procedure_items: procedureItems,
        procedures: procedureItems.filter(p => p.checked).map(p => p.name),
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
          document.getElementById('topClinicNameBadge').innerText = configPayload.clinic_name;
          showToast("Configurações salvas e IA treinada com sucesso!", "purple");
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

    // 7. MODAIS & SIMULADOR
    function openNewPatientModal() {
      document.getElementById('newPatientModal').classList.remove('hidden');
    }

    function closeNewPatientModal() {
      document.getElementById('newPatientModal').classList.add('hidden');
    }

    async function handleCreateNewPatient(e) {
      e.preventDefault();
      const name = document.getElementById('newPatientName').value.trim();
      const phone = document.getElementById('newPatientPhone').value.trim();
      const text = document.getElementById('newPatientText').value.trim();

      if (!name || !phone || !text) return;
      closeNewPatientModal();

      await fetch('/api/simulate-patient', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, phone, text })
      });

      showToast("Paciente simulado criado!", "emerald");

      setTimeout(async () => {
        await loadConversations();
        selectChat(phone);
      }, 1500);
    }

    // 8. LOGOUT
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
            updateAiStatusUI();
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
      if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
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
