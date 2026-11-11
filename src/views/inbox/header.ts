export const INBOX_HEADER_HTML = `
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
      
      <!-- BOTÃO DISCRETO SUPER ADMIN (EXIBIDO APENAS PARA SUPERADMIN) -->
      <a id="superAdminNavBtn" href="/admin" title="Painel Global Super Admin"
        class="hidden items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition">
        <i class="fa-solid fa-crown text-[11px]"></i>
        <span class="hidden md:inline">Super Admin</span>
      </a>

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
`;
