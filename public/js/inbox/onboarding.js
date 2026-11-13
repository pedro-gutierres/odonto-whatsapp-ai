let currentAccess = null;
let onboardingBusy = false;
let lastScheduleMode;
let lastAgendaReadiness;
const commercialLabels = { free:'Seu plano Free está disponível. Prepare o atendimento para começar.', preparing:'Simule o atendimento em Suporte, personalize sua clínica e conecte o WhatsApp para ativar o plano Free.', trial:'Seu teste gratuito está ativo.', active:'Seu plano está ativo.', ended:'O atendimento está pausado. Confira seu plano na página Plano.', legacy:'Seu atendimento está disponível.' };
let onboardingRequestId = 0;
let onboardingRequests = 0;
async function loadOnboarding({ background = false } = {}) {
  if (background && onboardingRequests) return false;
  const requestId = ++onboardingRequestId;
  onboardingRequests++;
  let networkFailure = false, status = 0;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    let response;
    try { response = await fetch('/api/onboarding', { signal: controller.signal }); }
    catch (error) { networkFailure = true; throw error; }
    status = response.status;
    if (status === 401 || status === 403) {
      const error = new Error(status === 401 ? 'Sua sessão expirou. Entre novamente para continuar.' : 'Seu acesso à conta está indisponível. Entre novamente para verificar.');
      throw error;
    }
    const data = await response.json();
    if (requestId !== onboardingRequestId) return false;
    if (!response.ok) throw new Error(data.error);
    if (!data.access || typeof data.access !== 'object') throw new Error('INVALID_ONBOARDING_RESPONSE');
    const hadHistory = currentAccess && currentAccess.can_read_history;
    currentAccess = data.access; renderOnboarding(data.trial_enabled); setOnboardingRefreshNotice('');
    if ((typeof currentUser === 'undefined' || !currentUser || currentUser.canManageClinic !== false) && (!background || document.body.dataset.view === 'plan')) await loadBilling({ signal: controller.signal });
    if (!hadHistory && currentAccess.can_read_history && typeof startPolling === 'function') {
      startPolling(); await loadConversations(false);
    }
    return true;
  } catch (error) {
    if (requestId !== onboardingRequestId) return false;
    const temporary = networkFailure || controller.signal.aborted || status === 429 || status >= 500;
    if (background && temporary && currentAccess) {
      setOnboardingRefreshNotice('Atualização automática temporariamente indisponível. Seus dados em edição foram mantidos. Tentaremos novamente.');
    } else {
      const message = status === 401 || status === 403 ? error.message : temporary
        ? 'Não foi possível atualizar o status da conta. Verifique sua conexão e tente novamente.'
        : 'Não foi possível verificar o status da conta. Recarregue a página para tentar novamente.';
      showToast(message, 'amber');
    }
    if (!temporary && status !== 401 && status !== 403) console.error('[ONBOARDING_REFRESH]', error);
    else console.warn('[ONBOARDING_REFRESH]', { status, networkFailure });
    return false;
  } finally { clearTimeout(timeout); onboardingRequests--; }
}
function setOnboardingRefreshNotice(message) {
  const notice = document.getElementById('onboardingRefreshNotice');
  if (notice) { notice.textContent = message; notice.classList.toggle('hidden', !message); }
}
function renderOnboarding(trialEnabled) {
  const access = currentAccess;
  const profile = (access.profile.kind === 'solo' ? 'Profissional autônomo' : access.profile.kind === 'clinic' ? 'Clínica' : 'Negócio') + (access.profile.sector === 'both' ? ' · Odontologia e Estética' : access.profile.sector === 'aesthetics' ? ' · Estética' : access.profile.sector === 'dentistry' ? ' · Odontologia' : '');
  document.getElementById('businessProfileLabel').textContent = profile;
  document.getElementById('businessSubtitle').textContent = profile;
  document.getElementById('onboardingStatus').textContent = commercialLabels[access.status] || '';
  const trial = access.trial;
  document.getElementById('operationalQuota').textContent = access.status==='trial' && trial.started_at ? trial.used + ' / ' + trial.limit + ' respostas usadas · Até ' + new Date(trial.ends_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}) : 'Confira os limites na página Plano.';
  for (const [id,ready] of [['readyTraining',access.readiness.training],['readyWhatsapp',access.readiness.whatsapp],['readyAgenda',access.readiness.agenda]]) {
    const badge = document.getElementById(id);
    badge.textContent = ready ? 'Pronto ✓' : 'Pendente';
    badge.classList.toggle('is-ready', Boolean(ready));
    badge.classList.toggle('is-pending', !ready);
  }
  document.getElementById('reviewTrainingBtn').classList.toggle('hidden', Boolean(access.readiness.training));
  const scheduleMode = ['aura','dedicated','external_manual'].includes(access.schedule_mode) ? access.schedule_mode : 'aura';
  if (lastScheduleMode !== scheduleMode) {
    document.getElementById('scheduleMode').value = scheduleMode;
    lastScheduleMode = scheduleMode;
  }
  if (lastAgendaReadiness !== access.readiness.agenda) {
    document.getElementById('agendaModeDetails').open = !access.readiness.agenda;
    lastAgendaReadiness = access.readiness.agenda;
  }
  const canManage = currentUser && currentUser.canManageClinic;
  document.getElementById('prepareTrialBtn').classList.toggle('hidden', true);
  document.getElementById('prepareTrialBtn').disabled = onboardingBusy || !canManage;
  document.getElementById('reviewTrainingBtn').disabled = onboardingBusy || !canManage;
  document.getElementById('saveAgendaReadinessBtn').disabled = onboardingBusy || !access.can_prepare || !canManage;
  const planActivation=['active','free'].includes(access.status) || access.status==='preparing' && access.tiered;
  document.getElementById('activateTrialBtn').disabled = onboardingBusy || (!trialEnabled && !planActivation) || !canManage || !['preparing','active','free'].includes(access.status) || !Object.values(access.readiness).every(Boolean);
  document.getElementById('activateTrialBtn').textContent = planActivation ? 'Ativar atendimento do plano' : 'Ativar teste de 7 dias';
  document.getElementById('activationAcknowledgmentText').textContent = planActivation ? 'Autorizo o atendimento real pelo número conectado dentro dos limites do meu plano.' : 'Quero iniciar agora os sete dias e autorizo o atendimento pelo número conectado.';
  const readyCount = Object.values(access.readiness).filter(Boolean).length;
  const pending = [['training','personalizar o treinamento'],['agenda','revisar a agenda e a equipe'],['whatsapp','conectar o WhatsApp']]
    .filter(([key]) => !access.readiness[key]).map(([,label]) => label);
  const progress = document.getElementById('activationProgress');
  progress.setAttribute('aria-valuenow', String(readyCount));
  progress.firstElementChild.style.width = (readyCount / 3 * 100) + '%';
  const preparation = readyCount + ' de 3 etapas prontas' + (pending.length ? ' — falta' + (pending.length === 1 ? ' apenas ' : ' ') + pending.join(' e ') + '.' : ' — tudo pronto para ativar!');
  document.getElementById('activationSummary').textContent = preparation + (planActivation
    ? ' Seu plano está disponível. Confirme abaixo para autorizar o atendimento.'
    : access.status === 'trial' ? ' Seu teste já está em andamento; concluir a preparação não reinicia o prazo.'
    : ' Os 7 dias grátis só começam com sua confirmação de ativação.');
  document.getElementById('activationAvailability').textContent = !trialEnabled && !planActivation ? 'Selecione seu plano para ativar o atendimento.' : pending.length ? 'Conclua ' + (pending.length === 1 ? 'a etapa pendente' : 'as etapas pendentes') + ' para ativar.' : '';
  document.getElementById('activationSection').classList.toggle('hidden',access.can_operate || access.status==='ended');
  document.getElementById('trialTerms').classList.toggle('hidden',planActivation);
  updateScheduleExplanation();
  const badge = document.getElementById('trialStatusWidget'); badge.classList.remove('hidden'); badge.classList.add('flex');
  document.getElementById('trialDaysBadge').textContent = ({free:'Conta gratuita',preparing:'Em preparação',trial:'Teste ativo',active:'Plano ativo',ended:'Ver meu plano',legacy:'Minha conta'})[access.status];
  document.getElementById('trialMessagesBadge').textContent = access.status === 'trial' ? trial.used + '/' + trial.limit + ' respostas' : '';
  document.getElementById('globalTrialExpiredBanner').classList.toggle('hidden', access.status !== 'ended');
  document.getElementById('trialExpiredTitle').textContent = 'Atendimento pausado';
  document.getElementById('trialExpiredSubtitle').textContent = 'Seu histórico continua disponível. Confira seu plano para retomar.';
  applyCommercialLocks();
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
    if (element) element.disabled = !real || !activePhone;
  }
  const notice = document.getElementById('agendaAccessNotice');
  if (notice) notice.textContent = currentAccess.status === 'free' ? 'Agenda de demonstração. Prepare seu atendimento para configurar horários e profissionais.' : !real ? currentAccess.status==='preparing' ? 'Prepare os horários antes de ativar o atendimento.' : 'Agenda disponível para consulta. O atendimento real está pausado.' : '';
  const form = document.getElementById('agendaBlockForm');
  if (form) for (const control of form.elements) control.disabled = !currentAccess.can_prepare || !currentUser.canManageClinic;
  for (const button of document.querySelectorAll('#viewAgenda button[onclick]')) {
    if (/handleConclude|handleDeleteAppointment/.test(button.getAttribute('onclick'))) button.disabled = !real;
  }
  for (const element of document.querySelectorAll('#appointmentDetailsModal select,#appointmentDetailsModal textarea,#btnSaveAppointmentDetails,#appointmentDetailsModal button[onclick*="handleDelete"]')) element.disabled = !real;
  for (const element of document.querySelectorAll('#professionalsModal input,#professionalsModal select,#btnSaveProfessional')) element.disabled = !currentAccess.can_prepare || !currentUser.canManageClinic;
  for (const element of document.querySelectorAll('#settingsPanelWhatsapp form input,#settingsPanelWhatsapp form button[type="submit"],#settingsPanelWhatsapp button[onclick*="launchMetaEmbeddedSignup"]')) element.disabled = !currentAccess.can_prepare || !currentUser.canManageClinic || (element.id==='btnLaunchEmbeddedSignup' && !clinicWhatsappState?.embedded_signup?.enabled);
  const scenario = document.getElementById('waNumberScenario');
  if (scenario) scenario.disabled = !currentAccess.can_prepare || !currentUser.canManageClinic;
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
  await onboardingAction(['active','free'].includes(currentAccess.status) || currentAccess.tiered ? 'start-paid' : 'activate');
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
    const row = document.createElement('div'); row.className = 'aura-block-item';
    const text = document.createElement('div');
    const name = document.createElement('p'); name.className='aura-block-name'; name.textContent=block.professional_name;
    const period = document.createElement('p'); period.className='aura-block-time'; period.textContent=formatBlockPeriod(block.starts_at,block.ends_at);
    text.append(name,period);
    const button = document.createElement('button'); button.type='button'; button.className='aura-text-button'; button.textContent = 'Remover'; button.setAttribute('aria-label','Remover bloqueio de '+block.professional_name); button.disabled = !currentAccess.can_prepare || !currentUser.canManageClinic;
    button.onclick = async () => {
      try { const res = await fetch('/api/agenda/blocks',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:block.id})}); const result = await res.json(); if(!res.ok)throw new Error(result.error); await loadAgendaBlocks(); }
      catch(error){showToast(error.message,'amber');}
    };
    row.append(text,button); list.append(row);
  }
  if (!data.blocks.length) { const empty=document.createElement('p');empty.className='aura-field-hint';empty.textContent='Nenhum horário bloqueado.';list.append(empty); }
  applyCommercialLocks(); window.auraUI?.refresh();
}
async function saveAgendaBlock(event) {
  event.preventDefault();
  if(!syncBlockPeriod())return;
  try {
    const response = await fetch('/api/agenda/blocks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({professionalId:Number(document.getElementById('blockProfessional').value),startsAt:document.getElementById('blockStart').value,endsAt:document.getElementById('blockEnd').value})});
    const data = await response.json(); if(!response.ok)throw new Error(data.error);
    await loadAgendaBlocks(); document.getElementById('blockEditor').open=false; showToast('Horário bloqueado.');
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

function updateScheduleExplanation() {
  const mode=document.getElementById('scheduleMode').value;
  const descriptions={aura:'Cadastre e mantenha seus compromissos na agenda do Aura.',dedicated:'Defina no Aura apenas os períodos reservados e mantenha-os livres também na sua outra agenda.',external_manual:'Bloqueie no Aura os horários ocupados na outra agenda. Atualize também remarcações e cancelamentos; não há sincronização automática.'};
  document.getElementById('scheduleExplanation').textContent=descriptions[mode];
  document.getElementById('maintenanceAcknowledgedLabel').classList.toggle('hidden',mode==='aura');
}

function openBlockEditor() {
  const editor=document.getElementById('blockEditor');editor.open=true;
  if(!document.getElementById('blockDate').value)document.getElementById('blockDate').value=window.auraUI.today();
  if(!document.getElementById('blockStartTime').value)document.getElementById('blockStartTime').value='09:00';
  if(!document.getElementById('blockEndTime').value)document.getElementById('blockEndTime').value='10:00';
  syncBlockPeriod();window.auraUI.refresh();
  document.getElementById('agendaBlocksSection').scrollIntoView({behavior:'smooth',block:'start'});
}
function syncBlockPeriod() {
  const date=document.getElementById('blockDate').value,start=document.getElementById('blockStartTime').value,end=document.getElementById('blockEndTime').value;
  const multiple=document.getElementById('blockMultipleDays').checked,endDate=document.getElementById('blockEndDate');
  document.getElementById('blockEndDateLabel').classList.toggle('hidden',!multiple);endDate.required=multiple;endDate.min=date;
  if(!multiple || !endDate.value)endDate.value=date;
  const startsAt=date && start ? date+'T'+start : '',endsAt=(multiple ? endDate.value:date) && end ? (multiple ? endDate.value:date)+'T'+end : '';
  document.getElementById('blockStart').value=startsAt;document.getElementById('blockEnd').value=endsAt;
  const valid=Boolean(startsAt && endsAt && endsAt>startsAt);
  document.getElementById('blockPeriodError').textContent=startsAt && endsAt && !valid ? 'O término precisa ser depois do início. Para atravessar a meia-noite, marque “Termina em outro dia”.' : '';
  window.auraUI?.refresh();return valid;
}
function formatBlockPeriod(start,end) {
  const format=value=>{const [date,time]=value.split(/[ T]/);const [year,month,day]=date.split('-');return day+'/'+month+'/'+year+' às '+time;};
  return start.slice(0,10)===end.slice(0,10) ? format(start)+'–'+end.slice(11,16) : format(start)+' até '+format(end);
}
