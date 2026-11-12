let currentAccess = null;
let onboardingBusy = false;
const commercialLabels = { free: 'Conta gratuita. Seu teste ainda não começou.', preparing: 'Preparando o teste. Seus sete dias ainda não começaram.', trial: 'Teste operacional ativo.', active: 'Assinatura ativa.', ended: 'Acesso operacional encerrado. Seu histórico permanece disponível.', legacy: 'Conta anterior à reestruturação. Operação preservada até revisão comercial.' };
async function loadOnboarding() {
  try {
    const response = await fetch('/api/onboarding'); const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    currentAccess = data.access; renderOnboarding(data.trial_enabled); await loadBilling(); return true;
  } catch (error) { showToast(error.message || 'Não foi possível verificar seu acesso.', 'amber'); return false; }
}
function renderOnboarding(trialEnabled) {
  const access = currentAccess;
  const profile = (access.profile.kind === 'solo' ? 'Profissional autônomo' : access.profile.kind === 'clinic' ? 'Clínica' : 'Negócio') + (access.profile.sector === 'aesthetics' ? ' · Estética' : access.profile.sector === 'dentistry' ? ' · Odontologia' : '');
  document.getElementById('businessProfileLabel').textContent = profile;
  document.getElementById('businessSubtitle').textContent = profile;
  document.getElementById('onboardingStatus').textContent = commercialLabels[access.status] || '';
  const trial = access.trial;
  document.getElementById('operationalQuota').textContent = trial.started_at ? trial.used + ' / ' + trial.limit + ' respostas da IA · Término: ' + new Date(trial.ends_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) : 'Teste operacional não iniciado';
  for (const [id,ready] of [['readyTraining',access.readiness.training],['readyWhatsapp',access.readiness.whatsapp],['readyAgenda',access.readiness.agenda]]) document.getElementById(id).textContent = ready ? '✓' : '○';
  const canManage = currentUser && currentUser.canManageClinic;
  document.getElementById('prepareTrialBtn').classList.toggle('hidden', access.status !== 'free');
  document.getElementById('prepareTrialBtn').disabled = onboardingBusy || !canManage;
  document.getElementById('reviewTrainingBtn').disabled = onboardingBusy || !canManage;
  document.getElementById('saveAgendaReadinessBtn').disabled = onboardingBusy || !access.can_prepare || !canManage;
  document.getElementById('activateTrialBtn').disabled = onboardingBusy || (!trialEnabled && access.status !== 'active') || !canManage || !['preparing','active'].includes(access.status) || !Object.values(access.readiness).every(Boolean);
  document.getElementById('activateTrialBtn').textContent = access.status === 'active' ? 'Ativar atendimento da assinatura' : 'Ativar atendimento por 7 dias';
  document.getElementById('activationAcknowledgmentText').textContent = access.status === 'active' ? 'Autorizo o atendimento real pelo número conectado durante a vigência da assinatura.' : 'Quero iniciar agora os sete dias e autorizo o atendimento pelo número conectado.';
  document.getElementById('activationSummary').textContent = access.status === 'active' ? 'A assinatura está vigente. Confira a preparação antes de ativar o atendimento real.' : 'Confira treinamento, diagnóstico do número e agenda acima. Ao ativar, o término será em 168 horas, com limite de 100 respostas da IA.';
  document.getElementById('activationAvailability').textContent = !trialEnabled ? 'Ativação indisponível neste ambiente.' : access.status === 'ended' ? 'O teste terminou. Um novo clique não renova o benefício.' : '';
  const badge = document.getElementById('trialStatusWidget'); badge.classList.remove('hidden'); badge.classList.add('flex');
  document.getElementById('trialDaysBadge').textContent = ({free:'Conta gratuita',preparing:'Em preparação',trial:'Teste ativo',active:'Assinatura ativa',ended:'Operação encerrada',legacy:'Conta existente'})[access.status];
  document.getElementById('trialMessagesBadge').textContent = access.status === 'trial' ? trial.used + '/' + trial.limit + ' respostas' : 'Test Drive: ' + access.demo.used + '/' + access.demo.limit;
  document.getElementById('globalTrialExpiredBanner').classList.toggle('hidden', access.status !== 'ended');
  document.getElementById('trialExpiredTitle').textContent = 'Acesso operacional encerrado';
  document.getElementById('trialExpiredSubtitle').textContent = 'Envios e novas operações estão bloqueados. Consulte seu histórico e o plano.';
  applyCommercialLocks(); if (typeof updateDemoState === 'function') updateDemoState();
}
function applyCommercialLocks() {
  if (!currentAccess) return;
  for (const id of ['btnNewAppointmentAgenda','btnScheduleThisPatient']) {
    const button = document.getElementById(id);
    if (button) { button.disabled = !currentAccess.can_operate; button.title = currentAccess.can_operate ? 'Criar agendamento' : 'Disponível com atendimento real ativo'; }
  }
  const real = currentAccess.can_operate;
  for (const id of ['messageInput','sendBtn','toggleAiBtn']) {
    const element = document.getElementById(id);
    if (element && !real) element.disabled = true;
  }
  const notice = document.getElementById('agendaAccessNotice');
  if (notice) notice.textContent = currentAccess.status === 'free' ? 'Demonstração da agenda. Inicie a preparação para cadastrar profissionais e bloqueios; consultas reais exigem ativação.' : !real ? 'Você pode consultar esta agenda. Novas consultas exigem atendimento ativo.' : '';
  const form = document.getElementById('agendaBlockForm');
  if (form) for (const control of form.elements) control.disabled = !currentAccess.can_prepare || !currentUser.canManageClinic;
  for (const button of document.querySelectorAll('#viewAgenda button[onclick]')) {
    if (/handleConclude|handleDeleteAppointment/.test(button.getAttribute('onclick'))) button.disabled = !real;
  }
}
async function onboardingAction(action, body) {
  if (onboardingBusy) return; onboardingBusy = true;
  try {
    const response = await fetch('/api/onboarding/' + action, { method:'POST', headers:{'content-type':'application/json'},body:JSON.stringify(body || {}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    await loadOnboarding(); showToast('Etapa atualizada.');
  } catch (error) { showToast(error.message, 'amber'); }
  finally { onboardingBusy = false; await loadOnboarding(); }
}
async function activateOperationalTrial() {
  if (!document.getElementById('activationAcknowledged').checked) return showToast('Confirme que deseja iniciar agora.', 'amber');
  await onboardingAction(currentAccess.status === 'active' ? 'start-paid' : 'activate');
}
async function loadAgendaBlocks() {
  const select = document.getElementById('blockProfessional');
  if (!select) return;
  select.replaceChildren();
  for (const professional of professionals.filter(p => p.active)) {
    const option = document.createElement('option'); option.value = professional.id; option.textContent = professional.name; select.append(option);
  }
  const response = await fetch('/api/agenda/blocks');
  if (!response.ok) return;
  const data = await response.json(); const list = document.getElementById('agendaBlocksList'); list.replaceChildren();
  for (const block of data.blocks) {
    const row = document.createElement('div'); row.className = 'flex justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg';
    const text = document.createElement('span'); text.textContent = block.professional_name + ': ' + block.starts_at + ' até ' + block.ends_at;
    const button = document.createElement('button'); button.textContent = 'Remover'; button.disabled = !currentAccess.can_prepare || !currentUser.canManageClinic;
    button.onclick = async () => {
      try { const res = await fetch('/api/agenda/blocks',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:block.id})}); const result = await res.json(); if(!res.ok)throw new Error(result.error); await loadAgendaBlocks(); }
      catch(error){showToast(error.message,'amber');}
    };
    row.append(text,button); list.append(row);
  }
  applyCommercialLocks();
}
async function saveAgendaBlock(event) {
  event.preventDefault();
  try {
    const response = await fetch('/api/agenda/blocks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({professionalId:Number(document.getElementById('blockProfessional').value),startsAt:document.getElementById('blockStart').value,endsAt:document.getElementById('blockEnd').value})});
    const data = await response.json(); if(!response.ok)throw new Error(data.error);
    await loadAgendaBlocks(); showToast('Horário bloqueado sem criar consulta ou lembrete.');
  }catch(error){showToast(error.message,'amber');}
}
let occupationImportPreview = null;
function downloadOccupationTemplate() {
  const name = professionals.find(p=>p.active)?.name || 'Nome do profissional';
  const csv = '\uFEFFprofissional,inicio,fim\n"' + name.replace(/"/g,'""') + '",2030-01-01 10:00,2030-01-01 11:00\n';
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='ocupacoes-aura.csv';anchor.click();URL.revokeObjectURL(url);
}
async function previewOccupationImport() {
  occupationImportPreview=null;document.getElementById('commitOccupationBtn').disabled=true;
  try {
    const file=document.getElementById('occupationCsv').files[0];if(!file||file.size>100000)throw new Error('Selecione um CSV de até 100 KB.');
    const response=await fetch('/api/agenda/import/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({csv:await file.text()})});
    const data=await response.json();if(!response.ok)throw new Error(data.error);
    occupationImportPreview=data;const container=document.getElementById('occupationImportPreview');container.replaceChildren();
    const notice=document.createElement('p');notice.textContent=data.notice;container.append(notice);
    for(const row of data.rows){const line=document.createElement('p');line.textContent=row.professionalName+': '+row.startsAt+' até '+row.endsAt;container.append(line);}
    document.getElementById('commitOccupationBtn').disabled=false;
  }catch(error){showToast(error.message,'amber');}
}
async function commitOccupationImport() {
  if(!occupationImportPreview)return;
  const button=document.getElementById('commitOccupationBtn');button.disabled=true;
  try{
    const response=await fetch('/api/agenda/import/commit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({batchId:occupationImportPreview.batchId,confirmed:true})});
    const data=await response.json();if(!response.ok)throw new Error(data.error);
    occupationImportPreview=null;document.getElementById('occupationImportPreview').textContent='Bloqueios importados. Confira a lista de ocupações acima.';await loadAgendaBlocks();
  }catch(error){button.disabled=false;showToast(error.message,'amber');}
}
