export const INBOX_AGENDA_VIEW_HTML = `
  <!-- ======================================================================= -->
  <!-- VIEW 2: AGENDA (CALENDÁRIO INTERATIVO & GRADE DE CONSULTAS)             -->
  <!-- ======================================================================= -->
  <main id="viewAgenda" class="flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 hidden bg-slate-50 dark:bg-[#0b0f17]">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- TOPO DA AGENDA: TÍTULO & AÇÕES -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center gap-2.5">
          <span class="w-3 h-3 rounded-full bg-sky-500 animate-pulse"></span>
          <h2 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Agenda & Profissionais</h2>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select id="agendaProfessionalFilter" onchange="onAgendaProfessionalFilterChange()"
            class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-[#008069]">
            <option value="all">Todos os Profissionais</option>
          </select>
          <button onclick="openProfessionalsModal()" class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition shadow-sm">
            <i class="fa-solid fa-user-doctor text-sky-500"></i>
            <span>Profissionais</span>
            <span id="profCountBadge" class="px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold">0</span>
          </button>
          <button onclick="loadAppointments()" class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition" title="Atualizar">
            <i class="fa-solid fa-rotate-right" id="agendaRefreshIcon"></i>
          </button>
          <button id="btnNewAppointmentAgenda" onclick="openAppointmentModal()" class="px-4 py-2 rounded-xl bg-[#008069] hover:bg-[#006a57] text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition">
            <i class="fa-solid fa-calendar-plus"></i>
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      <!-- BARRA RÁPIDA DE FILTRO POR PROFISSIONAL -->
      <div id="agendaProfChips" class="hidden flex flex-wrap items-center gap-2"></div>

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
`;
