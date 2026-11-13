    // =========================================================================
    // MÓDULO 4: CONFIGURAÇÕES DA CLÍNICA, EQUIPE & CONEXÃO WHATSAPP (META)
    // =========================================================================
    let clinicProfileState = null;
    let clinicWhatsappState = null;
    let clinicUsersState = [];
    let clinicUsersCurrentId = null;
    let canManageClinicState = false;
    let activeSettingsSubTab = 'whatsapp';

    // Estado do Meta Embedded Signup
    let esMetaSdkPromise = null;
    let esInitializedAppId = null;
    let esListenerAttached = false;
    let esSessionPayload = { waba_id: null, phone_number_id: null };
    let esPendingAuthCode = null;
    let esExchangeStarted = false;
    let esGraceTimer = null;

    function switchSettingsSubTab(tab) {
      activeSettingsSubTab = tab;
      const panels = {
        whatsapp: document.getElementById('settingsPanelWhatsapp'),
      };
      const buttons = {
        whatsapp: document.getElementById('subTabBtnWhatsapp'),
        profile: document.getElementById('subTabBtnProfile'),
        users: document.getElementById('subTabBtnUsers'),
      };

      Object.keys(panels).forEach((k) => {
        if (panels[k]) panels[k].classList.toggle('hidden', k !== tab);
      });

      Object.keys(buttons).forEach((k) => {
        const btn = buttons[k];
        if (!btn) return;
        if (k === tab) {
          btn.className = 'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition bg-[#008069] text-white shadow-sm';
        } else {
          btn.className = 'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-400';
        }
      });

      if (tab === 'users') {
        loadClinicUsers();
      }
    }

    async function refreshWhatsappStatusIndicator() {
      try {
        const res = await fetch('/api/clinic/whatsapp/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.whatsapp) {
          clinicWhatsappState = data.whatsapp;
          canManageClinicState = !!data.canManageClinic;
          updateWhatsappHeaderDot(data.whatsapp);
        }
      } catch {}
    }

    function updateWhatsappHeaderDot(wa) {
      const dot = document.getElementById('menuWhatsappStatusDot');
      if (!dot || !wa) return;
      if (wa.configured) {
        dot.className = 'w-2.5 h-2.5 rounded-full ml-auto bg-emerald-500 shadow-sm shadow-emerald-500/40';
        dot.title = 'WhatsApp conectado (' + (wa.display_phone_number || wa.phone_number_id) + ')';
      } else {
        dot.className = 'w-2.5 h-2.5 rounded-full ml-auto bg-red-500';
        dot.title = 'WhatsApp ainda não conectado';
      }
    }

    async function loadClinicSettingsView() {
      await Promise.all([loadClinicProfileAndWhatsapp(), loadClinicUsers()]);
    }

    async function loadClinicProfileAndWhatsapp() {
      try {
        const res = await fetch('/api/clinic/profile');
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Erro ao carregar configurações da clínica', 'rose');
          return;
        }

        clinicProfileState = data.clinic;
        clinicWhatsappState = data.whatsapp;
        canManageClinicState = !!data.canManageClinic;

        renderClinicProfileCard();
        renderWhatsappSettingsCard();
        applyCommercialLocks();
        updateWhatsappHeaderDot(data.whatsapp);
      } catch (err) {
        console.error('Erro ao carregar perfil da clínica:', err);
        showToast('Erro de conexão ao carregar configurações', 'rose');
      }
    }

    function renderClinicProfileCard() {
      const c = clinicProfileState;
      if (!c) return;

      const heading = document.getElementById('settingsClinicHeading');
      const tenantBadge = document.getElementById('settingsTenantBadge');
      const roleBadge = document.getElementById('settingsRoleBadge');
      const topClinicBadge = document.getElementById('topClinicNameBadge');

      if (heading) heading.innerText = 'Seu WhatsApp de atendimento';
      if (tenantBadge) tenantBadge.innerText = 'Dados do Consultório / Clínica';
      if (topClinicBadge && c.name) topClinicBadge.innerText = c.name;

      if (roleBadge) {
        if (canManageClinicState) {
          roleBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20';
          roleBadge.innerText = 'Responsável pela operação';
        } else {
          roleBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700';
          roleBadge.innerText = 'Atendente / Recepção';
        }
      }

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
          el.value = val || '';
          el.disabled = !canManageClinicState;
        }
      };

      setVal('spClinicName', c.name);
      setVal('spLegalName', c.legal_name);
      setVal('spCnpj', c.cnpj);
      setVal('spResponsibleName', c.responsible_name);
      setVal('spAdminPhone', c.admin_phone);
      setVal('spContactEmail', c.contact_email);

      const saveBtn = document.getElementById('btnSaveClinicProfile');
      if (saveBtn) saveBtn.disabled = !canManageClinicState;
      const roNotice = document.getElementById('profileStaffReadOnlyNotice');
      if (roNotice) roNotice.classList.toggle('hidden', canManageClinicState);
    }

    function renderWhatsappSettingsCard() {
      const wa = clinicWhatsappState;
      if (!wa) return;

      const topPill = document.getElementById('settingsWaTopPill');
      if (topPill) {
        if (wa.configured) {
          topPill.className = 'px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shrink-0';
          topPill.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span><span>WhatsApp Conectado</span>';
        } else {
          topPill.className = 'px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2 shrink-0';
          topPill.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span>WhatsApp Pendente</span>';
        }
      }

      const statConf = document.getElementById('waStatConfigured');
      const statConnAt = document.getElementById('waStatConnectedAt');
      const statPhoneId = document.getElementById('waStatPhoneId');
      const statDisplay = document.getElementById('waStatDisplayPhone');
      const statWaba = document.getElementById('waStatWabaId');
      const statToken = document.getElementById('waStatTokenSource');
      const verifiedRow = document.getElementById('waVerifiedNameRow');
      const verifiedNameEl = document.getElementById('waStatVerifiedName');
      const webhookUrlEl = document.getElementById('waWebhookUrlText');

      if (statConf) {
        statConf.innerHTML = wa.configured
          ? '<span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><i class="fa-solid fa-circle-check"></i> Conectado e operando</span>'
          : '<span class="text-amber-600 dark:text-amber-400 flex items-center gap-1.5"><i class="fa-solid fa-circle-exclamation"></i> Não conectado</span>';
      }
      if (statConnAt) {
        statConnAt.innerText = wa.connected_at ? 'Conectado em: ' + wa.connected_at : 'Sem conexão ativa no número próprio.';
      }
      if (statPhoneId) {
        statPhoneId.innerText = wa.configured ? wa.phone_number_id : (wa.raw_phone_number_id || 'unconfigured');
      }
      if (statDisplay) {
        statDisplay.textContent = wa.display_phone_number || 'Ainda não conectado';
      }
      if (statWaba) {
        statWaba.innerText = wa.waba_id ? 'WABA: ' + wa.waba_id : 'WABA: Não informado';
      }
      if (statToken) {
        if (wa.token_source === 'custom_encrypted') {
          statToken.innerText = 'Credencial protegida';
        } else if (wa.token_source === 'custom_plain') {
          statToken.innerText = 'Token próprio configurado';
        } else if (wa.token_source === 'lab_fallback') {
          statToken.innerText = 'Credencial de teste';
        } else {
          statToken.innerText = 'Nenhum token configurado';
        }
      }

      if (verifiedRow) {
        if (wa.configured || wa.verified_name) {
          verifiedRow.classList.remove('hidden');
          if (verifiedNameEl) verifiedNameEl.innerText = wa.verified_name || 'Número ativo na Meta Cloud API';
        } else {
          verifiedRow.classList.add('hidden');
        }
      }

      const btnDiscTop = document.getElementById('btnDisconnectWaTop');
      const btnDiscManual = document.getElementById('btnDisconnectWaManual');
      if (btnDiscTop) btnDiscTop.classList.toggle('hidden', !(wa.configured && canManageClinicState));
      if (btnDiscManual) btnDiscManual.classList.toggle('hidden', !(wa.configured && canManageClinicState));

      if (webhookUrlEl) webhookUrlEl.innerText = wa.webhook_url || (window.location.origin + '/webhook');

      // Preenche campos manuais com o estado atual (nunca preenche token por segurança)
      const manualPhoneEl = document.getElementById('manualPhoneNumberId');
      const manualWabaEl = document.getElementById('manualWabaId');
      const manualTokenEl = document.getElementById('manualAccessToken');
      const manualSaveBtn = document.getElementById('btnSaveManualWa');
      if (manualPhoneEl) {
        manualPhoneEl.value = wa.configured ? (wa.phone_number_id || '') : '';
        manualPhoneEl.disabled = !canManageClinicState;
      }
      if (manualWabaEl) {
        manualWabaEl.value = wa.waba_id || '';
        manualWabaEl.disabled = !canManageClinicState;
      }
      if (manualTokenEl) {
        manualTokenEl.value = '';
        manualTokenEl.disabled = !canManageClinicState;
      }
      if (manualSaveBtn) manualSaveBtn.disabled = !canManageClinicState;

      // Status do Meta Embedded Signup
      const es = wa.embedded_signup || {};
      const esBadge = document.getElementById('esModeBadge');
      const esMissingAlert = document.getElementById('esMissingEnvAlert');
      const esMissingText = document.getElementById('esMissingEnvText');
      const esStaffAlert = document.getElementById('esStaffReadOnlyAlert');
      const esPinEl = document.getElementById('esPinInput');
      const esBtn = document.getElementById('btnLaunchEmbeddedSignup');

      if (esBadge) {
        if (es.enabled) {
          esBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300';
          esBadge.innerText = 'Pronto para Conectar';
        } else {
          esBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300';
          esBadge.innerText = 'Configuração Meta Pendente';
        }
      }

      if (esMissingAlert && esMissingText) {
        if (!es.enabled) {
          esMissingAlert.classList.remove('hidden');
          esMissingText.textContent='A conexão guiada está sendo preparada. Se você já tem as credenciais da Meta, utilize a conexão manual abaixo.';
        } else {
          esMissingAlert.classList.add('hidden');
        }
      }

      if (esStaffAlert) esStaffAlert.classList.toggle('hidden', canManageClinicState);
      if (esPinEl) esPinEl.disabled = !canManageClinicState || !es.enabled;
      if (esBtn) esBtn.disabled = !canManageClinicState || !es.enabled;
    }

    // -------------------------------------------------------------------------
    // SALVAR DADOS CADASTRAIS DA CLÍNICA & ALTERAR SENHA
    // -------------------------------------------------------------------------
    async function handleSaveClinicProfile(e) {
      e.preventDefault();
      if (!canManageClinicState) return;

      const btn = document.getElementById('btnSaveClinicProfile');
      if (btn) btn.disabled = true;

      const payload = {
        name: document.getElementById('spClinicName')?.value.trim() || '',
        legal_name: document.getElementById('spLegalName')?.value.trim() || '',
        cnpj: document.getElementById('spCnpj')?.value.trim() || '',
        responsible_name: document.getElementById('spResponsibleName')?.value.trim() || '',
        admin_phone: document.getElementById('spAdminPhone')?.value.trim() || '',
        contact_email: document.getElementById('spContactEmail')?.value.trim() || '',
      };

      try {
        const res = await fetch('/api/clinic/profile', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao salvar dados da clínica', 'rose');
          return;
        }

        clinicProfileState = data.clinic;
        if (data.clinic?.name) {
          if (currentConfig) currentConfig.clinic_name = data.clinic.name;
          const cfgNameInput = document.getElementById('cfgClinicName');
          if (cfgNameInput) cfgNameInput.value = data.clinic.name;
        }
        renderClinicProfileCard();
        showToast('Dados cadastrais salvos com sucesso!', 'emerald');
      } catch {
        showToast('Erro de conexão ao salvar dados cadastrais', 'rose');
      } finally {
        if (btn) btn.disabled = !canManageClinicState;
      }
    }

    function togglePasswordFields() {
      const fields = document.getElementById('passwordFields');
      fields.hidden = !fields.hidden;
      document.getElementById('togglePasswordFields').setAttribute('aria-expanded', String(!fields.hidden));
      if (!fields.hidden) document.getElementById('spCurrentPassword').focus();
    }
    async function editAccountEmail() {
      const input = document.getElementById('accountEmail'), button = document.getElementById('accountEmailEdit');
      if (input.disabled) { input.disabled = false; button.textContent = 'Salvar'; input.focus(); return; }
      if (!input.reportValidity()) return;
      button.disabled = true;
      try {
        const res = await fetch('/api/clinic/email', {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({email:input.value})});
        const data = await res.json();
        if (!res.ok) { showToast(data.error || 'Erro ao atualizar e-mail.', 'rose'); return; }
        input.value = data.email; input.disabled = true; button.textContent = 'Editar';
        if (currentUser) currentUser.email = data.email;
        const label = document.getElementById('topUserEmail'); if (label) label.textContent = data.email;
        showToast('E-mail atualizado.', 'emerald');
      } catch { showToast('Erro de conexão ao atualizar e-mail.', 'rose'); }
      finally { button.disabled = false; }
    }

    async function handleChangeOwnPassword(e) {
      e.preventDefault();
      const currentPassword = document.getElementById('spCurrentPassword')?.value || '';
      const newPassword = document.getElementById('spNewPassword')?.value || '';
      const confirmPassword = document.getElementById('spConfirmPassword')?.value || '';

      if (newPassword.length < 6) {
        showToast('A nova senha deve ter pelo menos 6 caracteres.', 'amber');
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('A confirmação de senha não confere.', 'amber');
        return;
      }

      const btn = document.getElementById('btnChangeOwnPassword');
      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/clinic/password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao alterar senha', 'rose');
          return;
        }

        document.getElementById('spCurrentPassword').value = '';
        document.getElementById('spNewPassword').value = '';
        document.getElementById('spConfirmPassword').value = '';
        document.getElementById('passwordFields').hidden = true;
        document.getElementById('togglePasswordFields').setAttribute('aria-expanded', 'false');
        showToast('Senha atualizada.', 'emerald');
      } catch {
        showToast('Erro de conexão ao alterar senha', 'rose');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    // -------------------------------------------------------------------------
    // GESTÃO DE EQUIPE / USUÁRIOS DA CLÍNICA
    // -------------------------------------------------------------------------
    async function loadClinicUsers() {
      try {
        const res = await fetch('/api/clinic/users');
        if (!res.ok) return;
        const data = await res.json();
        clinicUsersState = Array.isArray(data.users) ? data.users : [];
        clinicUsersCurrentId = data.currentUserId || null;
        if (typeof data.canManageClinic === 'boolean') {
          canManageClinicState = data.canManageClinic;
        }
        renderClinicUsersTable();
      } catch (err) {
        console.error('Erro ao carregar usuários da clínica:', err);
      }
    }

    function formatClinicUserCreatedAt(value) {
      if (!value) return '-';
      const date = new Date(String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z');
      if (Number.isNaN(date.getTime())) return '-';
      const parts = new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
      const part = type => parts.find(item => item.type === type)?.value || '';
      return part('hour') + ':' + part('minute') + ' — ' + part('day') + '/' + part('month') + '/' + part('year');
    }

    function renderClinicUsersTable() {
      const tbody = document.getElementById('clinicUsersTableBody');
      const countBadge = document.getElementById('settingsUsersCountBadge');
      const newBtn = document.getElementById('btnOpenNewClinicUser');

      if (countBadge) countBadge.innerText = String(clinicUsersState.length);
      if (newBtn) newBtn.disabled = !canManageClinicState;
      if (!tbody) return;

      if (clinicUsersState.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">Nenhum usuário cadastrado nesta clínica.</td></tr>';
        return;
      }

      tbody.innerHTML = clinicUsersState.map((u) => {
        const isSelf = Number(u.id) === Number(clinicUsersCurrentId);
        const protectedAccess = !['admin','staff'].includes(u.role);
        const isActive = Number(u.active) !== 0;

        let roleBadge = '<span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">Atendente</span>';
        if (u.role === 'admin') {
          roleBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">Administrador</span>';
        }

        const statusBadge = isActive
          ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ativo</span>'
          : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px]"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pausado</span>';

        let actionsHtml = '<span class="text-[11px] text-slate-400">Somente leitura</span>';
        if (canManageClinicState) {
          if (protectedAccess) {
            actionsHtml = '<span class="text-[11px] text-slate-400 italic">Protegido</span>';
          } else {
            const btns = [];
            btns.push('<button type="button" onclick="openClinicUserModal(' + Number(u.id) + ')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition">Editar</button>');
            if (!isSelf) {
              btns.push('<button type="button" onclick="toggleClinicUserActive(' + Number(u.id) + ', ' + (!isActive) + ')" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold text-[11px] transition">' + (isActive ? 'Pausar' : 'Ativar') + '</button>');
              btns.push('<button type="button" onclick="deleteClinicUserRow(' + Number(u.id) + ')" class="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition">Remover</button>');
            }
            actionsHtml = '<div class="inline-flex items-center gap-1.5">' + btns.join('') + '</div>';
          }
        }

        return '<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">' +
          '<td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">' + escapeHtml(u.name) + (isSelf ? ' <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">Você</span>' : '') + '</td>' +
          '<td class="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">' + escapeHtml(u.email) + '</td>' +
          '<td class="py-3.5 px-4">' + roleBadge + '</td>' +
          '<td class="py-3.5 px-4" aria-label="Senha protegida">••••••••</td>' +
          '<td class="py-3.5 px-4 text-slate-400">' + escapeHtml(formatClinicUserCreatedAt(u.created_at)) + '</td>' +
          '<td class="py-3.5 px-4 text-right whitespace-nowrap">' + actionsHtml + '</td>' +
        '</tr>';
      }).join('');
    }

    function openClinicUserModal(userId) {
      if (!canManageClinicState) return;
      const modal = document.getElementById('clinicUserModal');
      const editIdEl = document.getElementById('cuEditId');
      const titleEl = document.getElementById('cuModalTitle');
      const nameEl = document.getElementById('cuName');
      const emailEl = document.getElementById('cuEmail');
      const roleEl = document.getElementById('cuRole');
      const passEl = document.getElementById('cuPassword');
      const passLbl = document.getElementById('cuPasswordLabel');

      if (userId) {
        const user = clinicUsersState.find((u) => Number(u.id) === Number(userId));
        if (!user) return;
        editIdEl.value = String(user.id);
        titleEl.innerText = 'Editar Usuário da Clínica';
        nameEl.value = user.name || '';
        emailEl.value = user.email || '';
        emailEl.readOnly = true;
        emailEl.classList.add('opacity-70');
        roleEl.value = user.role === 'admin' ? 'admin' : 'staff';
        passEl.value = '';
        passEl.required = false;
        passEl.placeholder = 'Deixe vazio para manter atual';
        passLbl.innerText = 'Nova Senha (opcional)';
      } else {
        editIdEl.value = '';
        titleEl.innerText = 'Novo Usuário da Equipe';
        nameEl.value = '';
        emailEl.value = '';
        emailEl.readOnly = false;
        emailEl.classList.remove('opacity-70');
        roleEl.value = 'staff';
        passEl.value = '';
        passEl.required = true;
        passEl.placeholder = 'Mín. 6 caracteres';
        passLbl.innerText = 'Senha Inicial *';
      }

      if (modal) modal.classList.remove('hidden');
    }

    function closeClinicUserModal() {
      const modal = document.getElementById('clinicUserModal');
      if (modal) modal.classList.add('hidden');
    }

    async function handleSaveClinicUser(e) {
      e.preventDefault();
      if (!canManageClinicState) return;

      const editId = document.getElementById('cuEditId')?.value.trim();
      const name = document.getElementById('cuName')?.value.trim();
      const email = document.getElementById('cuEmail')?.value.trim();
      const role = document.getElementById('cuRole')?.value || 'staff';
      const password = document.getElementById('cuPassword')?.value || '';

      const btn = document.getElementById('btnSaveClinicUser');
      if (btn) btn.disabled = true;

      try {
        let res;
        if (editId) {
          const payload = { id: Number(editId), name, role };
          if (password) payload.newPassword = password;
          res = await fetch('/api/clinic/users', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch('/api/clinic/users', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name, email, role, password }),
          });
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao salvar usuário', 'rose');
          return;
        }

        closeClinicUserModal();
        showToast(editId ? 'Usuário atualizado!' : 'Usuário adicionado à equipe!', 'emerald');
        await loadClinicUsers();
      } catch {
        showToast('Erro de conexão ao salvar usuário', 'rose');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function toggleClinicUserActive(userId, nextActive) {
      if (!canManageClinicState) return;
      try {
        const res = await fetch('/api/clinic/users', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: Number(userId), active: !!nextActive }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao alterar status do usuário', 'rose');
          return;
        }
        showToast(nextActive ? 'Usuário reativado!' : 'Usuário pausado!', 'emerald');
        await loadClinicUsers();
      } catch {
        showToast('Erro ao alterar status do usuário', 'rose');
      }
    }

    async function deleteClinicUserRow(userId) {
      if (!canManageClinicState) return;
      const user = clinicUsersState.find((u) => Number(u.id) === Number(userId));
      if (!confirm('Remover o acesso de ' + (user?.name || 'este usuário') + ' (' + (user?.email || '') + ')?')) {
        return;
      }
      try {
        const res = await fetch('/api/clinic/users', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: Number(userId) }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao remover usuário', 'rose');
          return;
        }
        showToast('Usuário removido da clínica.', 'emerald');
        await loadClinicUsers();
      } catch {
        showToast('Erro de conexão ao remover usuário', 'rose');
      }
    }

    // -------------------------------------------------------------------------
    // CONEXÃO WHATSAPP: META EMBEDDED SIGNUP + MANUAL + DIAGNÓSTICO
    // -------------------------------------------------------------------------
    function setEmbeddedSignupProgress(lines, tone = 'slate') {
      const box = document.getElementById('esProgressBox');
      if (!box) return;
      box.classList.remove('hidden');
      const colorCls = tone === 'emerald'
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        : tone === 'rose'
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300';
      box.className = 'p-3.5 rounded-xl border text-xs space-y-1 ' + colorCls;
      box.innerHTML = lines.map((line) => '<div>' + escapeHtml(line) + '</div>').join('');
    }

    function ensureMetaSdkLoaded(appId, graphVersion) {
      if (window.FB && esInitializedAppId === appId) {
        return Promise.resolve();
      }
      if (esMetaSdkPromise && esInitializedAppId === appId) {
        return esMetaSdkPromise;
      }

      esInitializedAppId = appId;
      esMetaSdkPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tempo esgotado ao carregar o SDK da Meta (connect.facebook.net).'));
        }, 12000);

        const finishInit = () => {
          clearTimeout(timeout);
          try {
            window.FB.init({
              appId: appId,
              autoLogAppEvents: true,
              xfbml: true,
              version: graphVersion || 'v26.0',
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        };

        if (window.FB) {
          finishInit();
          return;
        }

        window.fbAsyncInit = finishInit;
        if (!document.getElementById('facebook-jssdk')) {
          const js = document.createElement('script');
          js.id = 'facebook-jssdk';
          js.async = true;
          js.defer = true;
          js.crossOrigin = 'anonymous';
          js.src = 'https://connect.facebook.net/pt_BR/sdk.js';
          js.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Não foi possível baixar o SDK da Meta. Verifique bloqueadores de anúncio/popup.'));
          };
          document.head.appendChild(js);
        }
      });

      return esMetaSdkPromise;
    }

    function handleMetaEmbeddedMessage(event) {
      if (!/^https:\/\/([a-z0-9-]+\.)?facebook\.com$/i.test(event.origin || '')) {
        return;
      }

      let data = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (!data || data.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (
        data.event === 'FINISH' ||
        data.event === 'FINISH_ONLY_WABA' ||
        data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'
      ) {
        const payload = data.data || {};
        if (payload.waba_id) esSessionPayload.waba_id = String(payload.waba_id);
        if (payload.phone_number_id) esSessionPayload.phone_number_id = String(payload.phone_number_id);

        if (esPendingAuthCode && !esExchangeStarted) {
          if (esGraceTimer) clearTimeout(esGraceTimer);
          completeEmbeddedSignupExchange(esPendingAuthCode);
        }
      } else if (data.event === 'CANCEL') {
        const step = data.data?.current_step || 'autorização';
        setEmbeddedSignupProgress(['Fluxo cancelado pelo usuário na etapa: ' + step], 'rose');
        resetEmbeddedSignupBtn();
      } else if (data.event === 'ERROR') {
        const errMsg = data.data?.error_message || 'Erro retornado pelo popup da Meta.';
        setEmbeddedSignupProgress(['Erro no Embedded Signup Meta: ' + errMsg], 'rose');
        resetEmbeddedSignupBtn();
      }
    }

    function resetEmbeddedSignupBtn() {
      const btn = document.getElementById('btnLaunchEmbeddedSignup');
      const txt = document.getElementById('btnLaunchEmbeddedSignupText');
      if (btn) btn.disabled = !canManageClinicState || !clinicWhatsappState?.embedded_signup?.enabled;
      if (txt) txt.innerText = 'Conectar com a Meta';
    }

    async function completeEmbeddedSignupExchange(code) {
      if (esExchangeStarted) return;
      esExchangeStarted = true;

      const pin = document.getElementById('esPinInput')?.value.trim() || '';
      setEmbeddedSignupProgress([
        '1. Autorização Meta recebida com sucesso.',
        '2. Autorizando o número e preparando o recebimento de mensagens...',
      ]);

      try {
        const res = await fetch('/api/clinic/whatsapp/embedded-signup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code,
            numberScenario:document.getElementById('waNumberScenario').value,
            waba_id: esSessionPayload.waba_id,
            phone_number_id: esSessionPayload.phone_number_id,
            pin: pin || undefined,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setEmbeddedSignupProgress(['Falha ao concluir conexão: ' + (data.error || 'Erro desconhecido')], 'rose');
          showToast(data.error || 'Falha no Embedded Signup', 'rose');
          return;
        }

        if (data.whatsapp) {
          clinicWhatsappState = data.whatsapp;
          renderWhatsappSettingsCard();
        applyCommercialLocks();
          updateWhatsappHeaderDot(data.whatsapp);
        }

        const steps = data.steps || {};
        const lines = [
          '✓ Autorização salva com segurança.',
          steps.webhookSubscribed
            ? '✓ Webhook assinado automaticamente na conta WABA.'
            : '⚠ Webhook não foi assinado automaticamente — clique em "Testar Conexão & Diagnóstico" abaixo.',
        ];
        if (pin) {
          lines.push(steps.phoneRegistered ? '✓ Número registrado na Cloud API com o PIN informado.' : '⚠ Registro via PIN não concluído (pode já estar registrado).');
        }
        if (Array.isArray(steps.warnings) && steps.warnings.length > 0) {
          steps.warnings.forEach((w) => lines.push('Aviso: ' + w));
        }

        setEmbeddedSignupProgress(lines, 'emerald');
        showToast('WhatsApp oficial conectado com sucesso!', 'emerald');
        await runWhatsAppDiagnostics();
      } catch (err) {
        setEmbeddedSignupProgress(['Erro de rede ao finalizar Embedded Signup.'], 'rose');
        showToast('Erro de conexão ao concluir Embedded Signup', 'rose');
      } finally {
        resetEmbeddedSignupBtn();
      }
    }

    async function launchMetaEmbeddedSignup() {
      if (!verifyNumberScenario()) return;
      if (!canManageClinicState) return;
      const es = clinicWhatsappState?.embedded_signup;
      if (!es || !es.enabled || !es.app_id || !es.config_id) {
        showToast('Meta Embedded Signup ainda não configurado no servidor.', 'amber');
        return;
      }

      const pin = document.getElementById('esPinInput')?.value.trim() || '';
      if (pin && !/^\d{6}$/.test(pin)) {
        showToast('O PIN deve ter exatamente 6 dígitos numéricos (ou ficar vazio).', 'amber');
        return;
      }

      if (!esListenerAttached) {
        window.addEventListener('message', handleMetaEmbeddedMessage);
        esListenerAttached = true;
      }

      esSessionPayload = { waba_id: null, phone_number_id: null };
      esPendingAuthCode = null;
      esExchangeStarted = false;
      if (esGraceTimer) clearTimeout(esGraceTimer);

      const btn = document.getElementById('btnLaunchEmbeddedSignup');
      const txt = document.getElementById('btnLaunchEmbeddedSignupText');
      if (btn) btn.disabled = true;
      if (txt) txt.innerText = 'Aguardando janela da Meta...';

      setEmbeddedSignupProgress(['Carregando SDK oficial da Meta e abrindo janela de conexão...']);

      try {
        await ensureMetaSdkLoaded(es.app_id, es.graph_version);
      } catch (err) {
        setEmbeddedSignupProgress([err?.message || 'Falha ao carregar SDK da Meta.'], 'rose');
        showToast(err?.message || 'Erro ao carregar SDK da Meta', 'rose');
        resetEmbeddedSignupBtn();
        return;
      }

      window.FB.login(
        function (response) {
          if (response && response.authResponse && response.authResponse.code) {
            esPendingAuthCode = response.authResponse.code;
            if (esSessionPayload.waba_id && esSessionPayload.phone_number_id) {
              completeEmbeddedSignupExchange(esPendingAuthCode);
            } else {
              esGraceTimer = setTimeout(() => {
                if (esPendingAuthCode && !esExchangeStarted) {
                  completeEmbeddedSignupExchange(esPendingAuthCode);
                }
              }, 1400);
            }
          } else {
            setEmbeddedSignupProgress(['Autorização não concluída ou cancelada na janela da Meta.'], 'rose');
            resetEmbeddedSignupBtn();
          }
        },
        {
          config_id: es.config_id,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            sessionInfoVersion: '3',
          },
        }
      );
    }

    async function handleSaveManualWhatsApp(e) {
      e.preventDefault();
      if (!verifyNumberScenario()) return;
      if (!canManageClinicState) return;

      const phoneNumberId = document.getElementById('manualPhoneNumberId')?.value.trim() || '';
      const wabaId = document.getElementById('manualWabaId')?.value.trim() || '';
      const accessToken = document.getElementById('manualAccessToken')?.value.trim() || '';

      const btn = document.getElementById('btnSaveManualWa');
      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/clinic/whatsapp/manual', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            numberScenario:document.getElementById('waNumberScenario').value,
            phoneNumberId,
            wabaId: wabaId || null,
            accessToken: accessToken || null,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Falha ao validar credenciais na Meta', 'rose');
          return;
        }

        if (data.whatsapp) {
          clinicWhatsappState = data.whatsapp;
          renderWhatsappSettingsCard();
        applyCommercialLocks();
          updateWhatsappHeaderDot(data.whatsapp);
        }
        document.getElementById('manualAccessToken').value = '';
        showToast('Número WhatsApp validado e conectado com sucesso!', 'emerald');
        await runWhatsAppDiagnostics();
      } catch {
        showToast('Erro de conexão ao salvar credenciais', 'rose');
      } finally {
        if (btn) btn.disabled = !canManageClinicState;
      }
    }

    async function handleDisconnectWhatsApp() {
      if (!canManageClinicState) return;
      if (!confirm('Desconectar o número WhatsApp desta clínica? O atendimento automático será interrompido até reconectar.')) {
        return;
      }

      try {
        const res = await fetch('/api/clinic/whatsapp/disconnect', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao desconectar WhatsApp', 'rose');
          return;
        }
        if (data.whatsapp) {
          clinicWhatsappState = data.whatsapp;
          renderWhatsappSettingsCard();
        applyCommercialLocks();
          updateWhatsappHeaderDot(data.whatsapp);
        }
        const diagEl = document.getElementById('waDiagnosticsResults');
        if (diagEl) {
          diagEl.innerHTML = '<p class="text-[11px] text-amber-600 dark:text-amber-400">WhatsApp desconectado desta clínica.</p>';
        }
        showToast('WhatsApp desconectado.', 'amber');
      } catch {
        showToast('Erro de conexão ao desconectar', 'rose');
      }
    }

    async function runWhatsAppDiagnostics() {
      const btn = document.getElementById('btnRunWaDiagnose');
      const container = document.getElementById('waDiagnosticsResults');
      const subBtn = document.getElementById('btnSubscribeWebhook');

      if (btn) btn.disabled = true;
      if (container) {
        container.innerHTML = '<div class="p-3 text-slate-400 flex items-center gap-2"><i class="fa-solid fa-circle-notch fa-spin"></i><span>Verificando a conexão...</span></div>';
      }

      try {
        const res = await fetch('/api/clinic/whatsapp/diagnose', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
          if (container) {
            container.innerHTML = '<div class="p-3 rounded-xl bg-rose-500/10 text-rose-500">' + escapeHtml(data.error || 'Erro no diagnóstico') + '</div>';
          }
          return;
        }

        if (data.whatsapp) {
          clinicWhatsappState = data.whatsapp;
          renderWhatsappSettingsCard();
        applyCommercialLocks();
          updateWhatsappHeaderDot(data.whatsapp);
        }

        if (subBtn) {
          subBtn.classList.toggle('hidden', !(data.canSubscribeWebhook && canManageClinicState));
        }

        const checks = Array.isArray(data.checks) ? data.checks : [];
        if (container) {
          container.innerHTML = checks.map((c) => {
            let cls = 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300';
            let icon = 'fa-solid fa-circle-check text-emerald-500';
            if (c.status === 'warn') {
              cls = 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300';
              icon = 'fa-solid fa-triangle-exclamation text-amber-500';
            } else if (c.status === 'fail') {
              cls = 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300';
              icon = 'fa-solid fa-circle-xmark text-rose-500';
            }
            return '<div class="p-3 rounded-xl border ' + cls + ' flex items-start gap-2.5">' +
              '<i class="' + icon + ' mt-0.5 text-sm shrink-0"></i>' +
              '<div class="min-w-0">' +
                '<div class="font-bold text-slate-900 dark:text-white">' + escapeHtml(c.label) + '</div>' +
                '<div class="text-[11px] opacity-90 break-words">' + escapeHtml(c.detail) + '</div>' +
              '</div>' +
            '</div>';
          }).join('');
        }
      } catch {
        if (container) {
          container.innerHTML = '<div class="p-3 rounded-xl bg-rose-500/10 text-rose-500">Erro de rede ao executar diagnóstico.</div>';
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function handleSubscribeWebhook() {
      if (!canManageClinicState) return;
      const btn = document.getElementById('btnSubscribeWebhook');
      if (btn) btn.disabled = true;
      try {
        const res = await fetch('/api/clinic/whatsapp/subscribe', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || 'Erro ao assinar webhook no WABA', 'rose');
          return;
        }
        showToast('Webhook assinado com sucesso no WABA!', 'emerald');
        await runWhatsAppDiagnostics();
      } catch {
        showToast('Erro de rede ao assinar webhook', 'rose');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    function copyWebhookUrl() {
      const txt = document.getElementById('waWebhookUrlText')?.innerText || '';
      if (!txt) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(
          () => showToast('URL do Webhook copiada!', 'emerald'),
          () => showToast('Não foi possível copiar automaticamente.', 'amber')
        );
      }
    }

function verifyNumberScenario() {
  if (!currentAccess || currentAccess.legacy_review_required) return true;
  if (document.getElementById('waNumberScenario').value === 'new_dedicated') return true;
  showToast('Escolha um número novo e dedicado. Números existentes aguardam validação do procedimento.','amber');return false;
}

function updateNumberScenarioHint() {
  const existing=document.getElementById('waNumberScenario').value==='existing';
  document.getElementById('numberScenarioHint').textContent=existing ? 'A conexão de números existentes ainda precisa ser validada. Não prossiga sem confirmar as consequências para seu aplicativo e histórico.' : 'Recomendamos um número dedicado a novos interessados.';
}
