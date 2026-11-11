// =============================================================================
// SIMULADOR DE ATENDIMENTO ("TEST DRIVE GUIADO") — CONTROLLER CLIENT-SIDE
// =============================================================================

let simulatorHistory = [];
let isSimulatorSending = false;
let simulatorTrialState = null;
const SIMULATOR_STORAGE_KEY = 'aura_sim_history';

// 1. INICIALIZAÇÃO DA ABA DO SIMULADOR
function initSimulatorView() {
  loadSimulatorConfigSummary();
  loadSimulatorStoredHistory();
  renderSimulatorMessages();
  updateSimulatorCharCount();

  if (simulatorTrialState && !simulatorTrialState.can_send_messages) {
    applySimulatorLockState(true);
  }

  const input = document.getElementById('simulatorMessageInput');
  if (input && !input.disabled) {
    setTimeout(() => input.focus(), 150);
  }
}

// 2. CARREGA RESUMO DAS CONFIGURAÇÕES ATIVAS NO SIDEBAR
function loadSimulatorConfigSummary() {
  const elClinic = document.getElementById('simStatusClinicName');
  const elTone = document.getElementById('simStatusTone');

  if (typeof currentConfig !== 'undefined' && currentConfig) {
    if (elClinic) elClinic.innerText = currentConfig.clinic_name || 'Clínica Principal';
    if (elTone) {
      const toneMap = {
        'acolhedor': '🌸 Acolhedor & Gentil',
        'sofisticado': '✨ Sofisticado & Exclusivo',
        'clinico': '🩺 Clínico & Técnico'
      };
      elTone.innerText = toneMap[currentConfig.tone] || currentConfig.tone || 'Acolhedor';
    }
  }
}

// 3. PERSISTÊNCIA EM SESSION STORAGE
function loadSimulatorStoredHistory() {
  try {
    const raw = sessionStorage.getItem(SIMULATOR_STORAGE_KEY);
    if (raw) {
      simulatorHistory = JSON.parse(raw);
    }
  } catch (e) {
    simulatorHistory = [];
  }
}

function saveSimulatorHistory() {
  try {
    sessionStorage.setItem(SIMULATOR_STORAGE_KEY, JSON.stringify(simulatorHistory));
  } catch (e) {
    // Silêncio
  }
}

// 4. ATUALIZADOR DO CONTADOR DE CARACTERES
function updateSimulatorCharCount() {
  const input = document.getElementById('simulatorMessageInput');
  const countEl = document.getElementById('simulatorCharCount');
  if (input && countEl) {
    countEl.innerText = `${input.value.length} / 1000`;
  }
}

// 5. ENVIO DE CENÁRIOS RÁPIDOS (CHIPS)
function sendSimulatorScenario(promptText) {
  if (isSimulatorSending) return;
  if (simulatorTrialState && !simulatorTrialState.can_send_messages) {
    if (typeof showToast === 'function') {
      showToast('Período de testes finalizado. Ative sua assinatura para continuar.', 'amber');
    }
    return;
  }
  const input = document.getElementById('simulatorMessageInput');
  if (input) input.value = promptText;
  sendSimulatorMessage(promptText);
}

// 6. SUBMISSÃO DO FORMULÁRIO DO SIMULADOR
function handleSimulatorSubmit(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('simulatorMessageInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  sendSimulatorMessage(text);
}

// 7. ENVIO DE MENSAGEM & REQUISIÇÃO AO BACKEND
async function sendSimulatorMessage(text) {
  if (isSimulatorSending) return;
  const trimmed = String(text || '').trim();
  if (!trimmed) return;

  if (simulatorTrialState && !simulatorTrialState.can_send_messages) {
    if (typeof showToast === 'function') {
      showToast('Limite de mensagens atingido ou período de testes expirado.', 'rose');
    }
    applySimulatorLockState(true);
    return;
  }

  isSimulatorSending = true;
  const input = document.getElementById('simulatorMessageInput');
  const sendBtn = document.getElementById('simulatorSendBtn');
  const typingIndicator = document.getElementById('simulatorTypingIndicator');

  if (input) {
    input.value = '';
    updateSimulatorCharCount();
    input.disabled = true;
  }
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i>';
  }

  // 1. Adiciona e renderiza a mensagem do paciente no chat
  const nowIso = new Date().toISOString();
  simulatorHistory.push({
    role: 'user',
    content: trimmed,
    time: nowIso
  });
  saveSimulatorHistory();
  renderSimulatorMessages();
  scrollSimulatorToBottom();

  // 2. Exibe indicador de digitação da IA
  if (typingIndicator) typingIndicator.classList.remove('hidden');
  scrollSimulatorToBottom();

  try {
    // 3. Executa POST /api/simulator/chat enviando apenas os turnos de histórico
    const historyPayload = simulatorHistory.slice(0, -1).slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    const res = await fetch('/api/simulator/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: trimmed,
        history: historyPayload
      })
    });

    const data = await res.json();

    if (typingIndicator) typingIndicator.classList.add('hidden');

    if (res.status === 200 && data.reply) {
      // Mensagem da IA recebida com sucesso
      simulatorHistory.push({
        role: 'assistant',
        content: data.reply,
        time: new Date().toISOString(),
        action: data.action
      });
      saveSimulatorHistory();
      renderSimulatorMessages();
      scrollSimulatorToBottom();

      // Atualiza cota e widget do trial
      if (data.trial && typeof updateTrialWidget === 'function') {
        updateTrialWidget(data.trial);
      }
    } else if (res.status === 403 || data.code === 'TRIAL_LIMIT_EXCEEDED') {
      // Bloqueio por expiração de trial
      if (data.trial && typeof updateTrialWidget === 'function') {
        updateTrialWidget(data.trial);
      }
      applySimulatorLockState(true);
      renderTrialExpiredBubble();
      if (typeof showToast === 'function') {
        showToast('Limite de 100 mensagens atingido ou período de teste expirado.', 'amber');
      }
    } else {
      // Outro erro de resposta
      const errMsg = data.error || 'Ocorreu um erro ao processar a resposta da IA.';
      renderErrorMessageBubble(errMsg);
      if (typeof showToast === 'function') showToast(errMsg, 'rose');
    }
  } catch (err) {
    console.error('Erro no simulador:', err);
    if (typingIndicator) typingIndicator.classList.add('hidden');
    renderErrorMessageBubble('Falha de conexão com o servidor. Verifique sua rede e tente novamente.');
  } finally {
    isSimulatorSending = false;
    const isLocked = simulatorTrialState && !simulatorTrialState.can_send_messages;
    if (input) {
      input.disabled = isLocked;
      if (!isLocked) input.focus();
    }
    if (sendBtn) {
      sendBtn.disabled = isLocked;
      sendBtn.innerHTML = '<span>Enviar</span><i class="fa-solid fa-paper-plane text-[10px]"></i>';
    }
    scrollSimulatorToBottom();
  }
}

// 8. RENDERIZAÇÃO DAS MENSAGENS NO CHAT
function renderSimulatorMessages() {
  const container = document.getElementById('simulatorMessagesArea');
  if (!container) return;

  if (simulatorHistory.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center max-w-lg mx-auto space-y-3">
        <div class="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center text-2xl mx-auto shadow-sm">
          <i class="fa-solid fa-flask-vial"></i>
        </div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">Bem-vindo ao Test Drive da sua Secretária IA</h3>
        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Este é o ambiente interativo de testes da Aura AI. Você pode conversar diretamente com o modelo treinado para sua clínica, testar dúvidas de pacientes ou simular um agendamento.
        </p>
        <div class="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
          💡 Escolha um dos <b>Cenários Rápidos</b> na barra lateral ou digite sua pergunta abaixo para começar!
        </div>
      </div>
    `;
    return;
  }

  const html = simulatorHistory.map((m) => {
    const isUser = m.role === 'user';
    const timeStr = m.time ? (typeof formatMessageTime === 'function' ? formatMessageTime(m.time) : new Date(m.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) : '';

    if (isUser) {
      return `
        <div class="flex flex-col items-end max-w-[85%] md:max-w-[70%] ml-auto animate-fade-in">
          <div class="bg-[#d9fdd3] dark:bg-[#005c4b] border border-emerald-200 dark:border-emerald-700/40 text-slate-900 dark:text-white p-3 rounded-2xl rounded-tr-sm shadow-sm text-xs leading-relaxed">
            <div class="text-[9px] font-bold uppercase tracking-wider mb-1 text-emerald-700 dark:text-emerald-300">
              Paciente (Você)
            </div>
            <div class="whitespace-pre-wrap break-words">${escapeHtml(m.content)}</div>
            <div class="text-[9px] opacity-75 text-right mt-1 font-mono flex items-center justify-end gap-1">
              <span>${timeStr}</span>
              <i class="fa-solid fa-check-double text-[9px] text-[#53bdeb]"></i>
            </div>
          </div>
        </div>
      `;
    } else {
      let actionCardHtml = '';
      if (m.action && m.action.type === 'appointment_created') {
        const d = m.action.details || {};
        actionCardHtml = `
          <div class="mt-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/70 text-xs shadow-xs space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <i class="fa-solid fa-calendar-check text-emerald-600 dark:text-emerald-400"></i>
                <span>Ação da IA: Consulta Agendada na Grade!</span>
              </div>
              <span class="text-[9px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Gravado no D1
              </span>
            </div>
            <div class="text-[11px] text-emerald-700 dark:text-emerald-300/90 space-y-0.5">
              <div>Paciente: <b>${escapeHtml(d.patient_name || 'Paciente')}</b></div>
              <div>Procedimento: <b>${escapeHtml(d.procedure || 'Consulta')}</b></div>
              <div>Data/Horário: <b>${escapeHtml(d.scheduled_at || '')}</b> • Profissional: <b>${escapeHtml(d.professional_name || 'Geral')}</b></div>
            </div>
            <div class="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
              <span class="text-[10px] text-slate-500 dark:text-slate-400">Visível na aba Agenda</span>
              <button type="button" onclick="selectNavigationTab('agenda', 'Agenda', 'fa-regular fa-calendar-check', 'sky')" 
                class="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1">
                <span>Conferir na Agenda</span>
                <i class="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          </div>
        `;
      } else if (m.action && m.action.type === 'appointment_conflict') {
        actionCardHtml = `
          <div class="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/70 text-xs shadow-xs space-y-1">
            <div class="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
              <span>Horário com Conflito na Grade</span>
            </div>
            <p class="text-[11px] text-amber-700 dark:text-amber-300/90">${escapeHtml(m.action.message || 'Este horário já está ocupado por outra consulta.')}</p>
          </div>
        `;
      }

      return `
        <div class="flex flex-col items-start max-w-[85%] md:max-w-[70%] animate-fade-in">
          <div class="bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-100 p-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200/50 dark:border-slate-700/30 text-xs leading-relaxed">
            <div class="flex items-center gap-1.5 mb-1.5 text-purple-600 dark:text-purple-400 font-bold text-[10px]">
              <i class="fa-solid fa-sparkles"></i>
              <span>Aura AI (Secretária Virtual)</span>
            </div>
            <div class="whitespace-pre-wrap break-words leading-relaxed">${escapeHtml(m.content)}</div>
            ${actionCardHtml}
            <div class="text-[9px] text-slate-400 dark:text-slate-400 text-right mt-1 font-mono">${timeStr}</div>
          </div>
        </div>
      `;
    }
  }).join('');

  container.innerHTML = html;
}

// 9. BUBBLE DE ERRO / AVISO DE EXPIRAÇÃO
function renderTrialExpiredBubble() {
  const container = document.getElementById('simulatorMessagesArea');
  if (!container) return;
  const bubble = document.createElement('div');
  bubble.className = 'flex flex-col items-center my-3';
  bubble.innerHTML = `
    <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs text-center max-w-md shadow-xs space-y-1.5">
      <div class="font-bold flex items-center justify-center gap-2">
        <i class="fa-solid fa-triangle-exclamation text-amber-500"></i>
        <span>Limite de Test Drive Atingido</span>
      </div>
      <p class="text-[11px]">Você consumiu todas as 100 mensagens gratuitas do período de avaliação ou seu prazo encerrou.</p>
    </div>
  `;
  container.appendChild(bubble);
}

function renderErrorMessageBubble(msg) {
  const container = document.getElementById('simulatorMessagesArea');
  if (!container) return;
  const bubble = document.createElement('div');
  bubble.className = 'flex flex-col items-center my-2';
  bubble.innerHTML = `
    <div class="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/60 text-rose-700 dark:text-rose-300 text-[11px] text-center max-w-md shadow-xs">
      <i class="fa-solid fa-circle-exclamation mr-1"></i> ${escapeHtml(msg)}
    </div>
  `;
  container.appendChild(bubble);
}

// 10. REINICIAR CONVERSA
function resetSimulatorChat() {
  if (simulatorHistory.length > 0) {
    if (!confirm('Deseja reiniciar a conversa do simulador?')) return;
  }
  simulatorHistory = [];
  try {
    sessionStorage.removeItem(SIMULATOR_STORAGE_KEY);
  } catch (e) {}
  renderSimulatorMessages();
  if (typeof showToast === 'function') {
    showToast('Histórico do simulador reiniciado.', 'purple');
  }
  const input = document.getElementById('simulatorMessageInput');
  if (input && !input.disabled) input.focus();
}

// 11. CONTROLE DE BLOQUEIO DO SIMULADOR (READ-ONLY PRESERVATION)
function applySimulatorLockState(isLocked) {
  const lockBanner = document.getElementById('simulatorLockBanner');
  const input = document.getElementById('simulatorMessageInput');
  const sendBtn = document.getElementById('simulatorSendBtn');

  if (lockBanner) {
    if (isLocked) lockBanner.classList.remove('hidden');
    else lockBanner.classList.add('hidden');
  }
  if (input) {
    input.disabled = isLocked;
    if (isLocked) {
      input.placeholder = 'Período de testes finalizado. Ative sua assinatura para continuar.';
    } else {
      input.placeholder = 'Digite como se fosse um paciente no WhatsApp...';
    }
  }
  if (sendBtn) {
    sendBtn.disabled = isLocked;
  }
}

// 12. ROLAGEM SUAVE PARA O FINAL DO CHAT
function scrollSimulatorToBottom() {
  const container = document.getElementById('simulatorMessagesArea');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// 13. WIDGET DE STATUS DO TRIAL GLOBAL
function updateTrialWidget(trialInfo) {
  if (!trialInfo) return;
  simulatorTrialState = trialInfo;

  const widget = document.getElementById('trialStatusWidget');
  const daysBadge = document.getElementById('trialDaysBadge');
  const msgsBadge = document.getElementById('trialMessagesBadge');
  const icon = document.getElementById('trialStatusIcon');
  const globalBanner = document.getElementById('globalTrialExpiredBanner');

  if (!widget || !daysBadge || !msgsBadge) return;

  widget.classList.remove('hidden');
  widget.classList.add('flex');

  const isExpired = trialInfo.is_expired || trialInfo.is_limit_reached || trialInfo.can_send_messages === false;
  const used = trialInfo.trial_messages_used ?? 0;
  const limit = trialInfo.trial_messages_limit ?? 100;
  const days = trialInfo.days_remaining ?? 0;

  if (trialInfo.plan_status === 'active') {
    daysBadge.innerText = 'PRO • Ativo';
    msgsBadge.innerText = 'Ilimitado';
    widget.className = 'cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition shadow-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
    if (globalBanner) globalBanner.classList.add('hidden');
    applySimulatorLockState(false);
    return;
  }

  daysBadge.innerText = isExpired ? 'Trial Expirado' : `${days} ${days === 1 ? 'dia restante' : 'dias restantes'}`;
  msgsBadge.innerText = `${used} / ${limit} msgs`;

  if (isExpired) {
    widget.className = 'cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition shadow-xs bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300';
    if (icon) icon.className = 'fa-solid fa-triangle-exclamation text-xs text-rose-500';
    if (globalBanner) globalBanner.classList.remove('hidden');
    applySimulatorLockState(true);
  } else if (used >= 80 || days <= 2) {
    widget.className = 'cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition shadow-xs bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300';
    if (icon) icon.className = 'fa-solid fa-clock-rotate-left text-xs text-amber-500';
    if (globalBanner) globalBanner.classList.add('hidden');
    applySimulatorLockState(false);
  } else {
    widget.className = 'cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition shadow-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
    if (icon) icon.className = 'fa-solid fa-clock-rotate-left text-xs text-emerald-500';
    if (globalBanner) globalBanner.classList.add('hidden');
    applySimulatorLockState(false);
  }
}

// 14. EXPOSIÇÃO GLOBAL PARA WINDOW
window.initSimulatorView = initSimulatorView;
window.sendSimulatorScenario = sendSimulatorScenario;
window.handleSimulatorSubmit = handleSimulatorSubmit;
window.sendSimulatorMessage = sendSimulatorMessage;
window.resetSimulatorChat = resetSimulatorChat;
window.updateSimulatorCharCount = updateSimulatorCharCount;
window.updateTrialWidget = updateTrialWidget;
