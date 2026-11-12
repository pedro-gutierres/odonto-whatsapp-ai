import { INBOX_BLOCKS_VIEW_HTML } from "./blocks-view";
export const INBOX_AGENDA_VIEW_HTML = `
<main id="viewAgenda" class="hidden flex-1 overflow-y-auto"><div class="max-w-7xl mx-auto space-y-6">
  <div class="aura-page-heading"><div><h2>Consultas e disponibilidade</h2><p class="aura-description">Veja os compromissos do dia e organize os horários do seu atendimento.</p></div><div class="flex flex-wrap gap-2"><button onclick="openProfessionalsModal()" class="aura-secondary">Profissionais <span id="profCountBadge" class="aura-count">0</span></button><button id="btnNewAppointmentAgenda" onclick="openAppointmentModal()" class="aura-primary"><i class="fa-solid fa-plus" aria-hidden="true"></i>Nova consulta</button></div></div>
  <p id="agendaAccessNotice" class="aura-field-hint"></p>
  <div class="flex flex-wrap justify-between items-center gap-4"><div class="flex flex-wrap gap-5 text-xs text-slate-500"><span><b id="metricAgendados">0</b> agendadas</span><span><b id="metricConfirmed">0</b> confirmadas</span><span><b id="metricConcluidos">0</b> concluídas</span><span id="metricTotal" hidden>0</span></div><div class="flex gap-2 items-center"><select id="agendaProfessionalFilter" aria-label="Filtrar agenda por profissional" onchange="onAgendaProfessionalFilterChange()"><option value="all">Todos os profissionais</option></select><button onclick="loadAppointments()" class="aura-icon-button" aria-label="Atualizar agenda" title="Atualizar agenda"><i id="agendaRefreshIcon" class="fa-solid fa-rotate-right" aria-hidden="true"></i></button></div></div>
  <div id="agendaProfChips" class="hidden flex flex-wrap gap-2"></div>
  <div id="agendaCrucialLockBanner" class="hidden aura-note flex flex-wrap items-center justify-between gap-3"><div><b class="text-xs">Complete as informações do negócio</b><p id="agendaCrucialLockDetails" class="aura-field-hint"></p></div><button type="button" onclick="goToTrainingAndHighlightMissing()" class="aura-text-button">Preencher informações</button></div>
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
                <p class="text-[10px] text-slate-400">Selecione um dia para ver as consultas</p>
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


${INBOX_BLOCKS_VIEW_HTML}
      <!-- TABELA DETALHADA DE AGENDAMENTOS COM FILTROS -->
      <div class="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        
        <!-- CABEÇALHO DA TABELA & FILTROS -->
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <div>
            <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Todas as consultas</h3>
            <p class="text-[10px] text-slate-400">Busque por paciente ou procedimento.</p>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <div class="relative w-full sm:w-64">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input type="text" id="appointmentSearchInput" oninput="filterAppointments()" placeholder="Buscar por paciente ou procedimento..."
                class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#008069]">
            </div>
            <select id="appointmentStatusFilter" onchange="filterAppointments()"
              class="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium focus:outline-none">
              <option value="todos">Todas as situações</option>
              <option value="agendado">Agendadas</option>
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
                <th class="py-3 px-4">Situação</th>
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


</div></main>`;
