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

    function getFilteredAppointments() {
      if (selectedAgendaProfId === 'all') return appointments;
      if (selectedAgendaProfId === 'unassigned') return appointments.filter(a => !a.professional_id);
      const pid = Number(selectedAgendaProfId);
      return appointments.filter(a => Number(a.professional_id) === pid);
    }

    async function loadAppointments() {
      const icon = document.getElementById('agendaRefreshIcon');
      if (icon) icon.classList.add('fa-spin');
      try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        appointments = data.appointments || [];
        if (currentAccess && currentAccess.status === 'free') {
          const date = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
          appointments = [{ id:-1, patient_name:'Exemplo de demonstração', procedure:'Avaliação (exemplo)', scheduled_at:date+' 14:00', duration:'30 min', status:'pre_agendado', contact_wa_id:'', professional_id:null }];
        }
        renderProfessionalsFilter();
        updateAppointmentMetrics();
        renderAppointmentsTable();
        renderCalendar();
        await loadAgendaBlocks();
        applyCommercialLocks();
      } catch (err) {
        console.error("Erro ao carregar agenda:", err);
      } finally {
        if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 400);
      }
    }

    function formatScheduleDateTime(dateStr) {
      if (!dateStr) return '-';
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
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
      const visibleApps = getFilteredAppointments();

      // 1. Total cadastrados: número de conversas no chat (com fallback para total de agendamentos)
      const totalCadastrados = conversations.length > 0 ? conversations.length : appointments.length;
      const metricTotalEl = document.getElementById('metricTotal');
      if (metricTotalEl) metricTotalEl.textContent = String(totalCadastrados);

      // 2. Agendados: pessoas com procedimentos, consultas ou avaliações agendados com antecedência
      const agendados = visibleApps.filter(a => a.status === 'agendado' || a.status === 'pre_agendado').length;
      const metricAgendadosEl = document.getElementById('metricAgendados');
      if (metricAgendadosEl) metricAgendadosEl.textContent = String(agendados);

      // 3. Confirmados: somente quando houver confirmação
      const confirmed = visibleApps.filter(a => a.status === 'confirmado').length;
      const metricConfirmedEl = document.getElementById('metricConfirmed');
      if (metricConfirmedEl) metricConfirmedEl.textContent = String(confirmed);

      // 4. Concluídos: atendimentos finalizados
      const concluidos = visibleApps.filter(a => a.status === 'concluido').length;
      const metricConcluidosEl = document.getElementById('metricConcluidos');
      if (metricConcluidosEl) metricConcluidosEl.textContent = String(concluidos);
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
        titleEl.innerText = `${MONTH_NAMES[calCurrentMonth]} de ${calCurrentYear}`;
      }

      const gridEl = document.getElementById('calendarGrid');
      if (!gridEl) return;

      const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
      const totalDays = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
      const todayStr = new Date().toISOString().slice(0, 10);

      const cells = [];

      for (let i = 0; i < firstDayIndex; i++) {
        cells.push('<div class="p-1 min-h-[64px] rounded-xl bg-neutral-50/40 dark:bg-neutral-800/20 opacity-30 select-none"></div>');
      }

      for (let day = 1; day <= totalDays; day++) {
        const dayPadded = String(day).padStart(2, '0');
        const monthPadded = String(calCurrentMonth + 1).padStart(2, '0');
        const dateKey = `${calCurrentYear}-${monthPadded}-${dayPadded}`;

        const isToday = dateKey === todayStr;
        const isSelected = dateKey === calSelectedDate;

        const visibleApps = getFilteredAppointments();
        const dayAppointments = visibleApps.filter(a => {
          if (!a.scheduled_at) return false;
          return a.scheduled_at.startsWith(dateKey) || a.scheduled_at.includes(dateKey);
        });

        const hasConfirmed = dayAppointments.some(a => a.status === 'confirmado');
        const hasScheduled = dayAppointments.some(a => a.status === 'agendado' || a.status === 'pre_agendado');

        let borderClass = 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600';
        if (isSelected) {
          borderClass = 'border-neutral-500 dark:border-neutral-400 ring-2 ring-neutral-500/30 bg-neutral-50/50 dark:bg-neutral-950/30';
        } else if (isToday) {
          borderClass = 'border-neutral-500 dark:border-neutral-500 bg-neutral-50/30 dark:bg-neutral-950/20';
        }

        let badgeHtml = '';
        if (dayAppointments.length > 0) {
          const count = dayAppointments.length;
          let color = 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300';
          if (hasConfirmed && !hasScheduled) {
            color = 'bg-neutral-100 dark:bg-neutral-950/80 text-neutral-800 dark:text-neutral-300';
          }
          badgeHtml = `
            <div class="mt-1 flex items-center justify-center">
              <span class="px-1.5 py-0.5 rounded-md text-[9px] font-bold ${color} truncate max-w-full">
                ${count} ${count === 1 ? 'consulta' : 'consultas'}
              </span>
            </div>
          `;
        }

        cells.push(`
          <div onclick="calSelectDay('${dateKey}')" 
            class="p-1.5 sm:p-2 min-h-[64px] rounded-xl border ${borderClass} bg-white dark:bg-[#171717] cursor-pointer transition flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold ${isToday ? 'w-5 h-5 rounded-full bg-neutral-500 text-white flex items-center justify-center text-[10px]' : isSelected ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-300'}">
                ${day}
              </span>
              ${isToday ? '<span class="text-[9px] font-bold text-neutral-600 dark:text-neutral-400 hidden sm:inline">Hoje</span>' : ''}
            </div>
            ${badgeHtml}
          </div>
        `);
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

      const visibleApps = getFilteredAppointments();
      const dayAppointments = visibleApps.filter(a => {
        if (!a.scheduled_at) return false;
        return a.scheduled_at.startsWith(calSelectedDate) || a.scheduled_at.includes(calSelectedDate);
      });

      if (dayAppointments.length === 0) {
        container.innerHTML = 
          '<div class="p-8 text-center text-neutral-400 space-y-2">' +
            '<div class="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center text-xl mx-auto">' +
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
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-950/80 text-neutral-800 dark:text-neutral-400 font-bold text-[10px] border border-neutral-200 dark:border-neutral-800/60">Confirmado</span>';
        } else if (isDone) {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-950/80 text-neutral-800 dark:text-neutral-400 font-bold text-[10px] border border-neutral-200 dark:border-neutral-800/60">Concluído</span>';
        } else if (a.status === 'cancelado') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-[10px]">Cancelado</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60">Agendado</span>';
        }

        const profBadge = getProfessionalBadgeHtml(a.professional_id, a.professional_name);
        const noteHtml = a.notes ? '<p class="text-[11px] text-neutral-500 dark:text-neutral-400 italic">“' + escapeHtml(a.notes) + '”</p>' : '';
        const conclBtn = (!isDone && a.status !== 'cancelado') ? '<button onclick="handleConcludeAppointment(' + a.id + ')" class="px-2 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-200 text-[10px] font-bold transition">Concluir</button>' : '';

        return [
          '<div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-2 hover:border-neutral-300 dark:hover:border-neutral-600 transition">',
            '<div class="flex items-start justify-between gap-2">',
              '<div class="flex items-center gap-2">',
                '<span class="px-2 py-1 rounded-lg bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 font-black text-xs font-mono">' + escapeHtml(timePart) + '</span>',
                '<div>',
                  '<h4 class="font-bold text-xs text-neutral-900 dark:text-white leading-tight">' + escapeHtml(a.patient_name) + '</h4>',
                  '<span class="text-[10px] text-neutral-400 font-mono">' + escapeHtml(a.contact_wa_id) + '</span>',
                '</div>',
              '</div>',
              '<div>' + statusBadge + '</div>',
            '</div>',
            '<div class="flex items-center justify-between gap-2 text-xs pt-1 border-t border-neutral-200/60 dark:border-neutral-700/40 text-neutral-600 dark:text-neutral-300">',
              '<div class="flex items-center gap-1.5 truncate">',
                '<i class="fa-solid fa-tooth text-neutral-400 text-[10px]"></i>',
                '<span class="font-medium">' + escapeHtml(a.procedure || 'Consulta') + '</span>',
              '</div>',
              profBadge ? '<div class="shrink-0">' + profBadge + '</div>' : '',
            '</div>',
            noteHtml,
            '<div class="flex items-center justify-end gap-1.5 pt-1">',
              '<button type="button" onclick="openAppointmentDetailsModal(' + a.id + ')" class="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold transition flex items-center gap-1" title="Ver mais informações e editar">',
                '<i class="fa-solid fa-file-lines text-[var(--aura-accent)] dark:text-neutral-400"></i>',
                '<span>Ver mais</span>',
              '</button>',
              '<button onclick="goToChatWithPatient(&quot;' + escapeHtml(a.contact_wa_id) + '&quot;)" class="px-2 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 text-[10px] font-bold transition flex items-center gap-1" title="Abrir conversa no WhatsApp">',
                '<i class="fa-brands fa-whatsapp"></i>',
                '<span>WhatsApp</span>',
              '</button>',
              conclBtn,
              '<button onclick="handleDeleteAppointment(' + a.id + ')" class="p-1 rounded-lg text-neutral-400 hover:text-rose-500 transition" title="Excluir agendamento">',
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

      const visibleApps = getFilteredAppointments();
      const filtered = visibleApps.filter(a => {
        const matchSearch = (a.patient_name || '').toLowerCase().includes(search) || 
                            (a.procedure || '').toLowerCase().includes(search) || 
                            (a.professional_name || '').toLowerCase().includes(search) ||
                            (a.contact_wa_id || '').includes(search);
        const matchStatus = filter === 'todos' || 
                            (filter === 'agendado' ? (a.status === 'agendado' || a.status === 'pre_agendado') : a.status === filter);
        return matchSearch && matchStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-neutral-400">Nenhum agendamento encontrado para os filtros selecionados.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(a => {
        let statusBadge = '';
        if (a.status === 'confirmado') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-950/80 text-neutral-800 dark:text-neutral-400 font-bold text-[10px] border border-neutral-200 dark:border-neutral-800/60">Confirmado</span>';
        } else if (a.status === 'concluido') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-950/80 text-neutral-800 dark:text-neutral-400 font-bold text-[10px] border border-neutral-200 dark:border-neutral-800/60">Concluído</span>';
        } else if (a.status === 'cancelado') {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-[10px]">Cancelado</span>';
        } else {
          statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60">Agendado</span>';
        }

        const formattedDate = formatScheduleDateTime(a.scheduled_at);
        const profBadge = getProfessionalBadgeHtml(a.professional_id, a.professional_name);

        return [
          '<tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition">',
            '<td class="py-3 px-4">',
              '<div class="font-bold text-neutral-900 dark:text-white">' + escapeHtml(a.patient_name) + '</div>',
              '<div class="text-[10px] text-neutral-400 font-mono">' + escapeHtml(a.contact_wa_id) + '</div>',
            '</td>',
            '<td class="py-3 px-4">',
              '<div class="font-semibold text-neutral-800 dark:text-neutral-200">' + escapeHtml(a.procedure || 'Avaliação Inicial') + '</div>',
              profBadge ? '<div class="mt-1">' + profBadge + '</div>' : '',
            '</td>',
            '<td class="py-3 px-4 font-medium text-neutral-700 dark:text-neutral-300">',
              '<i class="fa-regular fa-clock mr-1 text-neutral-400"></i>' + escapeHtml(formattedDate),
            '</td>',
            '<td class="py-3 px-4">',
              statusBadge,
            '</td>',
            '<td class="py-3 px-4">' + escapeHtml(a.created_by_name || 'Não informado') + '</td>',
            '<td class="py-3 px-4 text-center whitespace-nowrap">',
              '<button type="button" onclick="openAppointmentDetailsModal(' + a.id + ')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-500 hover:bg-neutral-50/40 dark:hover:bg-neutral-800 text-[var(--aura-accent)] dark:text-neutral-400 font-bold text-xs transition shadow-sm">',
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
        renderProfessionalsFilter();
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
      const hMatch = s.match(/(\d+)\s*(?:h|hora)/);
      if (hMatch) total += parseInt(hMatch[1], 10) * 60;
      const mMatch = s.match(/(\d+)\s*(?:m|min)/);
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

    function parseLocalHmMinutes(hm) {
      if (!hm || !hm.includes(':')) return null;
      const [h, m] = hm.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    }

    function checkLocalConflict(dateStr, startMinutes, endMinutes, excludeId = null, professionalId = null) {
      const targetProfId = professionalId ? Number(professionalId) : null;

      if (targetProfId) {
        const prof = professionals.find(p => Number(p.id) === targetProfId);
        if (prof) {
          const isActive = Number(prof.active) === 1 || prof.active === true;
          if (!isActive) {
            return { conflict: true, reason: 'O profissional ' + prof.name + ' está pausado/inativo no momento.' };
          }

          const [yy, mm, dd] = dateStr.split('-').map(Number);
          const dayOfWeek = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1)).getUTCDay();
          const workingDays = parseProfWorkingDays(prof.working_days);
          if (!workingDays.includes(dayOfWeek)) {
            const daysLabel = workingDays.map(d => PROF_WEEKDAY_SHORT[d] || '').filter(Boolean).join(', ');
            return {
              conflict: true,
              reason: prof.name + ' não atende neste dia (' + (PROF_WEEKDAY_SHORT[dayOfWeek] || '') + '). Dias: ' + (daysLabel || 'não configurados') + '.'
            };
          }

          const shiftStart = parseLocalHmMinutes(prof.start_hour);
          const shiftEnd = parseLocalHmMinutes(prof.end_hour);
          if (shiftStart !== null && shiftEnd !== null && (startMinutes < shiftStart || endMinutes > shiftEnd)) {
            return {
              conflict: true,
              reason: 'Horário fora do expediente de ' + prof.name + ' (' + prof.start_hour + ' às ' + prof.end_hour + ').'
            };
          }

          const breakStart = parseLocalHmMinutes(prof.break_start);
          const breakEnd = parseLocalHmMinutes(prof.break_end);
          if (breakStart !== null && breakEnd !== null && breakStart < breakEnd) {
            if (startMinutes < breakEnd && endMinutes > breakStart) {
              return {
                conflict: true,
                reason: 'Horário coincide com o intervalo de ' + prof.name + ' (' + prof.break_start + ' às ' + prof.break_end + ').'
              };
            }
          }
        }
      }

      for (const a of appointments) {
        if (excludeId && a.id === excludeId) continue;
        if (a.status === 'cancelado') continue;
        if (!a.scheduled_at) continue;

        const existingProfId = a.professional_id ? Number(a.professional_id) : null;
        if (targetProfId) {
          if (existingProfId !== targetProfId) continue;
        } else if (existingProfId) {
          continue;
        }

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
      const profSelect = document.getElementById('appProfessional');
      const feedbackEl = document.getElementById('appTimeSlotFeedback');
      const submitBtn = document.getElementById('btnSaveAppointmentModal');

      if (!feedbackEl) return;

      const dateVal = dateInput ? dateInput.value : '';
      const hourVal = hourSelect ? hourSelect.value : '09';
      const minVal = minSelect ? minSelect.value : '00';
      const procVal = procSelect ? procSelect.value : '';
      const profVal = profSelect ? profSelect.value : '';
      const profId = profVal ? Number(profVal) : null;

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
        feedbackEl.innerHTML = '<span class="text-neutral-500 dark:text-neutral-400">Duração prevista: <strong>' + timeSlotText + '</strong>. Selecione uma data para verificar conflitos.</span>';
        feedbackEl.className = "mt-2 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/40 text-[11px] transition-all";
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      const check = checkLocalConflict(dateVal, startTotalMin, endTotalMin, null, profId);
      if (check.conflict) {
        const conflictDetail = check.reason
          ? '<span>' + escapeHtml(check.reason) + '</span>'
          : '<span>Já existe consulta para <strong>' + escapeHtml(check.patientName) + '</strong> agendada das <strong>' + check.startStr + ' às ' + check.endStr + '</strong>. Escolha outro horário, profissional ou data.</span>';

        feedbackEl.innerHTML = [
          '<div class="flex items-start gap-2 text-rose-600 dark:text-rose-400 font-medium">',
            '<i class="fa-solid fa-triangle-exclamation text-rose-500 mt-0.5"></i>',
            '<div>',
              '<span class="font-bold block">Horário indisponível</span>',
              conflictDetail,
            '</div>',
          '</div>'
        ].join('');
        feedbackEl.className = "mt-2 p-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-[11px] transition-all";
        if (submitBtn) submitBtn.disabled = true;
      } else {
        feedbackEl.innerHTML = [
          '<div class="flex items-center justify-between text-neutral-700 dark:text-neutral-300">',
            '<div class="flex items-center gap-2">',
              '<i class="fa-solid fa-circle-check text-neutral-500"></i>',
              '<span>Duração prevista: <strong>' + timeSlotText + '</strong></span>',
            '</div>',
            '<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-500/20 text-neutral-800 dark:text-neutral-300">Disponível</span>',
          '</div>'
        ].join('');
        feedbackEl.className = "mt-2 p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-900/60 bg-neutral-50/80 dark:bg-neutral-950/30 text-[11px] transition-all";
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    function openAppointmentModal(defaultProc = '', defaultDate = '', defaultTime = '09:00') {
      if (currentAccess && !currentAccess.can_operate) return showToast('Ative o atendimento para criar consultas reais.', 'amber');
      if (!isCrucialTrainingComplete()) {
        const missing = getMissingListFromConfig(currentConfig);
        alert("Treinamento obrigatório pendente:\n• " + missing.join("\n• ") + "\n\nVamos abrir o Treinamento da IA com os campos destacados em vermelho.");
        goToTrainingAndHighlightMissing();
        return;
      }

      populateProcedureSelect(defaultProc);
      const preferredProfId = (selectedAgendaProfId !== 'all' && selectedAgendaProfId !== 'unassigned') ? selectedAgendaProfId : '';
      populateAppointmentProfessionalSelects(preferredProfId);

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
      const profRaw = document.getElementById('appProfessional')?.value || '';
      const professionalId = profRaw ? Number(profRaw) : null;
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
          body: JSON.stringify({ patientName, contactWaId, procedure, scheduledAt, status, notes, duration, professionalId })
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
          confirmBadge.innerHTML = '<span class="text-neutral-600 dark:text-neutral-400 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Confirmado ' + (app.confirmed_by === 'ai' ? 'pela IA' : '') + '</span>';
        } else {
          confirmBadge.innerHTML = '';
        }
      }

      populateDetailProfessionalSelect(app.professional_id ? String(app.professional_id) : '');

      const detStatus = document.getElementById('detStatus');
      if (detStatus) {
        detStatus.value = (app.status === 'pre_agendado') ? 'agendado' : (app.status || 'agendado');
      }

      const detNotes = document.getElementById('detNotes');
      if (detNotes) {
        detNotes.value = app.notes || '';
      }

      document.getElementById('appointmentDetailsModal').classList.remove('hidden');
      applyCommercialLocks();
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
      const profRaw = document.getElementById('detProfessional')?.value || '';
      const professionalId = profRaw ? Number(profRaw) : null;

      const saveBtn = document.getElementById('btnSaveAppointmentDetails');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Salvando...';
      }

      try {
        const res = await fetch('/api/appointments', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: activeDetailAppointmentId, status: newStatus, notes: newNotes, professionalId })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Falha ao salvar");

        const target = appointments.find(a => a.id === activeDetailAppointmentId);
        if (target) {
          target.status = newStatus;
          target.notes = newNotes;
          target.professional_id = professionalId;
          const profObj = professionalId ? professionals.find(p => Number(p.id) === professionalId) : null;
          target.professional_name = profObj ? profObj.name : null;
          if (newStatus === 'confirmado' && !target.confirmed_at) {
            target.confirmed_by = 'manual';
            target.confirmed_at = new Date().toISOString();
          }
        }

        renderProfessionalsFilter();
        updateAppointmentMetrics();
        renderAppointmentsTable();
        renderCalendar();
        renderDailySchedule();
        closeAppointmentDetailsModal();
        showToast("Alterações salvas com sucesso!", "emerald");
      } catch (err) {
        alert(err?.message || "Erro ao salvar alterações da consulta.");
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
        renderProfessionalsFilter();
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
