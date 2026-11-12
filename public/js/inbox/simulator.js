let simulatorMode = 'patient';
let simulatorSending = false;
let simulatorChats = { patient: [], aura: [] };
let simulatorOwner = null;
function initSimulatorView() {
  const owner = currentUser && currentUser.tenantId;
  if (simulatorOwner !== owner) { simulatorOwner = owner; simulatorChats = { patient: [], aura: [] }; }
  renderSimulatorMessages(); updateDemoState();
}
function changeSimulatorMode(mode) {
  if (simulatorSending) { document.getElementById('simulatorMode').value = simulatorMode; return; }
  simulatorMode = mode; renderSimulatorMessages(); updateDemoState();
}
function renderSimulatorMessages() {
  const container = document.getElementById('simulatorMessagesArea'); container.replaceChildren();
  const intro = document.createElement('p'); intro.className = 'text-sm text-slate-500 text-center py-4';
  intro.textContent = simulatorMode === 'patient' ? 'Converse como um paciente fictício. Nenhuma consulta será marcada.' : 'Pergunte sobre cadastro, preparação, teste e funcionamento do Aura.';
  container.append(intro);
  for (const turn of simulatorChats[simulatorMode]) {
    const bubble = document.createElement('div'); bubble.className = 'p-3 rounded-xl text-sm whitespace-pre-wrap max-w-2xl ' + (turn.role === 'user' ? 'ml-auto bg-purple-100 dark:bg-purple-950' : 'bg-white dark:bg-slate-800');
    bubble.textContent = turn.content; container.append(bubble);
  }
  container.scrollTop = container.scrollHeight;
}
function updateDemoState() {
  if (!currentAccess) return;
  const demo = currentAccess.demo;
  document.getElementById('demoQuota').textContent = demo.used + ' / ' + demo.limit + ' respostas usadas';
  const needsTraining = simulatorMode === 'patient' && !isCrucialTrainingComplete(), exhausted = demo.used >= demo.limit;
  const banner = document.getElementById('simulatorLockBanner');
  banner.textContent = exhausted ? 'Sua cota do Test Drive terminou. O teste operacional tem outra cota.' : needsTraining ? 'Salve o treinamento mínimo para simular um paciente. Você já pode tirar dúvidas sobre o Aura no outro modo.' : '';
  banner.classList.toggle('hidden', !banner.textContent);
  document.getElementById('simulatorMessageInput').disabled = simulatorSending || exhausted || needsTraining;
  document.getElementById('simulatorSendBtn').disabled = simulatorSending || exhausted || needsTraining;
  document.getElementById('simulatorMode').disabled = simulatorSending;
}
async function handleSimulatorSubmit(event) { event.preventDefault(); await sendSimulatorMessage(document.getElementById('simulatorMessageInput').value); }
async function sendSimulatorMessage(text) {
  if (simulatorSending || !text.trim()) return;
  simulatorSending = true; updateDemoState();
  const history = simulatorChats[simulatorMode].slice(-12);
  simulatorChats[simulatorMode].push({ role: 'user', content: text.trim() }); document.getElementById('simulatorMessageInput').value = ''; renderSimulatorMessages();
  try {
    const response = await fetch('/api/simulator/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: simulatorMode, message: text, history, requestId: crypto.randomUUID() }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível responder.');
    simulatorChats[simulatorMode].push({ role: 'assistant', content: data.reply }); currentAccess.demo = data.demo; renderSimulatorMessages();
  } catch (error) { showToast(error.message, 'amber'); }
  finally { simulatorSending = false; await loadOnboarding(); updateDemoState(); }
}
function resetSimulatorChat() {
  if (simulatorSending) return;
  simulatorChats[simulatorMode] = []; renderSimulatorMessages(); showToast('Conversa reiniciada. A cota permanece a mesma.', 'purple');
}
function updateTrialWidget() { /* Operational status comes from /api/onboarding. */ }
