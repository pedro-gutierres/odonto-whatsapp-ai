    // VERIFICAÇÃO DE TREINAMENTO CRUCIAL & DESTAQUE VISUAL EM VERMELHO
    function getMissingListFromConfig(cfg) {
      const missing = [];
      if (!cfg || !cfg.clinic_name || !cfg.clinic_name.trim()) {
        missing.push('Nome do negócio');
      }
      if (!cfg || !cfg.initial_consultation || !cfg.initial_consultation.duration || !cfg.initial_consultation.duration.trim()) {
        missing.push('Duração da primeira avaliação');
      }
      if (!cfg || !Array.isArray(cfg.procedure_items)) {
        missing.push('Serviços e durações');
      } else {
        const activeItems = cfg.procedure_items.filter(p => p.checked !== false);
        if (activeItems.length === 0) {
          missing.push('Ao menos um serviço com duração');
        } else {
          const invalidCount = activeItems.filter(p => !p.name || !p.name.trim() || !p.duration || !p.duration.trim()).length;
          if (invalidCount > 0) {
            missing.push(invalidCount + ' procedimento(s) selecionado(s) sem Nome ou Tempo de Duração');
          }
        }
      }
      if (!cfg || !cfg.hours || !cfg.hours.trim()) {
        missing.push('Dias e horários de atendimento');
      }
      return missing;
    }

    function isCrucialTrainingComplete() {
      return getMissingListFromConfig(currentConfig).length === 0;
    }

    function scrollToMissingField(elementId) {
      if(elementId==='cfgHours')elementId='trainingSchedule';
      const el = document.getElementById(elementId);
      if (!el) return;
      for(let parent=el.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
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
          for(let parent=row.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => { if (nameEl) nameEl.focus({ preventScroll: true }); }, 350);
          return;
        }
        if (!durEl || !durEl.value.trim()) {
          for(let parent=row.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
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

      // 1. Nome do negócio
      const clinicNameEl = document.getElementById('cfgClinicName');
      const lblClinicName = document.getElementById('lblCfgClinicName');
      const badgeClinicName = document.getElementById('badgeCfgClinicName');
      const errClinicName = document.getElementById('errCfgClinicName');
      const hasClinicName = !!(clinicNameEl && clinicNameEl.value.trim());

      if (clinicNameEl) {
        if (!hasClinicName) {
          clinicNameEl.classList.add('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          clinicNameEl.classList.remove('border', 'border-neutral-200', 'dark:border-neutral-700/60', 'bg-neutral-50', 'dark:bg-neutral-800/80');
          if (lblClinicName) {
            lblClinicName.classList.add('text-rose-600', 'dark:text-rose-400');
            lblClinicName.classList.remove('text-neutral-700', 'dark:text-neutral-300');
          }
          if (badgeClinicName) {
            badgeClinicName.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white';
            badgeClinicName.innerText = 'Obrigatório';
          }
          if (errClinicName) {
            errClinicName.innerText = 'informe o nome oficial da clínica.';
            errClinicName.classList.remove('hidden');
          }
          missingLive.push({ action: "scrollToMissingField('cfgClinicName')", label: 'Nome do negócio' });
        } else {
          clinicNameEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          clinicNameEl.classList.add('border', 'border-neutral-200', 'dark:border-neutral-700/60', 'bg-neutral-50', 'dark:bg-neutral-800/80');
          if (lblClinicName) {
            lblClinicName.classList.remove('text-rose-600', 'dark:text-rose-400');
            lblClinicName.classList.add('text-neutral-700', 'dark:text-neutral-300');
          }
          if (badgeClinicName) {
            badgeClinicName.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-500/15 text-neutral-700 dark:text-neutral-400';
            badgeClinicName.innerText = '✓ Preenchido';
          }
          if (errClinicName) errClinicName.classList.add('hidden');
        }
      }

      // 2. Avaliação Inicial: Tempo de Duração
      const initDurEl = document.getElementById('cfgInitEvalDuration');
      const cardInitContainer = document.getElementById('cardInitEvalContainer');
      const lblInitDur = document.getElementById('lblCfgInitEvalDuration');
      const badgeInitDur = document.getElementById('badgeCfgInitEvalDuration');
      const errInitDur = document.getElementById('errCfgInitEvalDuration');
      const hasInitDur = !!(initDurEl && initDurEl.value.trim());

      if (initDurEl) {
        if (!hasInitDur) {
          initDurEl.classList.add('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/60', 'dark:bg-rose-950/30');
          initDurEl.classList.remove('border', 'border-neutral-200', 'dark:border-neutral-700', 'bg-white', 'dark:bg-neutral-800');
          if (cardInitContainer) {
            cardInitContainer.classList.add('border-rose-500', 'bg-rose-50/40', 'dark:bg-rose-950/20');
            cardInitContainer.classList.remove('border-neutral-500/30', 'bg-neutral-50/40', 'dark:bg-neutral-950/20');
          }
          if (lblInitDur) {
            lblInitDur.classList.add('text-rose-600', 'dark:text-rose-400');
            lblInitDur.classList.remove('text-neutral-700', 'dark:text-neutral-300');
          }
          if (badgeInitDur) {
            badgeInitDur.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white';
            badgeInitDur.innerText = 'Obrigatório';
          }
          if (errInitDur) {
            errInitDur.innerText = 'informe o tempo da Avaliação Inicial (ex: 30 min).';
            errInitDur.classList.remove('hidden');
          }
          missingLive.push({ action: "scrollToMissingField('cfgInitEvalDuration')", label: 'Duração da primeira avaliação / Consulta' });
        } else {
          initDurEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/60', 'dark:bg-rose-950/30');
          initDurEl.classList.add('border', 'border-neutral-200', 'dark:border-neutral-700', 'bg-white', 'dark:bg-neutral-800');
          if (cardInitContainer) {
            cardInitContainer.classList.remove('border-rose-500', 'bg-rose-50/40', 'dark:bg-rose-950/20');
            cardInitContainer.classList.add('border-neutral-500/30', 'bg-neutral-50/40', 'dark:bg-neutral-950/20');
          }
          if (lblInitDur) {
            lblInitDur.classList.remove('text-rose-600', 'dark:text-rose-400');
            lblInitDur.classList.add('text-neutral-700', 'dark:text-neutral-300');
          }
          if (badgeInitDur) {
            badgeInitDur.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-500/15 text-neutral-700 dark:text-neutral-400';
            badgeInitDur.innerText = '✓ Preenchido';
          }
          if (errInitDur) errInitDur.classList.add('hidden');
        }
      }

      // 3. Procedimentos Selecionados e Durações
      const procRows = document.querySelectorAll('.proc-row');
      let checkedProcCount = 0;
      let invalidProcCount = 0;

      procRows.forEach(row => {
        const cb = row.querySelector('.proc-checkbox');
        const nameEl = row.querySelector('.proc-name');
        const durEl = row.querySelector('.proc-duration');
        const nameErrEl = row.querySelector('.proc-name-err');
        const durErrEl = row.querySelector('.proc-duration-err');
        const isChecked = !!(cb && cb.checked) && trainingCategoryEnabled(row.dataset.category);

        if (isChecked) {
          checkedProcCount++;
          const hasName = !!(nameEl && nameEl.value.trim());
          const hasDur = !!(durEl && durEl.value.trim());

          if (!hasName || !hasDur) {
            invalidProcCount++;
            row.classList.add('border-2', 'border-rose-500', 'bg-rose-50/50', 'dark:bg-rose-950/30');
            row.classList.remove('border', 'border-neutral-200', 'dark:border-neutral-700/60', 'bg-neutral-50', 'dark:bg-neutral-800/40');
          } else {
            row.classList.remove('border-2', 'border-rose-500', 'bg-rose-50/50', 'dark:bg-rose-950/30');
            row.classList.add('border', 'border-neutral-200', 'dark:border-neutral-700/60', 'bg-neutral-50', 'dark:bg-neutral-800/40');
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
              durEl.classList.remove('border', 'border-neutral-200', 'dark:border-neutral-700', 'bg-white', 'dark:bg-neutral-800');
              if (durErrEl) durErrEl.classList.remove('hidden');
            } else {
              durEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50', 'dark:bg-rose-950/40');
              durEl.classList.add('border', 'border-neutral-200', 'dark:border-neutral-700', 'bg-white', 'dark:bg-neutral-800');
              if (durErrEl) durErrEl.classList.add('hidden');
            }
          }
        } else {
          row.classList.remove('border-2', 'border-rose-500', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          row.classList.add('border', 'border-neutral-200', 'dark:border-neutral-700/60', 'bg-neutral-50', 'dark:bg-neutral-800/40');
          if (nameEl) nameEl.classList.remove('border-b-2', 'border-rose-500', 'text-rose-700', 'dark:text-rose-300');
          if (durEl) {
            durEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50', 'dark:bg-rose-950/40');
            durEl.classList.add('border', 'border-neutral-200', 'dark:border-neutral-700', 'bg-white', 'dark:bg-neutral-800');
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
        missingLive.push({ action: "scrollToMissingField('odontoList')", label: 'Pelo menos 1 Procedimento marcado em Odonto ou Estética' });
      } else if (invalidProcCount > 0) {
        if (procAlertEl) {
          procAlertEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-500 shrink-0"></i><span>Existem <strong>' + invalidProcCount + ' procedimento(s) marcado(s) em vermelho</strong> sem Nome ou Tempo de Duração. Preencha ou desmarque-os.</span>';
          procAlertEl.classList.remove('hidden');
        }
        missingLive.push({ action: "scrollToFirstInvalidProcedure()", label: invalidProcCount + ' procedimento(s) selecionado(s) sem Nome ou Tempo de Duração' });
      } else if (procAlertEl) {
        procAlertEl.classList.add('hidden');
      }

      // 4. Dias e horários de atendimento
      const hoursEl = document.getElementById('cfgHours');
      const lblHours = document.getElementById('lblCfgHours');
      const badgeHours = document.getElementById('badgeCfgHours');
      const errHours = document.getElementById('errCfgHours');
      const hasHours = !!(hoursEl && hoursEl.value.trim());

      if (hoursEl) {
        if (!hasHours) {
          hoursEl.classList.add('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          hoursEl.classList.remove('border', 'border-neutral-200', 'dark:border-neutral-700/60', 'bg-neutral-50', 'dark:bg-neutral-800/80');
          if (lblHours) {
            lblHours.classList.add('text-rose-600', 'dark:text-rose-400');
            lblHours.classList.remove('text-neutral-700', 'dark:text-neutral-300');
          }
          if (badgeHours) {
            badgeHours.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white';
            badgeHours.innerText = 'Obrigatório';
          }
          if (errHours) {
            errHours.innerText = 'informe os horários e dias em que a clínica atende.';
            errHours.classList.remove('hidden');
          }
          missingLive.push({ action: "scrollToMissingField('cfgHours')", label: 'Dias e horários de atendimento' });
        } else {
          hoursEl.classList.remove('border-2', 'border-rose-500', 'ring-2', 'ring-rose-500/20', 'bg-rose-50/50', 'dark:bg-rose-950/30');
          hoursEl.classList.add('border', 'border-neutral-200', 'dark:border-neutral-700/60', 'bg-neutral-50', 'dark:bg-neutral-800/80');
          if (lblHours) {
            lblHours.classList.remove('text-rose-600', 'dark:text-rose-400');
            lblHours.classList.add('text-neutral-700', 'dark:text-neutral-300');
          }
          if (badgeHours) {
            badgeHours.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-500/15 text-neutral-700 dark:text-neutral-400';
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

      statusBanner.className='aura-note';
      if (missingLive.length > 0) {
        statusBanner.innerHTML='<b class="text-xs">Falta preencher o essencial</b><div class="aura-missing-fields">'+missingLive.map(item=>'<button type="button" onclick="'+item.action+'">'+escapeHtml(item.label)+'</button>').join('')+'</div>';
      } else if (!savedComplete) {
        statusBanner.innerHTML='<div class="flex flex-wrap justify-between items-center gap-3"><span>Informações prontas. Salve o treinamento para continuar.</span><button type="button" onclick="saveClinicConfig()" class="aura-text-button">Salvar treinamento</button></div>';
      } else {
        statusBanner.innerHTML='<span>Informações essenciais preenchidas. Salve as alterações para atualizar sua IA.</span>';
      }
    }

    function updateCrucialTrainingLockUI() {
      const missingSaved = getMissingListFromConfig(currentConfig);
      const complete = missingSaved.length === 0;
      const missingText = missingSaved.length > 0
        ? 'Complete em Meu negócio e IA: ' + missingSaved.join(' • ') + '.'
        : 'As informações essenciais estão salvas.';

      // Badge global na sidebar do chat
      const sidebarBadge = document.getElementById('sidebarAiGlobalBadge');
      if (sidebarBadge) {
        if (complete) {
          sidebarBadge.className = 'flex items-center gap-1 text-[var(--aura-accent)] ';
          sidebarBadge.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i> Treinamento pronto';
        } else {
          sidebarBadge.className = 'flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold';
          sidebarBadge.innerHTML = '<i class="fa-solid fa-pen text-[10px]"></i> Complete o treinamento';
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
        newAppBtn.title = complete ? 'Criar agendamento' : 'Preencha as informações essenciais para agendar';
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
      if (typeof applyCommercialLocks === "function") applyCommercialLocks();
    }

    // 6. QUESTIONÁRIO DE CONFIGURAÇÃO & TREINAMENTO DA IA (ODONTO & ESTÉTICA REFINADO)
    function createProcedureRowHtml(proc, category) {
      const isChecked = proc.checked !== false;
      const name = proc.name || '';
      const duration = proc.duration || '';
      const price = proc.price || '';
      const note = proc.note || '';

      return `
        <div class="proc-row flex flex-col md:flex-row md:items-start gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 hover:border-neutral-300 dark:hover:border-neutral-600 transition" data-category="${category}">
          <!-- Checkbox + Nome -->
          <div class="flex items-start gap-2 md:w-5/12 min-w-0 md:pt-1.5">
            <input type="checkbox" class="proc-checkbox rounded text-[var(--aura-accent)] focus:ring-0 w-4 h-4 shrink-0 cursor-pointer mt-0.5" ${isChecked ? 'checked' : ''}>
            <div class="w-full">
              <input type="text" class="proc-name w-full bg-transparent font-bold text-xs text-neutral-800 dark:text-neutral-100 border-b border-transparent hover:border-neutral-300 focus:border-[var(--aura-accent)] focus:outline-none px-1" value="${escapeHtml(name)}" placeholder="Nome do procedimento">
              <span class="proc-name-err hidden text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">Informe o nome do procedimento!</span>
            </div>
          </div>
          
          <!-- Duração e Preço -->
          <div class="md:w-3/12 flex flex-col gap-1.5 md:pt-0.5">
            <div>
              <select class="proc-duration" data-duration="${escapeHtml(duration)}" aria-label="Duração do procedimento">${trainingOptions(TRAINING_DURATIONS,duration,'Selecione a duração')}</select>
              <span class="proc-duration-err hidden text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">Informe a duração.</span>
            </div>
            <input type="text" class="proc-price w-full px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-[var(--aura-accent)]" placeholder="Preço (ex: R$ 250 ou A partir de...)" value="${escapeHtml(price)}">
          </div>

          <!-- Observações (3 linhas) + Remover -->
          <div class="flex-1 flex items-start gap-2">
            <textarea rows="3" class="proc-note w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-[var(--aura-accent)] leading-relaxed resize-none" placeholder="Observações e regras do procedimento...">${escapeHtml(note)}</textarea>
            <button type="button" onclick="removeProcedureRow(this)" class="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg transition shrink-0 md:mt-1" title="Remover procedimento">
              <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }

    function addNewProcedureRow(category) {
      const containerId = category === 'odonto' ? 'odontoList' : 'esteticaList';
      const container = document.getElementById(containerId);
      if (!container) return;

      const newRowHtml = createProcedureRowHtml({ name: '', checked: true, duration: '', price: '', note: '' }, category);
      container.insertAdjacentHTML('beforeend', newRowHtml);
      syncTrainingDurations();

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
        odontoContainer.innerHTML = DEFAULT_ODONTO_SERVICES.map(p => createProcedureRowHtml({ ...p, checked: false }, 'odonto')).join('');
        esteticaContainer.innerHTML = DEFAULT_ESTETICA_SERVICES.map(p => createProcedureRowHtml({ ...p, checked: false }, 'estetica')).join('');
      }

      syncTrainingDurations();
      const sector = currentAccess && currentAccess.profile.sector;
      const odontoSection = odontoContainer.parentElement;
      const esteticaSection = esteticaContainer.parentElement;
      odontoSection.classList.remove('hidden');
      esteticaSection.classList.remove('hidden');
      if (sector === 'aesthetics' && !(savedItems || []).some(p => p.category === 'odonto')) odontoSection.classList.add('hidden');
      if (sector === 'dentistry' && !(savedItems || []).some(p => p.category === 'estetica')) esteticaSection.classList.add('hidden');
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
        loadStructuredTraining(currentConfig);
        updateCrucialTrainingLockUI();
        updateTrainingValidationHighlights();

      } catch (err) {
        console.error("Erro ao carregar configurações da clínica:", err);
      }
    }

    async function saveClinicConfig() {
      const profile=trainingProfile();
      if(!profile.kind||!profile.sector)return showToast('Escolha o formato e pelo menos uma área de atuação.','amber');
      if(!trainingScheduleLegacy && trainingScheduleDays().some(d=>d.enabled&&(d.startHour+':'+d.startMinute)>=(d.endHour+':'+d.endMinute)))return showToast('Revise os horários: o término deve ser depois do início.','amber');
      const btn = document.getElementById('btnSaveConfig');
      const btnText = document.getElementById('btnSaveConfigText');

      if (btnText) btnText.innerText = "Salvando na IA...";
      if (btn) btn.disabled = true;

      // Colhe procedimentos de todas as linhas verticais
      const procedureItems = [];
      let hasInvalidCheckedProc = false;
      document.querySelectorAll('.proc-row').forEach(row => {
        const isChecked = row.querySelector('.proc-checkbox').checked && trainingCategoryEnabled(row.dataset.category);
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
        business_kind:profile.kind,
        business_sector:profile.sector,
        schedule_days:trainingScheduleLegacy?undefined:trainingScheduleDays(),
        clinic_name: clinicNameVal,
        doctor_name: document.getElementById('cfgDoctorName').value.trim() || undefined,
        doctor_cro: document.getElementById('cfgDoctorCro').value.trim() || undefined,
        tone: document.getElementById('cfgTone').value,
        voice_replies: document.getElementById('cfgVoiceReplies').checked,
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
          await loadOnboarding();
          currentConfig = configPayload;
          if (configPayload.clinic_name) {
            document.getElementById('topClinicNameBadge').innerText = configPayload.clinic_name;
          }
          updateCrucialTrainingLockUI();
          updateTrainingValidationHighlights();

          if (isCrucialTrainingComplete() && !hasInvalidCheckedProc) {
            showToast("Treinamento salvo e revisado. Teste as respostas no Simulador.", "emerald");
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
        if (btnText) btnText.innerText = "Salvar treinamento";
        if (btn) btn.disabled = false;
      }
    }

    // Inicializa ao carregar DOM
    window.addEventListener('DOMContentLoaded', init);
// Structured training controls keep the textual BotConfig contract used by prompt.ts.
const TRAINING_DURATIONS=['15 min','20 min','30 min','40 min','45 min','50 min','1h','1h 15min','1h 30min','2h','2h 30min','3h','4h'];
const TRAINING_DAYS=[[1,'Segunda-feira'],[2,'Terça-feira'],[3,'Quarta-feira'],[4,'Quinta-feira'],[5,'Sexta-feira'],[6,'Sábado'],[0,'Domingo']];
let trainingScheduleLegacy=null;
function trainingOptions(values,current,empty='Não especificar') {
  return '<option value="">'+empty+'</option>'+[...new Set([...values,...(current&&!values.includes(current)?[current]:[])])].map(v=>'<option value="'+escapeHtml(v)+'"'+(v===current?' selected':'')+'>'+escapeHtml(v)+'</option>').join('');
}
function trainingProfile(){const kind=[...document.querySelectorAll('[name="trainingKind"]')].find(e=>e.checked)?.value;const areas=[...document.querySelectorAll('[name="trainingSector"]')].filter(e=>e.checked).map(e=>e.value);return {kind,sector:areas.length===2?'both':areas[0]};}
function changeTrainingProfile(changed){
  if(!trainingProfile().sector&&changed){changed.checked=true;showToast('Mantenha pelo menos uma área selecionada.','amber');}
  const sector=trainingProfile().sector;
  for(const [category,id,defaults,enabled] of [['odonto','odontoList',DEFAULT_ODONTO_SERVICES,sector!=='aesthetics'],['estetica','esteticaList',DEFAULT_ESTETICA_SERVICES,sector!=='dentistry']]){
    const list=document.getElementById(id);list.parentElement.classList.toggle('hidden',!enabled);
    if(enabled&&!list.children.length)list.innerHTML=defaults.map(p=>createProcedureRowHtml({...p,checked:false},category)).join('');
  }
  syncTrainingDurations();window.auraUI?.refresh();updateTrainingValidationHighlights();
}
function trainingScheduleDays(){return [...document.querySelectorAll('[data-training-day]')].map(row=>({day:Number(row.dataset.trainingDay),enabled:row.querySelector('input').checked,...Object.fromEntries([...row.querySelectorAll('select')].map(el=>[el.dataset.part,el.value]))}));}
function syncTrainingSchedule(){
  trainingScheduleLegacy=null;const days=trainingScheduleDays();let invalid=false;const text=[];
  for(const day of days){const row=document.querySelector('[data-training-day="'+day.day+'"]');row.classList.toggle('is-disabled',!day.enabled);row.querySelector('.aura-day-times').hidden=!day.enabled;
    for(const select of row.querySelectorAll('select'))select.disabled=!day.enabled;
    if(day.enabled){const start=day.startHour+':'+day.startMinute,end=day.endHour+':'+day.endMinute;if(start>=end)invalid=true;text.push(TRAINING_DAYS.find(d=>d[0]===day.day)[1]+': '+start+' às '+end);}}
  document.getElementById('cfgHours').value=invalid?'':text.join(' | ');
  document.getElementById('trainingScheduleError').textContent=invalid?'O horário final deve ser maior que o inicial em todos os dias marcados.':!text.length?'Marque pelo menos um dia de atendimento.':'';
  updateTrainingValidationHighlights();window.auraUI?.refresh();
}
function renderTrainingSchedule(config){
  const hours=Array.from({length:24},(_,i)=>String(i).padStart(2,'0')),minutes=['00','10','20','30','40','50'];
  const stored=Array.isArray(config.schedule_days)?config.schedule_days:null;
  document.getElementById('trainingSchedule').innerHTML=TRAINING_DAYS.map(([day,label])=>{
    const value=stored?.find(d=>d.day===day)||{enabled:day>0&&day<6,startHour:'08',startMinute:'00',endHour:'18',endMinute:'00'};
    const fields=['startHour','startMinute','endHour','endMinute'].map((part,i)=>'<label><span class="aura-sr-only">'+label+' '+part+'</span><select data-part="'+part+'" aria-label="'+label+' '+part+'" onchange="syncTrainingSchedule()">'+(part.endsWith('Hour')?hours:minutes).map(v=>'<option value="'+v+'"'+(v===value[part]?' selected':'')+'>'+v+'</option>').join('')+'</select></label>');
    return '<div class="aura-training-day" data-training-day="'+day+'"><label class="aura-day-label"><input type="checkbox" onchange="syncTrainingSchedule()" '+(value.enabled?'checked':'')+'> '+label+'</label><div class="aura-day-times"><span>Das</span>'+fields[0]+':'+fields[1]+'<span>às</span>'+fields[2]+':'+fields[3]+'</div></div>';
  }).join('');
  for(const row of document.querySelectorAll('[data-training-day]')){
    const d=stored?.find(d=>d.day===Number(row.dataset.trainingDay));
    for(const select of row.querySelectorAll('select'))select.value=d?.[select.dataset.part]||(select.dataset.part==='startHour'?'08':select.dataset.part==='endHour'?'18':'00');
  }
  syncTrainingSchedule();
  if(!stored&&config.hours&&!/^Segunda a Sexta, das 08:00 às 18:00$/i.test(config.hours)){
    trainingScheduleLegacy=config.hours;document.getElementById('cfgHours').value=config.hours;
    document.getElementById('trainingScheduleError').textContent='Texto anterior preservado: '+config.hours+'. Revise os dias abaixo para substituir pelos horários estruturados.';
  }
}
function renderTrainingChecks(container,options,current,target){
  const saved=(current||'').split(' | ');const known=options.filter(v=>saved.includes(v));
  const extra=saved.filter(v=>v&&!options.includes(v));
  document.getElementById(container).innerHTML=[...options,...extra].map(v=>'<label class="aura-quick-choice"><input type="checkbox" value="'+escapeHtml(v)+'" '+(known.includes(v)||extra.includes(v)?'checked':'')+'> '+escapeHtml(v)+'</label>').join('');
  document.getElementById(container).onchange=()=>{document.getElementById(target).value=[...document.getElementById(container).querySelectorAll('input')].filter(e=>e.checked).map(e=>e.value).join(' | ');};
}
function loadStructuredTraining(config){
  document.getElementById('cfgPaymentMethods').value=config.payment_methods||'';
  document.getElementById('cfgVoiceReplies').checked=Boolean(config.voice_replies);
  document.getElementById('cfgParking').value=config.parking||'';
  const kind=currentAccess?.profile.kind||config.business_kind,sector=currentAccess?.profile.sector||config.business_sector;
  for(const el of document.querySelectorAll('[name="trainingKind"]'))el.checked=el.value===kind;
  for(const el of document.querySelectorAll('[name="trainingSector"]'))el.checked=sector==='both'||el.value===sector;
  document.getElementById('cfgInitEvalDuration').innerHTML=trainingOptions(TRAINING_DURATIONS,config.initial_consultation?.duration||'','Selecione a duração');
  document.getElementById('cfgDelayTolerance').innerHTML=trainingOptions(['Tolerância de 10 minutos','Tolerância de 15 minutos','Tolerância de 20 minutos','Tolerância de 30 minutos','Sem tolerância para atrasos (sujeito a reagendamento)'],config.delay_tolerance||'');
  document.getElementById('cfgInitEvalDuration').value=config.initial_consultation?.duration||'';
  document.getElementById('cfgDelayTolerance').value=config.delay_tolerance||'';
  renderTrainingSchedule(config);
  const cro=config.doctor_cro||'',match=cro.match(/^(CRO|CRM|CRBM|COREN|COFFITO)-([A-Z]{2})\s+(.+)$/);
  document.getElementById('trainingCouncil').innerHTML='<div class="aura-council-fields"><label>Conselho<select id="trainingCouncilType">'+trainingOptions(['CRO','CRM','CRBM','COREN','COFFITO'],match?.[1]||'','Não informar')+'</select></label><label>UF<select id="trainingCouncilState">'+trainingOptions('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '),match?.[2]||'SP')+'</select></label><label>Número<input id="trainingCouncilNumber" maxlength="30" value="'+escapeHtml(match?.[3]||'')+'"></label></div><p id="trainingCouncilLegacy" class="aura-field-hint"></p>';
  document.getElementById('trainingCouncilType').value=match?.[1]||'';
  document.getElementById('trainingCouncilState').value=match?.[2]||'SP';
  document.getElementById('cfgDoctorCro').value=cro;
  if(cro&&!match)document.getElementById('trainingCouncilLegacy').textContent='Registro anterior preservado: '+cro;
  const syncCouncil=()=>{const type=document.getElementById('trainingCouncilType').value,uf=document.getElementById('trainingCouncilState').value,num=document.getElementById('trainingCouncilNumber').value.trim();document.getElementById('cfgDoctorCro').value=type&&uf&&num?type+'-'+uf+' '+num:'';document.getElementById('trainingCouncilLegacy').textContent='';document.getElementById('trainingCouncilState').disabled=!type;document.getElementById('trainingCouncilNumber').disabled=!type;document.getElementById('trainingCouncilState').parentElement.hidden=!type;document.getElementById('trainingCouncilNumber').parentElement.hidden=!type;window.auraUI?.refresh();};
  document.getElementById('trainingCouncil').oninput=syncCouncil;document.getElementById('trainingCouncil').onchange=syncCouncil;
  document.getElementById('trainingCouncilState').parentElement.hidden=!match;document.getElementById('trainingCouncilNumber').parentElement.hidden=!match;
  document.getElementById('trainingCouncilState').disabled=!match;document.getElementById('trainingCouncilNumber').disabled=!match;
  const installments=['Até 2x','Até 3x','Até 6x','Até 10x','Até 12x','Até 18x','Até 24x'];
  const payment=config.payment_methods||'',install=installments.find(v=>payment.includes('Parcelamento no Cartão ('+v+')'));
  renderTrainingChecks('trainingPayments',['Pix','Dinheiro','Cartão de Débito','Cartão de Crédito à vista','Parcelamento no Cartão'],payment.replace(/Parcelamento no Cartão \(Até \d+x\)/,'Parcelamento no Cartão'),'cfgPaymentMethods');
  const paymentContainer=document.getElementById('trainingPayments');const label=document.createElement('label');label.textContent='Parcelas ';const select=document.createElement('select');select.id='trainingInstallments';select.innerHTML=installments.map(v=>'<option'+(v===(install||'Até 3x')?' selected':'')+'>'+v+'</option>').join('');select.value=install||'Até 3x';label.append(select);paymentContainer.append(label);
  const syncPayment=()=>{select.disabled=![...paymentContainer.querySelectorAll('input')].some(el=>el.checked&&el.value==='Parcelamento no Cartão');document.getElementById('cfgPaymentMethods').value=[...paymentContainer.querySelectorAll('input')].filter(el=>el.checked).map(el=>el.value==='Parcelamento no Cartão'?el.value+' ('+select.value+')':el.value).join(' | ');window.auraUI?.refresh();};paymentContainer.onchange=syncPayment;select.disabled=![...paymentContainer.querySelectorAll('input')].some(el=>el.checked&&el.value==='Parcelamento no Cartão');
  const insuranceOptions=['Atendimento exclusivamente particular','Particular com emissão de recibo/nota para reembolso','Atendemos planos e convênios'];
  const insurance=config.insurance||'',mode=insuranceOptions.find(v=>insurance.startsWith(v))||insurance;
  document.getElementById('trainingInsurance').innerHTML='<label>Modalidade<select id="trainingInsuranceMode">'+trainingOptions(insuranceOptions,mode)+'</select></label><label id="trainingInsuranceNamesLabel">Nomes dos convênios<input id="trainingInsuranceNames" maxlength="500" value="'+escapeHtml(insurance.startsWith(insuranceOptions[2]+': ')?insurance.slice(insuranceOptions[2].length+2):'')+'"></label>';
  document.getElementById('trainingInsuranceMode').value=mode;
  const syncInsurance=()=>{const mode=document.getElementById('trainingInsuranceMode').value;document.getElementById('trainingInsuranceNamesLabel').hidden=mode!==insuranceOptions[2];document.getElementById('cfgInsurance').value=mode+(mode===insuranceOptions[2]&&document.getElementById('trainingInsuranceNames').value.trim()?': '+document.getElementById('trainingInsuranceNames').value.trim():'');};document.getElementById('trainingInsurance').onchange=syncInsurance;document.getElementById('trainingInsurance').oninput=syncInsurance;syncInsurance();
  renderTrainingChecks('trainingParking',['Estacionamento próprio gratuito','Estacionamento conveniado','Serviço de Valet / Manobrista','Fácil estacionamento no local','Próximo a metrô / transporte público','Acessibilidade para mobilidade reduzida'],config.parking,'cfgParking');
  const name=document.getElementById('cfgClinicName'),profileName=document.getElementById('spClinicName');name.oninput=()=>{profileName.value=name.value;updateTrainingValidationHighlights();};profileName.oninput=()=>{name.value=profileName.value;};
  changeTrainingProfile();window.auraUI?.refresh();
}

function trainingCategoryEnabled(category){const sector=trainingProfile().sector;return sector==='both'||!sector||(category==='odonto'?sector==='dentistry':sector==='aesthetics');}

function syncTrainingDurations(){for(const select of document.querySelectorAll('.proc-duration'))if(!select.dataset.initialized){select.value=select.dataset.duration||'';select.dataset.initialized='1';}}
