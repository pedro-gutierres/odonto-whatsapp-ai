    const PROF_WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    function parseProfWorkingDays(raw) {
      if (Array.isArray(raw)) return raw.map(Number);
      try {
        const parsed = JSON.parse(raw || '[1,2,3,4,5]');
        if (Array.isArray(parsed)) return parsed.map(Number);
      } catch {}
      return [1, 2, 3, 4, 5];
    }

    function parseProfProcedures(raw) {
      if (Array.isArray(raw)) return raw.map(String);
      try {
        const parsed = JSON.parse(raw || '[]');
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {}
      return [];
    }

    function sanitizeHexColor(hex) {
      return /^#[0-9a-fA-F]{3,8}$/.test(String(hex || '').trim()) ? String(hex).trim() : '#10b981';
    }

    function getProfessionalBadgeHtml(profId, profName) {
      const prof = profId ? professionals.find(p => Number(p.id) === Number(profId)) : null;
      const name = prof ? prof.name : (profName || '');
      if (!name) return '';
      const color = sanitizeHexColor(prof ? prof.color : '#0ea5e9');
      return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200 max-w-full">' +
               '<span class="w-2 h-2 rounded-full shrink-0" style="background-color:' + color + '"></span>' +
               '<span class="truncate">' + escapeHtml(name) + '</span>' +
             '</span>';
    }

    async function loadProfessionals() {
      try {
        const res = await fetch('/api/professionals');
        if (!res.ok) return;
        const data = await res.json();
        professionals = Array.isArray(data.professionals) ? data.professionals : [];

        const badge = document.getElementById('profCountBadge');
        if (badge) {
          badge.innerText = String(professionals.filter(p => Number(p.active) === 1 || p.active === true).length);
        }

        renderProfessionalsFilter();
        await loadAgendaBlocks();
        await loadOnboarding();
        populateAppointmentProfessionalSelects();
        const modalEl = document.getElementById('professionalsModal');
        if (modalEl && !modalEl.classList.contains('hidden')) {
          renderProfessionalsList();
        }
        renderCalendar();
        renderAppointmentsTable();
      } catch (err) {
        console.error('Erro ao carregar profissionais:', err);
      }
    }

    function renderProfessionalsFilter() {
      const select = document.getElementById('agendaProfessionalFilter');
      if (select) {
        let opts = '<option value="all">Todos os Profissionais</option>';
        opts += '<option value="unassigned">Agenda Geral (Sem profissional)</option>';
        professionals.forEach(p => {
          const isActive = Number(p.active) === 1 || p.active === true;
          const label = p.name + (p.specialty ? ' — ' + p.specialty : '') + (isActive ? '' : ' (Pausado)');
          opts += '<option value="' + p.id + '">' + escapeHtml(label) + '</option>';
        });
        select.innerHTML = opts;
        const hasVal = Array.from(select.options).some(o => o.value === String(selectedAgendaProfId));
        if (!hasVal) selectedAgendaProfId = 'all';
        select.value = String(selectedAgendaProfId);
      }

      const chipsEl = document.getElementById('agendaProfChips');
      if (!chipsEl) return;

      if (professionals.length === 0) {
        chipsEl.classList.add('hidden');
        chipsEl.innerHTML = '';
        return;
      }

      chipsEl.classList.remove('hidden');
      let chipsHtml = '';
      const allActive = selectedAgendaProfId === 'all';
      chipsHtml += '<button type="button" onclick="setAgendaProfFilter(&quot;all&quot;)" class="px-3 py-1.5 rounded-full text-xs font-bold border transition ' +
        (allActive
          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
          : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400') +
        '">Todos (' + appointments.length + ')</button>';

      professionals.forEach(p => {
        const isSel = String(selectedAgendaProfId) === String(p.id);
        const color = sanitizeHexColor(p.color);
        const count = appointments.filter(a => Number(a.professional_id) === Number(p.id)).length;
        const isActive = Number(p.active) === 1 || p.active === true;
        chipsHtml += '<button type="button" onclick="setAgendaProfFilter(&quot;' + p.id + '&quot;)" class="px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ' +
          (isSel
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
            : 'bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-400') +
          (isActive ? '' : ' opacity-60') + '">' +
          '<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color:' + (isSel ? '#ffffff' : color) + '"></span>' +
          '<span>' + escapeHtml(p.name) + '</span>' +
          '<span class="text-[10px] opacity-75">(' + count + ')</span>' +
        '</button>';
      });

      const unassignedCount = appointments.filter(a => !a.professional_id).length;
      if (unassignedCount > 0) {
        const isUnassigned = selectedAgendaProfId === 'unassigned';
        chipsHtml += '<button type="button" onclick="setAgendaProfFilter(&quot;unassigned&quot;)" class="px-3 py-1.5 rounded-full text-xs font-bold border transition ' +
          (isUnassigned
            ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
            : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400') +
          '">Agenda Geral (' + unassignedCount + ')</button>';
      }

      chipsEl.innerHTML = chipsHtml;
    }

    function setAgendaProfFilter(id) {
      selectedAgendaProfId = String(id || 'all');
      renderProfessionalsFilter();
      updateAppointmentMetrics();
      renderCalendar();
      renderAppointmentsTable();
    }

    function onAgendaProfessionalFilterChange() {
      const sel = document.getElementById('agendaProfessionalFilter');
      setAgendaProfFilter(sel ? sel.value : 'all');
    }

    function populateAppointmentProfessionalSelects(preferredCreateId) {
      const createSel = document.getElementById('appProfessional');
      if (createSel) {
        const currentVal = preferredCreateId !== undefined ? String(preferredCreateId) : createSel.value;
        let opts = '<option value="">Agenda Geral (Sem profissional específico)</option>';
        professionals.forEach(p => {
          const isActive = Number(p.active) === 1 || p.active === true;
          if (!isActive && String(p.id) !== currentVal) return;
          const label = p.name + (p.specialty ? ' (' + p.specialty + ')' : '') + (isActive ? '' : ' [Pausado]');
          opts += '<option value="' + p.id + '">' + escapeHtml(label) + '</option>';
        });
        createSel.innerHTML = opts;
        if (currentVal && Array.from(createSel.options).some(o => o.value === currentVal)) {
          createSel.value = currentVal;
        }
      }
    }

    function populateDetailProfessionalSelect(selectedId) {
      const detSel = document.getElementById('detProfessional');
      if (!detSel) return;
      const valStr = selectedId ? String(selectedId) : '';
      let opts = '<option value="">Agenda Geral</option>';
      professionals.forEach(p => {
        const isActive = Number(p.active) === 1 || p.active === true;
        const label = p.name + (p.specialty ? ' (' + p.specialty + ')' : '') + (isActive ? '' : ' (Pausado)');
        opts += '<option value="' + p.id + '">' + escapeHtml(label) + '</option>';
      });
      detSel.innerHTML = opts;
      detSel.value = Array.from(detSel.options).some(o => o.value === valStr) ? valStr : '';
    }

    function selectProfColor(hex) {
      const cleanHex = sanitizeHexColor(hex);
      const input = document.getElementById('profColor');
      if (input) input.value = cleanHex;
      document.querySelectorAll('.prof-color-btn').forEach(btn => {
        if (btn.getAttribute('data-color') === cleanHex) {
          btn.classList.add('ring-2', 'ring-offset-2', 'ring-slate-900', 'dark:ring-white');
        } else {
          btn.classList.remove('ring-2', 'ring-offset-2', 'ring-slate-900', 'dark:ring-white');
        }
      });
    }

    function populateProfProceduresCheckboxes(selectedList = []) {
      const container = document.getElementById('profProceduresCheckboxes');
      if (!container) return;

      const selectedSet = new Set((selectedList || []).map(s => String(s).trim()).filter(Boolean));
      const names = ['Avaliação Inicial / Consulta'];

      if (currentConfig && Array.isArray(currentConfig.procedure_items) && currentConfig.procedure_items.length > 0) {
        currentConfig.procedure_items.filter(p => p.checked !== false).forEach(p => {
          if (p.name && !names.includes(p.name)) names.push(p.name);
        });
      } else {
        DEFAULT_ODONTO_SERVICES.concat(DEFAULT_ESTETICA_SERVICES).forEach(p => {
          if (p.name && !names.includes(p.name)) names.push(p.name);
        });
      }

      selectedSet.forEach(s => {
        if (!names.includes(s)) names.push(s);
      });

      container.innerHTML = names.map(name => {
        const checkedAttr = selectedSet.has(name) ? ' checked' : '';
        return '<label class="flex items-center gap-2 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-[11px]">' +
          '<input type="checkbox" name="profProcedureItem" value="' + escapeHtml(name) + '"' + checkedAttr + ' class="rounded">' +
          '<span class="truncate">' + escapeHtml(name) + '</span>' +
        '</label>';
      }).join('');
    }

    function resetProfessionalForm() {
      const editId = document.getElementById('profEditId');
      if (editId) editId.value = '';
      const title = document.getElementById('profFormTitle');
      if (title) title.innerText = 'Novo Profissional';
      const saveBtn = document.getElementById('btnSaveProfessional');
      if (saveBtn) saveBtn.innerText = 'Salvar Profissional';

      const nameEl = document.getElementById('profName');
      if (nameEl) nameEl.value = '';
      const specEl = document.getElementById('profSpecialty');
      if (specEl) specEl.value = '';
      const croEl = document.getElementById('profCro');
      if (croEl) croEl.value = '';

      document.querySelectorAll('input[name="profWorkDay"]').forEach(cb => {
        const day = parseInt(cb.value, 10);
        cb.checked = day >= 1 && day <= 5;
      });

      const startEl = document.getElementById('profStartHour');
      if (startEl) startEl.value = '08:00';
      const endEl = document.getElementById('profEndHour');
      if (endEl) endEl.value = '18:00';
      const breakStartEl = document.getElementById('profBreakStart');
      if (breakStartEl) breakStartEl.value = '12:00';
      const breakEndEl = document.getElementById('profBreakEnd');
      if (breakEndEl) breakEndEl.value = '13:00';

      selectProfColor('#10b981');
      populateProfProceduresCheckboxes([]);
    }

    function openProfessionalsModal() {
      resetProfessionalForm();
      const modal = document.getElementById('professionalsModal');
      if (modal) modal.classList.remove('hidden');
      renderProfessionalsList();
      loadProfessionals();
    }

    function closeProfessionalsModal() {
      const modal = document.getElementById('professionalsModal');
      if (modal) modal.classList.add('hidden');
    }

    function renderProfessionalsList() {
      const listEl = document.getElementById('professionalsList');
      if (!listEl) return;

      if (professionals.length === 0) {
        listEl.innerHTML =
          '<div class="p-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs space-y-2">' +
            '<i class="fa-solid fa-user-doctor text-2xl opacity-50"></i>' +
            '<p class="font-medium text-slate-600 dark:text-slate-300">Nenhum profissional cadastrado.</p>' +
            '<p class="text-[11px]">Cadastre dentistas ou esteticistas ao lado para liberar agendas independentes na mesma hora.</p>' +
          '</div>';
        return;
      }

      listEl.innerHTML = professionals.map(p => {
        const isActive = Number(p.active) === 1 || p.active === true;
        const color = sanitizeHexColor(p.color);
        const days = parseProfWorkingDays(p.working_days).map(d => PROF_WEEKDAY_SHORT[d] || '').filter(Boolean).join(', ');
        const procs = parseProfProcedures(p.procedures_json);
        const breakTxt = (p.break_start && p.break_end) ? ' • Intervalo ' + p.break_start + '–' + p.break_end : '';
        const procsTxt = procs.length > 0 ? procs.length + (procs.length === 1 ? ' procedimento' : ' procedimentos') : 'Todos os procedimentos';

        return '<div class="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">' +
          '<div class="flex items-start justify-between gap-2">' +
            '<div class="flex items-center gap-2 min-w-0">' +
              '<span class="w-3 h-3 rounded-full shrink-0" style="background-color:' + color + '"></span>' +
              '<div class="min-w-0">' +
                '<div class="font-bold text-xs text-slate-900 dark:text-white truncate">' + escapeHtml(p.name) + '</div>' +
                '<div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">' +
                  escapeHtml([p.specialty, p.cro_crm].filter(Boolean).join(' • ') || 'Sem especialidade informada') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<button type="button" onclick="toggleProfessionalActive(' + p.id + ', ' + (isActive ? 'false' : 'true') + ')" class="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' +
              (isActive ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300') + '">' +
              (isActive ? 'Ativo' : 'Pausado') +
            '</button>' +
          '</div>' +
          '<div class="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">' +
            '<div><i class="fa-regular fa-calendar mr-1"></i>' + escapeHtml(days || 'Dias não definidos') + '</div>' +
            '<div><i class="fa-regular fa-clock mr-1"></i>' + escapeHtml((p.start_hour || '08:00') + ' às ' + (p.end_hour || '18:00') + breakTxt) + '</div>' +
            '<div><i class="fa-solid fa-tooth mr-1"></i>' + escapeHtml(procsTxt) + '</div>' +
          '</div>' +
          '<div class="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">' +
            '<button type="button" onclick="editProfessionalInModal(' + p.id + ')" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700">Editar</button>' +
            '<button type="button" onclick="handleDeleteProfessional(' + p.id + ')" class="px-2.5 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[10px] font-bold">Excluir</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function editProfessionalInModal(id) {
      const prof = professionals.find(p => Number(p.id) === Number(id));
      if (!prof) return;

      document.getElementById('profEditId').value = String(prof.id);
      document.getElementById('profFormTitle').innerText = 'Editando: ' + prof.name;
      document.getElementById('btnSaveProfessional').innerText = 'Atualizar Profissional';

      document.getElementById('profName').value = prof.name || '';
      document.getElementById('profSpecialty').value = prof.specialty || '';
      document.getElementById('profCro').value = prof.cro_crm || '';

      const daysSet = new Set(parseProfWorkingDays(prof.working_days));
      document.querySelectorAll('input[name="profWorkDay"]').forEach(cb => {
        cb.checked = daysSet.has(parseInt(cb.value, 10));
      });

      document.getElementById('profStartHour').value = prof.start_hour || '08:00';
      document.getElementById('profEndHour').value = prof.end_hour || '18:00';
      document.getElementById('profBreakStart').value = prof.break_start || '';
      document.getElementById('profBreakEnd').value = prof.break_end || '';

      selectProfColor(prof.color || '#10b981');
      populateProfProceduresCheckboxes(parseProfProcedures(prof.procedures_json));
    }

    async function toggleProfessionalActive(id, nextActive) {
      try {
        const res = await fetch('/api/professionals', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: Number(id), active: Boolean(nextActive) })
        });
        if (!res.ok) throw new Error('Falha ao atualizar status do profissional.');
        await loadProfessionals();
        showToast(nextActive ? 'Profissional ativado!' : 'Profissional pausado!', 'emerald');
      } catch (err) {
        alert(err?.message || 'Erro ao alterar status.');
      }
    }

    async function handleSaveProfessional(e) {
      e.preventDefault();
      const editIdRaw = document.getElementById('profEditId')?.value || '';
      const id = editIdRaw ? parseInt(editIdRaw, 10) : null;
      const name = (document.getElementById('profName')?.value || '').trim();
      const specialty = (document.getElementById('profSpecialty')?.value || '').trim();
      const croCrm = (document.getElementById('profCro')?.value || '').trim();
      const startHour = document.getElementById('profStartHour')?.value || '08:00';
      const endHour = document.getElementById('profEndHour')?.value || '18:00';
      const breakStart = (document.getElementById('profBreakStart')?.value || '').trim() || null;
      const breakEnd = (document.getElementById('profBreakEnd')?.value || '').trim() || null;
      const color = document.getElementById('profColor')?.value || '#10b981';

      const workingDays = Array.from(document.querySelectorAll('input[name="profWorkDay"]:checked')).map(cb => parseInt(cb.value, 10));
      const procedures = Array.from(document.querySelectorAll('input[name="profProcedureItem"]:checked')).map(cb => cb.value);

      if (!name) {
        alert('Informe o nome do profissional.');
        return;
      }
      if (workingDays.length === 0) {
        alert('Selecione pelo menos 1 dia de atendimento.');
        return;
      }
      if (startHour >= endHour) {
        alert('O horário de início deve ser menor que o horário de término.');
        return;
      }
      if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) {
        alert('Informe início e fim do intervalo de almoço ou deixe ambos vazios.');
        return;
      }
      if (breakStart && breakEnd && breakStart >= breakEnd) {
        alert('O início do intervalo deve ser menor que o fim.');
        return;
      }

      const saveBtn = document.getElementById('btnSaveProfessional');
      const prevTxt = saveBtn ? saveBtn.innerText : 'Salvar Profissional';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Salvando...';
      }

      try {
        const res = await fetch('/api/professionals', {
          method: id ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: id || undefined,
            name,
            specialty,
            croCrm,
            workingDays,
            startHour,
            endHour,
            breakStart,
            breakEnd,
            procedures,
            color
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar profissional.');

        resetProfessionalForm();
        await loadProfessionals();
        showToast(id ? 'Profissional atualizado!' : 'Profissional cadastrado!', 'emerald');
      } catch (err) {
        alert(err?.message || 'Erro de comunicação ao salvar profissional.');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerText = prevTxt;
        }
      }
    }

    async function handleDeleteProfessional(id) {
      if (!confirm('Excluir este profissional? As consultas já agendadas serão mantidas na Agenda Geral.')) return;
      try {
        const res = await fetch('/api/professionals?id=' + id, { method: 'DELETE' });
        if (!res.ok) throw new Error('Falha ao excluir profissional.');

        if (String(document.getElementById('profEditId')?.value || '') === String(id)) {
          resetProfessionalForm();
        }
        if (String(selectedAgendaProfId) === String(id)) {
          selectedAgendaProfId = 'all';
        }
        await loadProfessionals();
        await loadAppointments();
        showToast('Profissional excluído!', 'amber');
      } catch (err) {
        alert(err?.message || 'Erro ao excluir profissional.');
      }
    }
