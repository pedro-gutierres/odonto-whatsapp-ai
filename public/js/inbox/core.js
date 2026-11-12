    // ESTADO GLOBAL
    let conversations = [];
    let activePhone = null;
    let activeAiPaused = false;
    let appointments = [];
    let professionals = [];
    let selectedAgendaProfId = 'all';
    let currentConfig = null;
    let currentUser = null;

    // Otimização de polling
    let highestKnownMsgId = 0;
    let highestActiveMsgId = 0;
    let isPollingBusy = false;
    let pollingInterval = null;
    let onboardingRefreshInterval = null;

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
    const auraPages = {
      plan: { title:'Plano', view:'viewPlan' },
      onboarding: { title:'Início', view:'viewOnboarding' }, chat: { title:'Conversas', view:'viewChat' },
      agenda: { title:'Agenda & Equipe', view:'viewAgenda' }, config: { title:'Treinar IA', view:'viewConfig' },
      settings: { title:'Conectar WhatsApp', view:'viewSettings' }, simulator: { title:'Simulador da IA', view:'viewSimulator' },
      account: { title:'Conta', view:'viewAccount' }
    };
    function toggleSidebarCollapse() {
      const collapsed = document.body.classList.toggle('aura-sidebar-collapsed');
      if (!collapsed) document.getElementById('verticalMenuContainer').classList.remove('aura-sidebar-peek');
      const trigger = document.getElementById('sidebarCollapseTrigger');
      const label = collapsed ? 'Expandir menu' : 'Recolher menu';
      trigger.setAttribute('aria-expanded', String(!collapsed));
      trigger.setAttribute('aria-label', label);
      trigger.title = label;
      closeAccountMenu();
    }
    const sidebar = document.getElementById('verticalMenuContainer');
    sidebar?.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && document.body.classList.contains('aura-sidebar-collapsed')) sidebar.classList.add('aura-sidebar-peek');
    });
    sidebar?.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') sidebar.classList.remove('aura-sidebar-peek');
    });
    function toggleVerticalMenu(event) {
      event.stopPropagation();
      const open = document.body.classList.toggle('aura-nav-open');
      document.getElementById('verticalMenuTrigger').setAttribute('aria-expanded',String(open));
    }
    function closeVerticalMenu() {
      document.body.classList.remove('aura-nav-open');
      document.getElementById('verticalMenuTrigger')?.setAttribute('aria-expanded','false');
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('aura-nav-open')) {
        closeVerticalMenu(); document.getElementById('verticalMenuTrigger').focus();
      }
    });
    function selectNavigationTab(tabId) {
      if (!Object.hasOwn(auraPages, tabId)) return;
      if (currentUser && currentUser.canManageClinic === false && !['chat','agenda'].includes(tabId)) tabId = 'chat';
      const page = auraPages[tabId];
      closeAccountMenu();closeVerticalMenu(); window.auraUI?.close();
      document.getElementById('selectedMenuLabel').textContent=page.title;
      const pageHeader = document.getElementById('dashboardPageHeader');
      if (pageHeader) pageHeader.textContent = page.title;
      document.title=page.title+' | Aura'; document.body.dataset.view=tabId;
      for (const [id,item] of Object.entries(auraPages)) document.getElementById(item.view).classList.toggle('hidden',id!==tabId);
      for (const item of document.querySelectorAll('[data-nav-tab]')) {
        if (item.dataset.navTab===tabId) item.setAttribute('aria-current','page'); else item.removeAttribute('aria-current');
      }
      if (location.hash !== '#'+tabId) history.replaceState(null,'','#'+tabId);
      if (tabId==='plan') loadBilling();
      else if (tabId==='onboarding') loadOnboarding();
      else if (tabId==='account') loadClinicSettingsView();
      else if (tabId==='agenda') {loadProfessionals();loadAppointments();}
      else if (tabId==='config') {loadClinicConfig().then(updateTrainingValidationHighlights);loadClinicProfileAndWhatsapp();}
      else if (tabId==='settings') loadClinicSettingsView();
      else if (tabId==='simulator') initSimulatorView();
      else if (tabId==='chat') {
        if(currentAccess?.can_read_history)loadConversations(false);
        else {
          const container=document.getElementById('conversationList');container.replaceChildren();
          const message=document.createElement('p');message.className='aura-description p-5';message.textContent='As conversas aparecem aqui depois que você ativa o atendimento no WhatsApp.';container.append(message);
        }
      }
      window.auraUI?.refresh();
    }

    // 3. INICIALIZAÇÃO GERAL
    async function loadCurrentUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.status === 401) {
          window.location.href = '/login';
          return false;
        }
        const data = await res.json();
        if (data && data.user) {
          currentUser = data.user;
          const staff = data.user.canManageClinic === false;
          document.body.classList.toggle('aura-staff', staff);
          const profile = document.getElementById('accountMenuTrigger');
          if (profile) { profile.disabled = staff; profile.setAttribute('aria-label', staff ? (data.user.name || 'Perfil') : 'Conta e opções'); }
          const logout = document.getElementById('staffLogout'); if (logout) logout.hidden = !staff;
          const nameEl = document.getElementById('topUserName');
          const emailEl = document.getElementById('topUserEmail');

          if (nameEl) nameEl.innerText = data.user.name || 'Recepção';
          const sidebarName = document.getElementById('sidebarAccountName');
          if (sidebarName) sidebarName.textContent = (data.user.name || 'Recepção').trim().split(/\s+/).slice(0, 2).join(' ').toLocaleUpperCase('pt-BR');
          if (emailEl) emailEl.innerText = data.user.email || '';
          const accountEmail = document.getElementById('accountEmail');
          if (accountEmail) accountEmail.value = data.user.email || '';

        }
        if (data && data.trial && typeof updateTrialWidget === 'function') {
          updateTrialWidget(data.trial);
        }
        return true;
      } catch (err) {
        console.error("Erro ao carregar usuário logado:", err);
        return true;
      }
    }

    async function init() {
      initTheme();
      const ok = await loadCurrentUser();
      if (!ok) return;
      startLiveBrasiliaSync();
      await loadOnboarding();
      if (currentAccess && currentAccess.can_read_history) await loadConversations(false);
      await loadProfessionals();
      await loadAppointments();
      if (currentUser?.canManageClinic !== false) await loadClinicConfig();
      if (currentUser?.canManageClinic !== false && typeof refreshWhatsappStatusIndicator === 'function') {
        refreshWhatsappStatusIndicator();
      }
      updateCrucialTrainingLockUI();
      if (currentAccess && currentAccess.can_read_history) startPolling();
      const requestedTab=location.hash.slice(1);
      selectNavigationTab(Object.hasOwn(auraPages, requestedTab) ? requestedTab : 'chat');
      revealAccountEntry();
      if (onboardingRefreshInterval) clearInterval(onboardingRefreshInterval);
      onboardingRefreshInterval = setInterval(() => { if (!document.hidden) loadOnboarding({ background: true }); }, 30000);
    }

    // 7. LOGOUT
    async function handleLogout() {
      if (confirm("Sair da sua conta?")) {
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
      if (!currentAccess || !currentAccess.can_read_history) return;
      isPollingBusy = true;
      try {
        const p = activePhone || '';
        const url = `/api/sync-check?last_id=${highestKnownMsgId}&active_phone=${encodeURIComponent(p)}&active_msg_id=${highestActiveMsgId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.server_time) syncServerTime(data.server_time);

        if (activePhone && typeof data.active_ai_paused === 'boolean') {
          if (activeAiPaused !== data.active_ai_paused) {
            activeAiPaused = data.active_ai_paused;
            const target = conversations.find(c => c.contact_wa_id === activePhone);
            if (target) target.ai_paused = data.active_ai_paused ? 1 : 0;
            updateAiStatusUI();
            renderConversationList();
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
      } else if (color === "amber") {
        toastIcon.className = "fa-solid fa-triangle-exclamation text-amber-400";
      } else if (color === "rose") {
        toastIcon.className = "fa-solid fa-circle-exclamation text-rose-400";
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
      const fullDateStr = `${capitalizeFirst(weekday)}, ${dayMonth}`;

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

function revealAccountEntry() {
  const root=document.documentElement;
  const finish=()=>{root.classList.remove('aura-entry-pending','aura-entry-revealing');try{sessionStorage.removeItem('aura_entry_reveal');}catch{}};
  if(!root.classList.contains('aura-entry-pending') || (typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)){finish();return;}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    root.classList.remove('aura-entry-pending');root.classList.add('aura-entry-revealing');
    setTimeout(finish,550);
  }));
}

function closeAccountMenu(){document.getElementById('accountQuickMenu')?.classList.add('hidden');document.getElementById('accountMenuTrigger')?.setAttribute('aria-expanded','false');}
function toggleAccountMenu(){
 const menu=document.getElementById('accountQuickMenu'),trigger=document.getElementById('accountMenuTrigger');
 if(!menu.classList.contains('hidden')){closeAccountMenu();return;}
 updateAccountThemeLabel();
 const rect=trigger.getBoundingClientRect();menu.classList.remove('hidden');
 menu.style.maxHeight=Math.max(0,innerHeight-16)+'px';
 menu.style.overflowY=menu.scrollHeight>innerHeight-16?'auto':'visible';
 // Layout dimensions exclude the opening animation's scale.
 const width=menu.offsetWidth||210,height=menu.offsetHeight;
 const sidebarRect=document.getElementById('verticalMenuContainer').getBoundingClientRect();
 const name=document.getElementById('sidebarAccountName');
 const nameRect=name?.getBoundingClientRect();
 const anchorRight=nameRect && nameRect.width > 0 && getComputedStyle(name).visibility !== 'hidden' ? nameRect.right : rect.left+Math.min(rect.width,36);
 const left=Math.max(8,Math.min(Math.max(sidebarRect.right,rect.right)+24,innerWidth-width-8));
 const top=Math.max(8,Math.min(rect.bottom-height,innerHeight-height-8));
 const anchorY=Math.max(16,Math.min(rect.top+rect.height/2-top,height-16));
 menu.style.left=left+'px';menu.style.top=top+'px';
 menu.style.setProperty('--account-anchor-y',anchorY+'px');
 menu.style.setProperty('--account-connector-width',Math.max(0,left-anchorRight-6)+'px');
 menu.style.setProperty('--account-origin-x',(rect.left+rect.width/2-left)+'px');
 menu.classList.toggle('is-connected',left>anchorRight+6);
 trigger.setAttribute('aria-expanded','true');menu.querySelector('button').focus({preventScroll:true});
}
function accountMenuNavigate(tab,plan=false){selectNavigationTab(tab);if(plan)document.getElementById('plano').scrollIntoView({behavior:'smooth',block:'start'});}
document.addEventListener('click',event=>{if(!event.target.closest('#accountQuickMenu,#accountMenuTrigger'))closeAccountMenu();});
document.addEventListener('keydown',event=>{const menu=document.getElementById('accountQuickMenu');if(!menu||menu.classList.contains('hidden'))return;if(event.key==='Escape'){closeAccountMenu();document.getElementById('accountMenuTrigger').focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const items=[...menu.querySelectorAll('button')];let i=items.indexOf(document.activeElement);i=event.key==='Home'?0:event.key==='End'?items.length-1:(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[i].focus();}});
window.addEventListener('resize',closeAccountMenu);

function updateAccountThemeLabel(){const label=document.getElementById('accountThemeLabel');if(label)label.textContent=document.documentElement.classList.contains('dark')?'Modo claro':'Modo escuro';}
