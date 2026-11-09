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
  <header class="h-16 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-6 flex items-center justify-between shrink-0 z-30 transition-colors">
    <div class="flex items-center gap-6">
      
      <!-- LOGO E CLÍNICA -->
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#008069] to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/10 font-bold text-base">
          <i class="fa-solid fa-sparkles"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">Aura<span class="text-emerald-500 dark:text-emerald-400">AI</span></span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/60">
              Clínica Sorriso Teste
            </span>
          </div>
          <span class="text-[10px] block font-medium text-slate-500 dark:text-slate-400">Central de Recepção & Triagem 24h</span>
        </div>
      </div>

      <!-- TABS DE NAVEGAÇÃO -->
      <nav class="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button id="tabChatBtn" onclick="switchMainTab('chat')" 
          class="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm flex items-center gap-2 transition">
          <i class="fa-solid fa-comments text-emerald-500"></i>
          <span>Atendimento WhatsApp</span>
          <span id="tabBadgeChat" class="w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>

        <button id="tabAgendaBtn" onclick="switchMainTab('agenda')" 
          class="px-3.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-2 transition">
          <i class="fa-regular fa-calendar-check text-slate-400"></i>
          <span>Agenda & Pré-Agendamentos</span>
          <span id="appointmentsCountBadge" class="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">0</span>
        </button>
      </nav>

    </div>

    <!-- AÇÕES DO TOPO: DARK MODE, SIMULADOR, USUÁRIO -->
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
    <section class="w-80 lg:w-96 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 transition-colors">
      <!-- Busca e Filtros -->
      <div class="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
          <input type="text" id="searchInput" oninput="filterChats()" placeholder="Pesquisar paciente ou telefone..." 
            class="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#008069] transition">
        </div>
        <div class="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span id="chatCount">0 conversas</span>
          <span class="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <i class="fa-solid fa-robot"></i> IA Ativa 24h
          </span>
        </div>
      </div>

      <!-- Lista de Chats -->
      <div id="chatList" class="flex-1 overflow-y-auto custom-scroll divide-y divide-slate-100 dark:divide-slate-800/60">
        <div class="p-6 text-center text-slate-400 text-xs">Carregando conversas...</div>
      </div>
    </section>

    <!-- COLUNA 2: JANELA DO CHAT ATIVO (CENTRO) -->
    <section class="flex-1 flex flex-col bg-white dark:bg-[#0b0f17] overflow-hidden transition-colors">
      
      <!-- Cabeçalho do Chat Selecionado -->
      <div id="chatHeader" class="h-14 border-b border-slate-200 dark:border-slate-800/80 px-5 flex items-center justify-between bg-slate-50 dark:bg-[#111827] shrink-0 hidden transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm" id="activeAvatar">P</div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-white" id="activeName">Paciente</h2>
              <span id="activeAiBadge" class="text-[10px] px-2 py-0.5 rounded-full font-medium"></span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400" id="activePhone">552199999999</p>
          </div>
        </div>

        <!-- Botão de Intervenção Humana (Human Takeover) -->
        <div class="flex items-center gap-2">
          <button id="toggleAiBtn" onclick="toggleActiveAi()" class="text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm">
            <!-- Preenchido via JS -->
          </button>
        </div>
      </div>

      <!-- Área das Mensagens (Scroll) -->
      <div id="messagesArea" class="flex-1 overflow-y-auto p-4 space-y-3 wa-bg-light dark:wa-bg-dark custom-scroll transition-colors">
        <div class="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
          <div class="w-14 h-14 rounded-full bg-white/70 dark:bg-slate-800 shadow-sm flex items-center justify-center text-2xl mb-2 text-slate-400">💬</div>
          <p class="font-medium text-slate-700 dark:text-slate-300 text-sm">Nenhuma conversa selecionada</p>
          <p class="text-slate-400 dark:text-slate-500 mt-1">Selecione uma conversa à esquerda para visualizar e intervir.</p>
        </div>
      </div>

      <!-- Barra de Envio da Recepcionista -->
      <div id="chatFooter" class="p-3 bg-slate-50 dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800/80 shrink-0 hidden transition-colors">
        <form onsubmit="handleSendHuman(event)" class="flex items-center gap-2">
          <input type="text" id="humanInput" placeholder="Digite uma resposta manual como recepcionista (Enter para enviar)..." 
            class="flex-1 px-4 py-2 text-xs bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#008069] transition" autocomplete="off" />
          <button type="submit" class="bg-[#008069] hover:bg-[#006a57] text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm">
            <i class="fa-solid fa-paper-plane"></i>
            <span>Enviar</span>
          </button>
        </form>
        <div class="mt-1.5 px-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>Dica: Ao enviar mensagem manual, o paciente recebe com status de atendente humano.</span>
          <button onclick="quickScheduleForCurrent()" class="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1">
            <i class="fa-solid fa-calendar-plus text-xs"></i>
            <span>Criar Pré-Agendamento</span>
          </button>
        </div>
      </div>

    </section>

    <!-- COLUNA 3: DADOS DO PACIENTE & AÇÕES RÁPIDAS (DIREITA) -->
    <section id="patientSidebar" class="w-72 lg:w-80 bg-slate-50 dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800/80 p-4 flex flex-col shrink-0 hidden transition-colors">
      <div class="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
        <div class="w-16 h-16 rounded-full bg-[#008069]/10 text-[#008069] dark:text-emerald-400 font-bold text-xl flex items-center justify-center mx-auto mb-2" id="sideAvatar">P</div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white" id="sideName">Nome</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400" id="sidePhone">Telefone</p>
      </div>

      <!-- Mini CRM & Status -->
      <div class="py-4 space-y-3 flex-1 overflow-y-auto custom-scroll text-xs">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status do Atendimento</label>
          <div class="mt-1 p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span id="sideAiStatusIcon"><i class="fa-solid fa-robot text-emerald-600 dark:text-emerald-400"></i></span>
              <span class="font-medium text-slate-700 dark:text-slate-300" id="sideAiStatusText">IA Ativa</span>
            </div>
            <button onclick="toggleActiveAi()" class="text-[11px] text-[#008069] dark:text-emerald-400 hover:underline font-semibold" id="sideToggleLink">Pausar</button>
          </div>
        </div>

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Procedimento de Interesse</label>
          <div class="mt-1 p-2.5 rounded-lg bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium" id="sideInterest">
            Avaliação Geral
          </div>
        </div>

        <!-- AÇÃO DE AGENDAMENTO DIRETO -->
        <div class="pt-2">
          <button onclick="quickScheduleForCurrent()" 
            class="w-full py-2.5 px-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition flex items-center justify-center gap-2">
            <i class="fa-solid fa-calendar-plus"></i>
            <span>Agendar Consulta deste Paciente</span>
          </button>
        </div>

        <!-- SIMULADOR RÁPIDO DO PACIENTE -->
        <div class="pt-2 border-t border-slate-200 dark:border-slate-800">
          <label class="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1 mb-1">
            <i class="fa-solid fa-vial"></i> Testar como este paciente
          </label>
          <p class="text-[11px] text-slate-400 mb-2">Simule uma nova pergunta deste cliente para ver a IA respondendo:</p>
          <form onsubmit="handleSimulateForCurrent(event)">
            <textarea id="simQuestionInput" rows="2" placeholder="Ex: Qual o preço do clareamento?" required
              class="w-full p-2 text-xs bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#008069] mb-1.5"></textarea>
            <button type="submit" class="w-full py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition">
              <i class="fa-solid fa-play text-[9px]"></i>
              <span>Simular Envio do Paciente</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Ações do rodapé -->
      <div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button onclick="handleClearCurrentChat()" class="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
          <i class="fa-regular fa-trash-can"></i>
          <span>Limpar Histórico</span>
        </button>
      </div>
    </section>

  </main>

  <!-- ======================================================================= -->
  <!-- VIEW 2: PAINEL DA AGENDA & PRÉ-AGENDAMENTOS (CRM DE RESULTADOS)        -->
  <!-- ======================================================================= -->
  <main id="viewAgenda" class="flex-1 flex flex-col overflow-y-auto p-5 lg:p-8 custom-scroll hidden bg-slate-50 dark:bg-[#0b0f17] transition-colors">
    <div class="max-w-6xl mx-auto w-full space-y-6">

      <!-- HEADER DA AGENDA -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">Agenda & Pré-Agendamentos da IA</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Consultas e avaliações captadas automaticamente pelo WhatsApp da clínica.</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="loadAppointments()" class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2">
            <i class="fa-solid fa-arrows-rotate" id="agendaRefreshIcon"></i>
            <span>Atualizar</span>
          </button>
          <button onclick="openNewAppointmentModal()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-2">
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      <!-- CARDS DE METRICAS (PROVA DE VALOR) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-4 rounded-2xl bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Agendados</span>
            <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
              <i class="fa-solid fa-calendar-check"></i>
            </div>
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white" id="metricTotal">0</div>
          <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">Captados pelo WhatsApp</span>
        </div>

        <div class="p-4 rounded-2xl bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confirmados</span>
            <div class="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs">
              <i class="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white" id="metricConfirmed">0</div>
          <span class="text-[11px] text-slate-400 mt-1 block">Prontos para atendimento</span>
        </div>

        <div class="p-4 rounded-2xl bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pré-Agendados</span>
            <div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
              <i class="fa-solid fa-clock"></i>
            </div>
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white" id="metricPending">0</div>
          <span class="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 block">Requer confirmação humana</span>
        </div>

        <div class="p-4 rounded-2xl bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valor Estimado</span>
            <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
              <i class="fa-solid fa-sack-dollar"></i>
            </div>
          </div>
          <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400" id="metricValue">R$ 0</div>
          <span class="text-[11px] text-slate-400 mt-1 block">Pipeline de procedimentos</span>
        </div>
      </div>

      <!-- TABELA DE AGENDAMENTOS -->
      <div class="bg-white dark:bg-[#131b2a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="relative w-full sm:w-72">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="appointmentSearchInput" oninput="filterAppointments()" placeholder="Filtrar paciente ou procedimento..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#008069]">
          </div>
          <div class="flex items-center gap-2 text-xs w-full sm:w-auto">
            <span class="text-slate-400 text-[11px]">Filtrar por:</span>
            <select id="appointmentStatusFilter" onchange="filterAppointments()" 
              class="px-2.5 py-1.5 bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none">
              <option value="todos">Todos os Status</option>
              <option value="confirmado">Confirmados</option>
              <option value="pre_agendado">Pré-Agendados</option>
              <option value="concluido">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px]">
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
          <input type="text" id="appProcedure" required placeholder="Ex: Botox / Harmonização Facial"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Data / Horário</label>
            <input type="text" id="appScheduledAt" required placeholder="Ex: Sábado às 10:00"
              class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]">
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Status</label>
            <select id="appStatus" class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none">
              <option value="pre_agendado">Pré-Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Observações / Detalhes</label>
          <textarea id="appNotes" rows="2" placeholder="Ex: Agendado via Secretária IA Claude"
            class="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#008069]"></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="closeAppointmentModal()" class="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">Cancelar</button>
          <button type="submit" class="px-4 py-1.5 rounded-lg bg-[#008069] hover:bg-[#006a57] text-white font-semibold">Salvar Agendamento</button>
        </div>
      </form>
    </div>
  </div>

  <!-- SCRIPT PRINCIPAL DO PAINEL -->
  <script>
    let conversations = [];
    let appointments = [];
    let activePhone = null;
    let activeAiPaused = false;
    let isPollingBusy = false;
    let highestKnownMsgId = 0;
    let highestActiveMsgId = 0;
    let pollTimer = null;
    const messageCache = {};

    // 1. TEMA (DARK / LIGHT MODE)
    function initTheme() {
      const saved = localStorage.getItem('aura_theme') || 'dark';
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-moon';
      } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('themeIcon').className = 'fa-solid fa-sun';
      }
    }

    function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('aura_theme', isDark ? 'dark' : 'light');
      document.getElementById('themeIcon').className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

    // 2. NAVEGAÇÃO DE TABS (CHAT vs AGENDA)
    function switchMainTab(tab) {
      const viewChat = document.getElementById('viewChat');
      const viewAgenda = document.getElementById('viewAgenda');
      const btnChat = document.getElementById('tabChatBtn');
      const btnAgenda = document.getElementById('tabAgendaBtn');

      if (tab === 'agenda') {
        viewChat.classList.add('hidden');
        viewAgenda.classList.remove('hidden');
        btnAgenda.className = "px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm flex items-center gap-2 transition font-bold";
        btnChat.className = "px-3.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-2 transition";
        loadAppointments();
      } else {
        viewAgenda.classList.add('hidden');
        viewChat.classList.remove('hidden');
        btnChat.className = "px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm flex items-center gap-2 transition font-bold";
        btnAgenda.className = "px-3.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-2 transition";
      }
    }

    // 3. INICIALIZAÇÃO
    async function init() {
      initTheme();
      await loadConversations(false);
      await loadAppointments();
      startPolling();
    }

    // 4. CHECAGEM DE SINCRONIZAÇÃO ULTRA-LEVE (1 row read)
    async function checkSync() {
      if (isPollingBusy || document.hidden) return;
      isPollingBusy = true;
      try {
        const p = activePhone || '';
        const url = \`/api/sync-check?last_id=\${highestKnownMsgId}&active_phone=\${encodeURIComponent(p)}&active_msg_id=\${highestActiveMsgId}\`;
        const res = await fetch(url);
        const data = await res.json();

        // Status IA
        if (activePhone && typeof data.active_ai_paused === 'boolean') {
          if (activeAiPaused !== data.active_ai_paused) {
            activeAiPaused = data.active_ai_paused;
            updateAiButtons(activeAiPaused);
          }
        }

        // Novas mensagens no chat ativo
        if (data.has_new_active && activePhone) {
          await loadMessages(activePhone, true);
          highestActiveMsgId = Math.max(highestActiveMsgId, data.active_latest_id || 0);
        }

        // Novas mensagens em outros chats
        if (data.has_new_global) {
          await loadConversations(true);
          highestKnownMsgId = Math.max(highestKnownMsgId, data.latest_id || 0);
        }
      } catch (err) {
        console.error("Erro no sync-check:", err);
      } finally {
        isPollingBusy = false;
      }
    }

    function startPolling() {
      if (!pollTimer) {
        pollTimer = setInterval(checkSync, 4000);
      }
    }

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopPolling();
      } else {
        checkSync();
        startPolling();
      }
    });

    async function fetchMessages(phone) {
      const p = String(phone);
      try {
        const res = await fetch('/api/messages?phone=' + encodeURIComponent(p));
        const data = await res.json();
        const msgs = data.messages || [];
        if (data && data.messages) {
          messageCache[p] = msgs;
          const maxId = msgs.reduce((max, m) => Math.max(max, m.id || 0), 0);
          if (p === String(activePhone)) {
            highestActiveMsgId = Math.max(highestActiveMsgId, maxId);
          }
          highestKnownMsgId = Math.max(highestKnownMsgId, maxId);
        }
        return data || { messages: [], ai_paused: false };
      } catch (err) {
        console.error("Erro ao buscar mensagens de " + p, err);
        return { messages: messageCache[p] || [], ai_paused: false };
      }
    }

    async function loadConversations(isBackground = false) {
      try {
        const res = await fetch('/api/conversations');
        const data = await res.json();
        conversations = data.conversations || [];
        renderConversationList();

        if (!activePhone && conversations.length > 0 && !isBackground) {
          await selectChat(conversations[0].contact_wa_id);
        }

        // Pré-cache em segundo plano
        if (!isBackground && conversations.length > 0) {
          for (const c of conversations) {
            const p = String(c.contact_wa_id);
            if (!messageCache[p]) {
              fetchMessages(p).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar conversas:", err);
      }
    }

    function renderConversationList() {
      const container = document.getElementById('chatList');
      const countEl = document.getElementById('chatCount');
      const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();

      const filtered = conversations.filter(c => 
        (c.contact_name && c.contact_name.toLowerCase().includes(search)) ||
        String(c.contact_wa_id).includes(search) ||
        (c.last_body && c.last_body.toLowerCase().includes(search))
      );

      countEl.innerText = \`\${filtered.length} conversa\${filtered.length === 1 ? '' : 's'}\`;

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="p-8 text-center text-slate-400 text-xs">
            <i class="fa-regular fa-comment-dots text-2xl mb-2 text-slate-400"></i>
            <p>Nenhuma conversa encontrada</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(c => {
        const isSelected = String(c.contact_wa_id) === String(activePhone);
        const name = c.contact_name || c.contact_wa_id;
        const initial = name.charAt(0).toUpperCase();
        const time = formatTime(c.last_created_at);
        const isPaused = c.ai_paused === 1;

        return \`
          <div onclick="selectChat('\${c.contact_wa_id}')" 
            class="p-3.5 flex items-start gap-3 cursor-pointer transition hover:bg-slate-100/60 dark:hover:bg-slate-800/50 \${isSelected ? 'bg-slate-100 dark:bg-slate-800/80 border-l-4 border-[#008069]' : ''}">
            <div class="w-10 h-10 rounded-full \${isSelected ? 'bg-[#008069] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} font-bold flex items-center justify-center shrink-0 text-sm">
              \${initial}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <h4 class="text-xs font-semibold text-slate-900 dark:text-white truncate">\${escapeHtml(name)}</h4>
                <span class="text-[10px] text-slate-400 shrink-0 ml-1">\${time}</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">
                \${c.last_direction === 'out' ? '<span class="text-slate-400 font-medium">Você: </span>' : ''}\${escapeHtml(c.last_body || '')}
              </p>
              <div class="flex items-center gap-1.5">
                \${isPaused 
                  ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 border border-amber-200 dark:border-amber-900/40"><i class="fa-solid fa-pause text-[8px]"></i> IA Pausada</span>'
                  : '<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 border border-emerald-200 dark:border-emerald-900/40"><i class="fa-solid fa-robot text-[8px]"></i> IA Ativa</span>'
                }
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function selectChat(phone) {
      if (!phone) return;
      const p = String(phone);
      activePhone = p;

      renderConversationList();

      document.getElementById('chatHeader').classList.remove('hidden');
      document.getElementById('chatFooter').classList.remove('hidden');
      document.getElementById('patientSidebar').classList.remove('hidden');

      const conv = conversations.find(c => String(c.contact_wa_id) === p);
      const name = conv ? (conv.contact_name || conv.contact_wa_id) : p;

      document.getElementById('activeName').innerText = name;
      document.getElementById('activePhone').innerText = p;
      document.getElementById('activeAvatar').innerText = name.charAt(0).toUpperCase();

      document.getElementById('sideName').innerText = name;
      document.getElementById('sidePhone').innerText = p;
      document.getElementById('sideAvatar').innerText = name.charAt(0).toUpperCase();

      // Transição instantânea 0ms do cache
      if (messageCache[p] && messageCache[p].length > 0) {
        renderMessagesToContainer(messageCache[p]);
        detectInterest(messageCache[p]);
      } else {
        document.getElementById('messagesArea').innerHTML = \`
          <div class="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <i class="fa-solid fa-circle-notch fa-spin text-xl text-[#008069] mb-2"></i>
            <p class="font-medium text-slate-500">Carregando conversa...</p>
          </div>
        \`;
      }

      await loadMessages(p, false);
    }

    async function loadMessages(phone, isPolling = false) {
      if (!phone) return;
      const p = String(phone);
      const data = await fetchMessages(p);
      const msgs = data.messages || [];

      if (activePhone === p) {
        activeAiPaused = !!data.ai_paused;
        updateAiButtons(activeAiPaused);
        detectInterest(msgs);
        renderMessagesToContainer(msgs, isPolling);
      }
    }

    function renderMessagesToContainer(msgs, isPolling = false) {
      const container = document.getElementById('messagesArea');
      const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;

      if (!msgs || msgs.length === 0) {
        container.innerHTML = \`
          <div class="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <i class="fa-regular fa-comment-dots text-2xl mb-2 text-slate-300 dark:text-slate-600"></i>
            <p class="font-medium text-slate-600 dark:text-slate-400">Nenhuma mensagem neste chat ainda</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = msgs.map(m => renderBubble(m)).join('');

      if (!isPolling || wasAtBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }

    function renderBubble(m) {
      const isPatient = m.direction === 'in';
      const isHuman = m.direction === 'out' && m.status === 'human';
      const time = formatTime(m.created_at);

      if (isPatient) {
        return \`
          <div class="flex justify-start">
            <div class="max-w-[78%] bg-white dark:bg-[#1f2c34] rounded-lg rounded-tl-none p-3 shadow-sm border border-slate-100 dark:border-transparent text-xs text-slate-800 dark:text-slate-100">
              <p class="whitespace-pre-wrap leading-relaxed">\${escapeHtml(m.body || '')}</p>
              <div class="text-[9px] text-slate-400 dark:text-slate-400 text-right mt-1">\${time}</div>
            </div>
          </div>
        \`;
      } else if (isHuman) {
        return \`
          <div class="flex justify-end">
            <div class="max-w-[78%] bg-sky-100 dark:bg-sky-950/70 rounded-lg rounded-tr-none p-3 shadow-sm border border-sky-200 dark:border-sky-800/50 text-xs text-slate-800 dark:text-slate-100">
              <div class="text-[9px] text-sky-700 dark:text-sky-400 font-bold mb-1 flex items-center gap-1">
                <i class="fa-solid fa-user-tie"></i> Recepcionista (Atendimento Manual)
              </div>
              <p class="whitespace-pre-wrap leading-relaxed">\${escapeHtml(m.body || '')}</p>
              <div class="text-[9px] text-sky-600/70 dark:text-sky-400/70 text-right mt-1">\${time}</div>
            </div>
          </div>
        \`;
      } else {
        return \`
          <div class="flex justify-end">
            <div class="max-w-[78%] bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg rounded-tr-none p-3 shadow-sm text-xs border border-emerald-100 dark:border-transparent text-slate-800 dark:text-slate-100">
              <div class="text-[9px] text-emerald-800 dark:text-emerald-300 font-bold mb-1 flex items-center gap-1">
                <i class="fa-solid fa-robot"></i> Secretária IA (Claude 24h)
              </div>
              <p class="whitespace-pre-wrap leading-relaxed">\${escapeHtml(m.body || '')}</p>
              <div class="text-[9px] text-emerald-700/70 dark:text-emerald-300/70 text-right mt-1">\${time}</div>
            </div>
          </div>
        \`;
      }
    }

    function detectInterest(messages) {
      const allText = messages.map(m => (m.body || '').toLowerCase()).join(' ');
      let interest = 'Avaliação Geral';
      if (allText.includes('botox') || allText.includes('toxina')) interest = 'Botox / Toxina Botulínica';
      else if (allText.includes('clareamento')) interest = 'Clareamento Dental';
      else if (allText.includes('implante')) interest = 'Implantes Dentários';
      else if (allText.includes('aparelho') || allText.includes('ortodontia')) interest = 'Ortodontia / Aparelho';
      else if (allText.includes('harmoniz')) interest = 'Harmonização Facial';
      else if (allText.includes('sangramento') || allText.includes('dor') || allText.includes('urg')) interest = 'Urgência / Emergência';

      const el = document.getElementById('sideInterest');
      if (el) el.innerText = interest;
    }

    function updateAiButtons(paused) {
      const btn = document.getElementById('toggleAiBtn');
      const badge = document.getElementById('activeAiBadge');
      const sideIcon = document.getElementById('sideAiStatusIcon');
      const sideText = document.getElementById('sideAiStatusText');
      const sideToggle = document.getElementById('sideToggleLink');

      if (paused) {
        if (btn) {
          btn.className = "text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition";
          btn.innerHTML = '<i class="fa-solid fa-play"></i><span>Reativar IA neste Chat</span>';
        }
        if (badge) {
          badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-900/40";
          badge.innerText = "⏸️ Atendimento Humano (IA Pausada)";
        }
        if (sideIcon) sideIcon.innerHTML = '<i class="fa-solid fa-user-check text-amber-600 dark:text-amber-400"></i>';
        if (sideText) sideText.innerText = "Atendimento Humano";
        if (sideToggle) sideToggle.innerText = "Reativar IA";
      } else {
        if (btn) {
          btn.className = "text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition";
          btn.innerHTML = '<i class="fa-solid fa-pause"></i><span>Pausar IA (Assumir)</span>';
        }
        if (badge) {
          badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-900/40";
          badge.innerText = "🤖 IA Respondendo 24h";
        }
        if (sideIcon) sideIcon.innerHTML = '<i class="fa-solid fa-robot text-emerald-600 dark:text-emerald-400"></i>';
        if (sideText) sideText.innerText = "IA Ativa 24h";
        if (sideToggle) sideToggle.innerText = "Pausar IA";
      }
    }

    async function toggleActiveAi() {
      if (!activePhone) return;
      const targetState = !activeAiPaused;
      try {
        const res = await fetch('/api/toggle-ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, paused: targetState })
        });
        if (!res.ok) throw new Error("Erro no servidor: " + res.status);
        activeAiPaused = targetState;
        updateAiButtons(activeAiPaused);
        await loadConversations(true);
      } catch (err) {
        console.error("Erro ao alterar status da IA:", err);
      }
    }

    async function handleSendHuman(e) {
      e.preventDefault();
      const input = document.getElementById('humanInput');
      const text = input.value.trim();
      if (!text || !activePhone) return;
      input.value = '';

      messageCache[activePhone] = messageCache[activePhone] || [];
      messageCache[activePhone].push({
        direction: 'out',
        status: 'human',
        body: text,
        created_at: new Date().toISOString()
      });
      renderMessagesToContainer(messageCache[activePhone]);

      try {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone, text: text })
        });
        if (!res.ok) throw new Error("Erro no servidor: " + res.status);
        await loadMessages(activePhone, false);
        await loadConversations(true);
      } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
      }
    }

    async function handleSimulateForCurrent(e) {
      e.preventDefault();
      const input = document.getElementById('simQuestionInput');
      const text = input.value.trim();
      if (!text || !activePhone) return;
      input.value = '';

      const conv = conversations.find(c => String(c.contact_wa_id) === String(activePhone));
      const name = conv ? conv.contact_name : "Paciente";

      await fetch('/api/simulate-patient', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: activePhone, name: name, text: text })
      });

      setTimeout(async () => {
        await loadMessages(activePhone, false);
        await loadConversations(true);
      }, 1800);
    }

    async function handleClearCurrentChat() {
      if (!activePhone) return;
      if (confirm(\`Deseja apagar o histórico de mensagens de \${activePhone}?\`)) {
        delete messageCache[activePhone];
        await fetch('/api/clear-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: activePhone })
        });
        await loadConversations();
        if (conversations.length > 0) {
          selectChat(conversations[0].contact_wa_id);
        } else {
          location.reload();
        }
      }
    }

    function openNewPatientModal() {
      document.getElementById('newPatientModal').classList.remove('hidden');
    }

    function closeNewPatientModal() {
      document.getElementById('newPatientModal').classList.add('hidden');
    }

    async function handleCreateNewPatient(e) {
      e.preventDefault();
      const name = document.getElementById('newPatientName').value.trim();
      const phone = document.getElementById('newPatientPhone').value.trim().replace(/\\D/g, '');
      const text = document.getElementById('newPatientText').value.trim();

      if (!name || !phone || !text) return;

      closeNewPatientModal();

      await fetch('/api/simulate-patient', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: phone, name: name, text: text })
      });

      setTimeout(async () => {
        await loadConversations();
        selectChat(phone);
      }, 2000);
    }

    function filterChats() {
      renderConversationList();
    }

    // =========================================================================
    // 5. GESTÃO DA AGENDA DE CONSULTAS & PRÉ-AGENDAMENTOS
    // =========================================================================
    async function loadAppointments() {
      const icon = document.getElementById('agendaRefreshIcon');
      if (icon) icon.classList.add('fa-spin');
      try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        appointments = data.appointments || [];
        renderAppointmentsTable();
        updateAppointmentMetrics();
      } catch (err) {
        console.error("Erro ao carregar agenda:", err);
      } finally {
        if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 500);
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
        tbody.innerHTML = \`
          <tr>
            <td colspan="6" class="p-8 text-center text-slate-400">
              <i class="fa-regular fa-calendar-xmark text-2xl mb-2 text-slate-400"></i>
              <p>Nenhum agendamento encontrado.</p>
            </td>
          </tr>
        \`;
        return;
      }

      tbody.innerHTML = filtered.map(a => {
        const statusMap = {
          confirmado: { bg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800', label: 'Confirmado' },
          pre_agendado: { bg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800', label: 'Pré-Agendado' },
          concluido: { bg: 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-400 border-sky-300 dark:border-sky-800', label: 'Concluído' },
          cancelado: { bg: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700', label: 'Cancelado' }
        };
        const s = statusMap[a.status] || statusMap.pre_agendado;

        return \`
          <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
            <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] text-slate-700 dark:text-slate-300">
                  \${(a.patient_name || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div>\${escapeHtml(a.patient_name)}</div>
                  <div class="text-[10px] text-slate-400 font-mono">\${escapeHtml(a.contact_wa_id)}</div>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
              <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                \${escapeHtml(a.procedure || 'Avaliação')}
              </span>
            </td>
            <td class="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
              <i class="fa-regular fa-clock text-slate-400 mr-1"></i>
              \${escapeHtml(a.scheduled_at)}
            </td>
            <td class="py-3 px-4">
              <select onchange="handleUpdateAppointmentStatus(\${a.id}, this.value)" 
                class="px-2 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer focus:outline-none \${s.bg}">
                <option value="pre_agendado" \${a.status === 'pre_agendado' ? 'selected' : ''}>⏳ Pré-Agendado</option>
                <option value="confirmado" \${a.status === 'confirmado' ? 'selected' : ''}>✅ Confirmado</option>
                <option value="concluido" \${a.status === 'concluido' ? 'selected' : ''}>🎯 Concluído</option>
                <option value="cancelado" \${a.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
              </select>
            </td>
            <td class="py-3 px-4 text-slate-400 max-w-xs truncate text-[11px]">
              \${escapeHtml(a.notes || '-')}
            </td>
            <td class="py-3 px-4 text-right">
              <button onclick="goToChatWithPatient('\${a.contact_wa_id}')" 
                class="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] transition inline-flex items-center gap-1">
                <i class="fa-brands fa-whatsapp"></i>
                <span>Ver Chat</span>
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function updateAppointmentMetrics() {
      const total = appointments.length;
      const confirmed = appointments.filter(a => a.status === 'confirmado').length;
      const pending = appointments.filter(a => a.status === 'pre_agendado').length;

      document.getElementById('metricTotal').innerText = total;
      document.getElementById('metricConfirmed').innerText = confirmed;
      document.getElementById('metricPending').innerText = pending;
      document.getElementById('appointmentsCountBadge').innerText = total;

      // Estimativa financeira baseada nos procedimentos
      let val = 0;
      appointments.forEach(a => {
        const p = (a.procedure || '').toLowerCase();
        if (p.includes('botox') || p.includes('toxina')) val += 1200;
        else if (p.includes('harmoniz')) val += 2800;
        else if (p.includes('implante')) val += 3500;
        else if (p.includes('clareamento')) val += 850;
        else val += 300;
      });

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
      } catch (err) {
        alert("Erro ao alterar status");
      }
    }

    function goToChatWithPatient(phone) {
      switchMainTab('chat');
      selectChat(phone);
    }

    function quickScheduleForCurrent() {
      if (!activePhone) return;
      const conv = conversations.find(c => String(c.contact_wa_id) === String(activePhone));
      const name = conv ? conv.contact_name : "Paciente";
      const interest = document.getElementById('sideInterest')?.innerText || 'Avaliação Geral';

      document.getElementById('appPatientName').value = name;
      document.getElementById('appPatientPhone').value = activePhone;
      document.getElementById('appProcedure').value = interest;
      document.getElementById('appScheduledAt').value = 'Amanhã às 14:00';
      document.getElementById('appStatus').value = 'pre_agendado';
      document.getElementById('appNotes').value = 'Captado pelo chat de atendimento da IA';

      document.getElementById('appointmentModal').classList.remove('hidden');
    }

    function openNewAppointmentModal() {
      document.getElementById('appPatientName').value = '';
      document.getElementById('appPatientPhone').value = '';
      document.getElementById('appProcedure').value = '';
      document.getElementById('appScheduledAt').value = '';
      document.getElementById('appNotes').value = '';
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
      } catch (err) {
        alert("Erro ao salvar agendamento");
      }
    }

    // 6. LOGOUT
    async function handleLogout() {
      if (confirm("Deseja sair do painel da clínica?")) {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
          window.location.href = '/login';
        }
      }
    }

    // UTILITÁRIOS
    function formatTime(isoString) {
      if (!isoString) return '';
      try {
        const normalized = isoString.replace(' ', 'T') + (isoString.endsWith('Z') ? '' : 'Z');
        const d = new Date(normalized);
        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    }

    function escapeHtml(text) {
      if (!text) return '';
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // Inicializa ao carregar a página
    window.addEventListener('DOMContentLoaded', init);
  </script>
</body>
</html>`;
