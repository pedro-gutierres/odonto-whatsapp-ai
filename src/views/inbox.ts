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
      
      <!-- SUB-BARRA DA CONVERSA SELECIONADA -->
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

        <!-- BOTÃO DE CONTROLE DA IA (HUMAN TAKEOVER) -->
        <div class="flex items-center gap-2">
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
          <input type="text" id="messageInput" disabled placeholder="Selecione um paciente para conversar..." 
            class="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#008069] disabled:opacity-50 transition">
          <button type="submit" id="sendBtn" disabled 
            class="px-4 py-2.5 rounded-xl bg-[#008069] hover:bg-[#006a57] disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm">
            <span>Enviar</span>
            <i class="fa-solid fa-paper-plane text-[10px]"></i>
          </button>
        </form>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 px-1">
          Dica: Ao enviar mensagem manual, a IA pausa neste chat para você assumir o controle total.
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
      
      <!-- TOPO COM AÇÃO DE SALVAR -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20 backdrop-blur-md">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Treinamento & Regras da Secretária IA</h2>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personalize o cérebro da sua IA para Odontologia & Estética. Todas as alterações entram em vigor instantaneamente no WhatsApp.
          </p>
        </div>
        <div class="flex items-center gap-2.5">
          <a href="/simulador" target="_blank" class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition">
            <i class="fa-solid fa-mobile-screen text-emerald-500"></i>
            <span>Simulador</span>
          </a>
          <button onclick="saveClinicConfig()" id="btnSaveConfig" class="px-5 py-2 rounded-xl bg-gradient-to-r from-[#008069] to-emerald-600 hover:from-[#006a57] hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition">
            <i class="fa-solid fa-floppy-disk"></i>
            <span id="btnSaveConfigText">Salvar Alterações</span>
          </button>
        </div>
      </div>

      <!-- FORMULÁRIO COMPLETO DO QUESTIONÁRIO -->
      <form id="clinicConfigForm" onsubmit="event.preventDefault(); saveClinicConfig();" class="space-y-6">

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
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Doutor(a) Responsável Técnico</label>
              <input type="text" id="cfgDoctorName" placeholder="Ex: Dra. Fernanda Alves"
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Registro Profissional (CRO / CRM)</label>
              <input type="text" id="cfgDoctorCro" placeholder="Ex: CRO-SP 102.450 / Harmonização Orofacial"
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tom de Voz da Secretária IA</label>
              <select id="cfgTone" 
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069] font-medium">
                <option value="acolhedor">🌸 Acolhedor & Gentil (Caloroso, empático, ideal para clínica geral)</option>
                <option value="sofisticado">✨ Sofisticado & Exclusivo (Boutique, foco em estética de alto padrão)</option>
                <option value="clinico">🩺 Clínico & Técnico (Objetivo, seguro, rigor científico e formal)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- CARD 2: CATÁLOGO DE PROCEDIMENTOS (ODONTO + ESTÉTICA + ADICIONAR PERSONALIZADO) -->
        <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-white">Catálogo de Procedimentos & Serviços Oferecidos</h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Marque o que sua clínica realiza e adicione serviços customizados com duração e regras.</p>
              </div>
            </div>
          </div>

          <!-- GRUPO ODONTOLOGIA -->
          <div>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2.5">
              <i class="fa-solid fa-tooth"></i> Especialidades Odontológicas
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs" id="odontoCheckboxes">
              <!-- Checkboxes Odonto via JS -->
            </div>
          </div>

          <!-- GRUPO ESTÉTICA OROFACIAL & CORPORAL -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span class="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mb-2.5">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Estética Avançada & Harmonização Orofacial
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs" id="esteticaCheckboxes">
              <!-- Checkboxes Estética via JS -->
            </div>
          </div>

          <!-- ADICIONAR NOVO PROCEDIMENTO PERSONALIZADO -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              <i class="fa-solid fa-plus-circle text-slate-400 mr-1"></i> Adicionar Outro Procedimento Personalizado
            </span>
            
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div class="sm:col-span-5">
                <input type="text" id="customProcName" placeholder="Nome do procedimento (ex: Fios de PDO de Sustentação)"
                  class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none">
              </div>
              <div class="sm:col-span-3">
                <input type="text" id="customProcDuration" placeholder="Duração (ex: 45 min)"
                  class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none">
              </div>
              <div class="sm:col-span-3">
                <input type="text" id="customProcNote" placeholder="Obs / Regra (ex: avaliação prévia)"
                  class="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none">
              </div>
              <div class="sm:col-span-1 flex items-center">
                <button type="button" onclick="handleAddCustomProcedure()" 
                  class="w-full h-full py-1.5 bg-[#008069] hover:bg-[#006a57] text-white rounded-lg font-bold flex items-center justify-center text-xs transition">
                  <i class="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>

            <!-- LISTA DE PROCEDIMENTOS PERSONALIZADOS ADICIONADOS -->
            <div id="customProceduresList" class="mt-3 space-y-1.5 text-xs">
              <!-- Itens customizados renderizados dinamicamente -->
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
            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="avaliacao" checked class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">🔒 Apenas Avaliação Presencial (Padrão Ouro Recomendado)</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA nunca dá preços no WhatsApp. Explica com elegância que cada anatomia é única e induz o agendamento da consulta.</span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="a_partir_de" class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">📊 Informar Faixa Inicial ("A partir de R$...")</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA passa um valor base de referência mas reforça que a consulta presencial é indispensável para o plano definitivo.</span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:border-emerald-500 transition">
              <input type="radio" name="priceStrategyRadio" value="tabela_fixa" class="mt-0.5 text-[#008069] focus:ring-0">
              <div>
                <span class="font-bold text-slate-900 dark:text-white block">🏷️ Tabela Fixa Aberta</span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400">A IA informa diretamente os valores praticados para quem perguntar e já oferece horários para fechar.</span>
              </div>
            </label>
          </div>

          <div class="pt-2">
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300 text-xs">Observações Específicas de Preços / Custos da Avaliação</label>
            <input type="text" id="cfgPricesNote" placeholder="Ex: A avaliação custa R$ 150, mas esse valor é 100% dedutível caso o tratamento seja iniciado."
              class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#008069]">
          </div>
        </div>

        <!-- CARD 4: FORMAS DE PAGAMENTO, PARCELAMENTO & CONVÊNIOS -->
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
              <input type="text" id="cfgPaymentMethods" placeholder="Ex: Pix com 10% de desconto ou em até 12x sem juros no cartão de crédito"
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Política de Convênios & Reembolso</label>
              <input type="text" id="cfgInsurance" placeholder="Ex: Particular exclusivo. Emitimos nota fiscal detalhada e relatório para reembolso"
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
          </div>
        </div>

        <!-- CARD 5: HORÁRIOS, LOCALIZAÇÃO & ESTACIONAMENTO -->
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
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Horários de Atendimento</label>
              <input type="text" id="cfgHours" placeholder="Ex: Segunda a Sexta das 08h às 19h | Sábados das 08h às 13h"
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tolerância para Atrasos</label>
              <input type="text" id="cfgDelayTolerance" placeholder="Ex: Tolerância de até 15 minutos para pontualidade de todos"
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Endereço Completo (com andar/sala)</label>
              <input type="text" id="cfgAddress" placeholder="Ex: Av. Paulista, 1800, Conjunto 124 - Bela Vista, São Paulo/SP"
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Estacionamento / Manobrista</label>
              <input type="text" id="cfgParking" placeholder="Ex: Estacionamento conveniado com manobrista no próprio edifício"
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
          </div>
        </div>

        <!-- CARD 6: REGRAS DE OURO CLÍNICAS & SEGURANÇA JURÍDICA -->
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

          <div class="space-y-3 text-xs">
            <div>
              <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Regras Clínicas Especiais & Contraindicações</label>
              <textarea id="cfgClinicalRules" rows="2" placeholder="Ex: Gestantes e lactantes não realizam procedimentos injetáveis. Em caso de dor de dente aguda, colocar na fila prioritária de encaixe no mesmo dia."
                class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]"></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">WhatsApp de Transbordo Humano / Urgências</label>
                <input type="text" id="cfgEmergencyContact" placeholder="Ex: (11) 98888-0000 (Dra. Fernanda)"
                  class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
              </div>
              <div>
                <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Diferenciais & Tecnologia da Clínica</label>
                <input type="text" id="cfgExtra" placeholder="Ex: Scanner 3D intraoral, anestesia sem dor computadorizada, espaço café premium"
                  class="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#008069]">
              </div>
            </div>
          </div>
        </div>

        <!-- BARRA FINAL DE SALVAR -->
        <div class="flex items-center justify-end gap-3 pt-2 pb-8">
          <button type="button" onclick="selectNavigationTab('chat', 'Atendimento WhatsApp', 'fa-solid fa-comments', 'emerald')" 
            class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            Voltar ao Atendimento
          </button>
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#008069] to-emerald-600 hover:from-[#006a57] hover:to-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>Salvar & Atualizar IA no WhatsApp</span>
          </button>
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
    let customProceduresList = [];

    // Otimização de polling
    let highestKnownMsgId = 0;
    let highestActiveMsgId = 0;
    let isPollingBusy = false;
    let pollingInterval = null;

    // PROCEDIMENTOS PRÉ-CONFIGURADOS (ODONTO & ESTÉTICA)
    const DEFAULT_ODONTO_SERVICES = [
      "Limpeza & Profilaxia",
      "Clareamento Dental a Laser",
      "Clareamento Caseiro com Moldeira",
      "Alinhadores Invisíveis / Ortodontia",
      "Aparelho Fixo Estético / Metálico",
      "Lentes de Resina / Facetas",
      "Lentes de Contato de Porcelana",
      "Implantes Dentários & Próteses",
      "Tratamento de Canal (Endodontia)",
      "Extração do Siso",
      "Restaurações Estéticas",
      "Tratamento de Gengiva (Periodontia)"
    ];

    const DEFAULT_ESTETICA_SERVICES = [
      "Toxina Botulínica (Botox Facial)",
      "Preenchimento Labial com Ácido Hialurônico",
      "Preenchimento de Malar / Olheiras",
      "Bioestimulador de Colágeno (Sculptra / Radiesse)",
      "Fios de PDO de Sustentação",
      "Fios de PDO de Estímulo de Colágeno",
      "Lipoaspiração Enzimática de Papada",
      "Rinomodelação sem Cirurgia",
      "Skinbooster / Hidratação Injetável",
      "Microagulhamento com Drug Delivery",
      "Peeling Químico Renovador",
      "Drenagem Linfática Facial Pós-Procedimento"
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
      renderCheckboxesInitial();
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
        conversations = data.conversations || [];

        const countSpan = document.getElementById('chatCount');
        if (countSpan) countSpan.innerText = \`\${conversations.length} conversas ativas\`;

        renderConversationList();

        if (!activePhone && conversations.length > 0 && !isAutoRefresh) {
          selectChat(conversations[0].contact_wa_id);
        }
      } catch (err) {
        console.error("Erro ao carregar conversas:", err);
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
        const timeStr = formatTime(c.last_created_at);
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
      document.getElementById('messageInput').placeholder = \`Digite uma resposta manual para \${name}...\`;
      document.getElementById('sendBtn').disabled = false;
      document.getElementById('btnScheduleThisPatient').disabled = false;
      document.getElementById('btnSimulateCurrent').disabled = false;
      document.getElementById('btnClearChat').disabled = false;

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

      area.innerHTML = msgs.map(m => {
        const isPatient = m.direction === 'in';
        const isHumanAgent = m.status === 'human';
        const timeStr = formatTime(m.created_at);

        if (isPatient) {
          return \`
            <div class="flex flex-col items-start max-w-[85%] md:max-w-[70%]">
              <div class="bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200/50 dark:border-slate-700/30 text-xs leading-relaxed">
                \${escapeHtml(m.body)}
                <div class="text-[9px] text-slate-400 text-right mt-1 font-mono">\${timeStr}</div>
              </div>
            </div>
          \`;
        } else {
          return \`
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
                <div class="text-[9px] opacity-70 text-right mt-1 font-mono flex items-center justify-end gap-1">
                  <span>\${timeStr}</span>
                  <i class="fa-solid fa-check-double text-[8px] text-[#53bdeb]"></i>
                </div>
              </div>
            </div>
          \`;
        }
      }).join('');

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

    // 6. QUESTIONÁRIO DE CONFIGURAÇÃO & TREINAMENTO DA IA (ODONTO & ESTÉTICA)
    function renderCheckboxesInitial() {
      const odontoContainer = document.getElementById('odontoCheckboxes');
      const esteticaContainer = document.getElementById('esteticaCheckboxes');

      if (odontoContainer) {
        odontoContainer.innerHTML = DEFAULT_ODONTO_SERVICES.map((s, idx) => \`
          <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer">
            <input type="checkbox" name="procedureCheckbox" value="\${s}" class="rounded text-[#008069] focus:ring-0">
            <span class="text-slate-700 dark:text-slate-300">\${s}</span>
          </label>
        \`).join('');
      }

      if (esteticaContainer) {
        esteticaContainer.innerHTML = DEFAULT_ESTETICA_SERVICES.map((s, idx) => \`
          <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer">
            <input type="checkbox" name="procedureCheckbox" value="\${s}" class="rounded text-purple-600 focus:ring-0">
            <span class="text-slate-700 dark:text-slate-300">\${s}</span>
          </label>
        \`).join('');
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
        if (currentConfig.delay_tolerance) document.getElementById('cfgDelayTolerance').value = currentConfig.delay_tolerance;
        if (currentConfig.address) document.getElementById('cfgAddress').value = currentConfig.address;
        if (currentConfig.parking) document.getElementById('cfgParking').value = currentConfig.parking;
        if (currentConfig.clinical_rules) document.getElementById('cfgClinicalRules').value = currentConfig.clinical_rules;
        if (currentConfig.emergency_contact) document.getElementById('cfgEmergencyContact').value = currentConfig.emergency_contact;
        if (currentConfig.extra) document.getElementById('cfgExtra').value = currentConfig.extra;

        // Estratégia de preço (radios)
        const radios = document.getElementsByName('priceStrategyRadio');
        for (const r of radios) {
          if (r.value === (currentConfig.price_strategy || 'avaliacao')) {
            r.checked = true;
          }
        }

        // Checkboxes de procedimentos
        const activeProcs = currentConfig.procedures || [];
        const checkboxes = document.getElementsByName('procedureCheckbox');
        for (const cb of checkboxes) {
          cb.checked = activeProcs.includes(cb.value);
        }

        // Procedimentos customizados
        customProceduresList = currentConfig.custom_procedures || [];
        renderCustomProceduresList();

      } catch (err) {
        console.error("Erro ao carregar configurações da clínica:", err);
      }
    }

    function renderCustomProceduresList() {
      const container = document.getElementById('customProceduresList');
      if (!container) return;

      if (customProceduresList.length === 0) {
        container.innerHTML = '<span class="text-slate-400 text-[11px] italic">Nenhum procedimento extra adicionado ainda.</span>';
        return;
      }

      container.innerHTML = customProceduresList.map((p, idx) => \`
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <div>
            <span class="font-bold text-slate-800 dark:text-slate-200 mr-2">\${escapeHtml(p.name)}</span>
            \${p.duration ? \`<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mr-2">\${escapeHtml(p.duration)}</span>\` : ''}
            \${p.note ? \`<span class="text-[10px] text-slate-400">\${escapeHtml(p.note)}</span>\` : ''}
          </div>
          <button type="button" onclick="handleRemoveCustomProcedure(\${idx})" class="text-slate-400 hover:text-rose-500 p-1">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      \`).join('');
    }

    function handleAddCustomProcedure() {
      const nameInput = document.getElementById('customProcName');
      const durationInput = document.getElementById('customProcDuration');
      const noteInput = document.getElementById('customProcNote');

      const name = nameInput.value.trim();
      if (!name) return;

      customProceduresList.push({
        name,
        duration: durationInput.value.trim() || undefined,
        note: noteInput.value.trim() || undefined
      });

      nameInput.value = '';
      durationInput.value = '';
      noteInput.value = '';

      renderCustomProceduresList();
    }

    function handleRemoveCustomProcedure(idx) {
      customProceduresList.splice(idx, 1);
      renderCustomProceduresList();
    }

    async function saveClinicConfig() {
      const btn = document.getElementById('btnSaveConfig');
      const btnText = document.getElementById('btnSaveConfigText');

      if (btnText) btnText.innerText = "Salvando na IA...";
      if (btn) btn.disabled = true;

      // Colhe procedimentos selecionados
      const selectedProcedures = [];
      const checkboxes = document.getElementsByName('procedureCheckbox');
      for (const cb of checkboxes) {
        if (cb.checked) selectedProcedures.push(cb.value);
      }

      // Colhe estratégia de preço
      let priceStrategy = 'avaliacao';
      const radios = document.getElementsByName('priceStrategyRadio');
      for (const r of radios) {
        if (r.checked) priceStrategy = r.value;
      }

      const configPayload = {
        clinic_name: document.getElementById('cfgClinicName').value.trim() || "Clínica Sorriso & Estética",
        doctor_name: document.getElementById('cfgDoctorName').value.trim() || undefined,
        doctor_cro: document.getElementById('cfgDoctorCro').value.trim() || undefined,
        tone: document.getElementById('cfgTone').value,
        procedures: selectedProcedures,
        custom_procedures: customProceduresList,
        price_strategy: priceStrategy,
        prices_note: document.getElementById('cfgPricesNote').value.trim() || undefined,
        payment_methods: document.getElementById('cfgPaymentMethods').value.trim() || undefined,
        insurance: document.getElementById('cfgInsurance').value.trim() || undefined,
        hours: document.getElementById('cfgHours').value.trim() || undefined,
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
        if (btnText) btnText.innerText = "Salvar Alterações";
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

    function formatTime(isoString) {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    }

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
\`;
