let supportOwner = null;
let supportMode = 'support';
let supportState = null;
let supportSimulation = [];
let supportBusy = false;
let supportRefreshing = null;
let supportRevision = 0;
let supportLoadError = '';
let supportOlderMessages = [];
let supportHistoryCursor;
let supportHistoryLoading = false;
let supportRenderKey = '';
let supportDrafts = { support: '', simulation: '' };
let supportNotices = { support: '', simulation: '' };
let supportAttempts = { support: null, simulation: null };
let supportSavedRetry = null;

function initSupportView(mode) {
  const owner = [currentUser?.tenantId, currentUser?.userId].join(':');
  if (supportOwner !== owner) {
    supportOwner = owner;
    supportRevision++;
    supportState = null;
    supportSimulation = [];
    supportLoadError = '';
    supportOlderMessages = [];
    supportHistoryCursor = undefined;
    supportDrafts = { support: '', simulation: '' };
    supportNotices = { support: '', simulation: '' };
    supportAttempts = { support: null, simulation: null };
    supportSavedRetry = null;
  }
  if (mode !== supportMode) {
    supportDrafts[supportMode] = document.getElementById('supportMessageInput').value;
    supportMode = mode;
  }
  if (supportMode === 'simulation' && !canUseSupportSimulation()) switchToAuraSupport();
  document.getElementById('supportMessageInput').value = supportDrafts[supportMode];
  renderSupportView();
  void refreshSupportState();
}

function canUseSupportSimulation() {
  return supportState?.canSimulate ?? (currentUser?.canManageClinic === true);
}

function switchToAuraSupport() {
  supportMode = 'support';
  history.replaceState(null, '', '#support');
}

function simulationNeedsTraining() {
  return supportState?.simulationReady === false;
}

function renderSupportView() {
  const simulating = supportMode === 'simulation';
  const messages = simulating ? supportSimulation : [...supportOlderMessages, ...(supportState?.messages ?? [])];
  const needsTraining = simulating && simulationNeedsTraining();
  const input = document.getElementById('supportMessageInput');
  document.getElementById('supportModes').hidden = !canUseSupportSimulation();
  document.getElementById('supportModeButton').setAttribute('aria-pressed', String(!simulating));
  document.getElementById('simulationModeButton').setAttribute('aria-pressed', String(simulating));
  document.getElementById('supportModeButton').disabled = supportBusy;
  document.getElementById('simulationModeButton').disabled = supportBusy;
  document.getElementById('supportContext').hidden = simulating;
  document.getElementById('simulationContext').hidden = !simulating;
  const reset = document.getElementById('supportResetButton');
  reset.hidden = simulating ? !messages.length : !supportState?.threadId;
  reset.disabled = supportBusy;

  input.disabled = supportBusy || (simulating ? needsTraining : !supportState);
  input.placeholder = simulating ? 'Escreva como um paciente...' : 'Escreva sua dúvida...';
  input.setAttribute('aria-label', simulating ? 'Mensagem da simulação' : 'Mensagem de suporte');
  document.getElementById('supportSendButton').disabled = input.disabled;
  const notice = document.getElementById('supportNotice');
  const status = supportNotices[supportMode] || (simulating
    ? (needsTraining ? 'Preencha e salve os campos essenciais em Parâmetros de atendimento para simular.' : '')
    : (!supportState ? supportLoadError || 'Carregando conversa…' : ''));
  if (notice.textContent !== status) notice.textContent = status;
  notice.hidden = !status;
  document.getElementById('supportReloadButton').hidden = simulating || Boolean(supportState) || !supportLoadError;
  updateSupportRetryButton();
  const historyButton = document.getElementById('supportHistoryButton');
  historyButton.hidden = simulating || !supportHistoryBefore();
  historyButton.disabled = supportHistoryLoading || supportBusy;
  renderSupportMessages(messages);
}

function supportHistoryBefore() {
  return supportHistoryCursor === undefined ? supportState?.before : supportHistoryCursor;
}

function updateSupportRetryButton() {
  const retry = document.getElementById('supportRetryButton');
  retry.hidden = supportMode !== 'support' || !supportSavedRetry
    || Boolean(document.getElementById('supportMessageInput').value.trim());
  retry.disabled = supportBusy || !supportState;
}

async function loadOlderSupportMessages() {
  const before = supportHistoryBefore();
  if (!before || supportHistoryLoading || supportMode !== 'support' || supportBusy) return;
  const revision = supportRevision;
  const threadId = supportState.threadId;
  supportHistoryLoading = true;
  renderSupportView();
  try {
    const data = await fetchSupport('/api/support?before=' + encodeURIComponent(before));
    if (revision !== supportRevision || threadId !== supportState?.threadId || data.threadId !== threadId) return;
    const known = new Set([...supportOlderMessages, ...supportState.messages].map(turn => turn.id));
    supportOlderMessages = [...data.messages.filter(turn => !known.has(turn.id)), ...supportOlderMessages];
    supportHistoryCursor = data.before ?? null;
    supportNotices.support = '';
    const container = document.getElementById('supportMessagesArea');
    const previousHeight = container.scrollHeight;
    const previousScroll = container.scrollTop;
    renderSupportView();
    if (supportMode === 'support') container.scrollTop = previousScroll + container.scrollHeight - previousHeight;
  } catch {
    if (revision === supportRevision) supportNotices.support = 'Não foi possível carregar as mensagens anteriores. Tente novamente.';
  } finally {
    supportHistoryLoading = false;
    renderSupportView();
  }
}

function renderSupportMessages(messages) {
  const thread = [supportOwner, supportMode, supportMode === 'support' ? supportState?.threadId ?? '' : ''].join(':');
  const key = JSON.stringify([thread, messages]);
  if (supportRenderKey === key) return;
  supportRenderKey = key;
  const container = document.getElementById('supportMessagesArea');
  const previousScroll = container.scrollTop;
  const stickToEnd = container.dataset.thread !== thread || container.scrollHeight - container.clientHeight - previousScroll <= 48;
  container.dataset.thread = thread;
  const items = document.createDocumentFragment();
  for (const turn of messages) {
    const bubble = document.createElement('div');
    bubble.className = 'aura-support-bubble' + (turn.role === 'user' ? ' is-user' : '');
    const author = document.createElement('span');
    author.className = 'aura-support-author';
    author.textContent = turn.role === 'user' ? 'Você' : supportMode === 'simulation' ? 'Atendimento simulado' : 'Assistente do Aura';
    const content = document.createElement('p');
    content.textContent = turn.content;
    bubble.append(author, content);
    items.append(bubble);
  }
  container.replaceChildren(items);
  container.scrollTop = stickToEnd ? container.scrollHeight : previousScroll;
}

function applySupportState(data) {
  const changedThread = supportState?.threadId !== data.threadId;
  if (changedThread) {
    if (supportState?.threadId) supportSavedRetry = null;
    supportOlderMessages = [];
    supportHistoryCursor = undefined;
  } else if (supportHistoryCursor !== undefined) {
    const latest = new Set(data.messages.map(turn => turn.id));
    supportOlderMessages = [...supportOlderMessages, ...supportState.messages].filter(turn => !latest.has(turn.id));
  }
  supportState = data;
  if (supportMode === 'simulation' && !canUseSupportSimulation() && document.body.dataset.view === 'support') selectNavigationTab('support');
}

async function fetchSupport(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), body ? 45000 : 10000);
  try {
    const response = await fetch(path, {
      signal: controller.signal,
      cache: 'no-store',
      ...(body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Não foi possível acessar a conversa. Tente novamente.');
      error.status = response.status;
      error.code = data.code;
      error.messageSaved = data.messageSaved === true;
      throw error;
    }
    if (path === '/api/support/simulation' ? typeof data.reply !== 'string' : !Array.isArray(data.messages)) {
      throw new Error('Não foi possível carregar a conversa. Tente novamente.');
    }
    return data;
  } finally { clearTimeout(timer); }
}

async function refreshSupportState({ background = false, afterMutation = false } = {}) {
  if (supportRefreshing && afterMutation) await supportRefreshing.catch(() => {});
  if (supportRefreshing || supportBusy) return;
  const revision = supportRevision;
  if (!background) {
    supportLoadError = '';
    renderSupportView();
  }
  const request = fetchSupport('/api/support');
  supportRefreshing = request;
  try {
    const data = await request;
    if (supportRevision === revision) {
      supportLoadError = '';
      applySupportState(data);
    }
  } catch {
    if (supportRevision === revision) supportLoadError = 'Não foi possível atualizar a conversa. Tente novamente.';
  } finally {
    supportRefreshing = null;
    if (supportRevision === revision) renderSupportView();
  }
}

async function changeSupportState(path, body, { pending, onSuccess, onError } = {}) {
  if (supportBusy) return;
  const mode = supportMode;
  const owner = supportOwner;
  supportBusy = true;
  supportRevision++;
  supportNotices[mode] = pending;
  renderSupportView();
  let refresh = false;
  try {
    const data = await fetchSupport(path, body);
    if (owner === supportOwner) {
      if (mode === 'support') applySupportState(data);
      onSuccess?.(data);
      supportNotices[mode] = '';
    }
  } catch (error) {
    if (owner === supportOwner) {
      refresh = mode === 'support' ? ([409, 502].includes(error.status)) : error.code === 'TRAINING_REQUIRED';
      supportNotices[mode] = error.messageSaved ? 'Sua mensagem ficou registrada. A IA está indisponível no momento.'
        : error.status === 429 ? 'Aguarde um momento antes de tentar novamente.'
        : error.status ? error.message : 'Não foi possível concluir. Confira sua conexão e tente novamente.';
      onError?.(error);
    }
  } finally {
    supportBusy = false;
    renderSupportView();
    if (refresh) await refreshSupportState({ background: true, afterMutation: true });
  }
}

async function handleSupportSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('supportMessageInput');
  if (input.disabled || !input.value.trim()) return;
  const mode = supportMode;
  const simulating = mode === 'simulation';
  const message = input.value.trim();
  const attempt = supportAttempts[mode]?.message === message ? supportAttempts[mode] : {
    message, requestId: crypto.randomUUID(),
    ...(simulating ? { history: supportSimulation.slice(-12) } : { threadId: supportState.threadId })
  };
  supportAttempts[mode] = attempt;
  await sendSupportAttempt(mode, attempt);
}

async function retrySavedSupportMessage() {
  if (supportMode !== 'support' || !supportSavedRetry || supportBusy || !supportState
    || document.getElementById('supportMessageInput').value.trim()) return;
  await sendSupportAttempt('support', supportSavedRetry);
}

async function sendSupportAttempt(mode, attempt) {
  const simulating = mode === 'simulation';
  const input = document.getElementById('supportMessageInput');
  await changeSupportState(simulating ? '/api/support/simulation' : '/api/support/chat', attempt, {
    pending: 'Enviando mensagem…',
    onSuccess: (data) => {
      if (simulating) supportSimulation.push({ role: 'user', content: attempt.message }, { role: 'assistant', content: data.reply });
      else supportSavedRetry = null;
      supportDrafts[mode] = '';
      supportAttempts[mode] = null;
      if (supportMode === mode) input.value = '';
    },
    onError: (error) => {
      if (!simulating && error.messageSaved) {
        supportSavedRetry = attempt;
        supportAttempts.support = null;
        supportDrafts.support = '';
        if (supportMode === 'support') input.value = '';
      } else if (error.status >= 400 && error.status < 500 && error.status !== 429 && error.code !== 'REQUEST_PENDING') {
        supportAttempts[mode] = null;
        if (supportSavedRetry === attempt) supportSavedRetry = null;
      }
    }
  });
  if (document.body.dataset.view === 'support' && !input.disabled) input.focus();
}

async function resetSupportConversation() {
  if (supportBusy) return;
  const mode = supportMode;
  const reset = () => {
    supportDrafts[mode] = '';
    supportAttempts[mode] = null;
    supportNotices[mode] = '';
    if (mode === 'support') supportSavedRetry = null;
    if (supportMode === mode) document.getElementById('supportMessageInput').value = '';
  };
  if (mode === 'simulation') {
    supportSimulation = [];
    reset();
    renderSupportView();
    return;
  }
  if (!supportState?.threadId) return;
  await changeSupportState('/api/support/reset', { threadId: supportState.threadId }, { pending: 'Iniciando nova conversa…', onSuccess: reset });
}
