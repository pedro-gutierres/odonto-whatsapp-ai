export const INBOX_ONBOARDING_VIEW_HTML = `
<main id="viewOnboarding" class="hidden flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50 dark:bg-[#0b0f17]">
<div class="max-w-4xl mx-auto space-y-5 pb-10">
<section class="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-2xl">
<p id="businessProfileLabel" class="text-sm text-emerald-600 dark:text-emerald-400"></p><h2 class="text-2xl font-bold mt-2">Preparação e plano</h2>
<p id="onboardingStatus" class="mt-3 text-sm" aria-live="polite"></p><p id="operationalQuota" class="mt-2 text-sm text-slate-500"></p>
<p class="mt-4 text-sm text-slate-500">Cadastro gratuito e Test Drive não iniciam os sete dias. O teste real dura 168 horas ou 100 respostas enviadas pela IA, sem cartão e sem cobrança automática. Envios humanos e lembretes não consomem essa cota, mas param ao encerrar o teste. Custos da Meta são separados.</p>
<button id="prepareTrialBtn" onclick="onboardingAction('prepare')" class="mt-4 bg-emerald-500 text-slate-950 px-4 py-3 rounded-xl text-sm font-bold">Preparar meu teste</button>
</section>
<section class="grid md:grid-cols-3 gap-4">
<div class="bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 rounded-2xl"><h3 class="font-bold">1. Treinamento <span id="readyTraining"></span></h3><p class="text-sm text-slate-500 mt-2">Preencha os dados reais e salve. Depois confirme que revisou as informações.</p><button onclick="selectNavigationTab('config','Meu negócio e IA','fa-solid fa-brain','purple')" class="underline text-sm mt-4">Editar treinamento</button><button id="reviewTrainingBtn" onclick="onboardingAction('review-training')" class="block mt-3 text-sm font-bold text-emerald-600">Confirmar revisão</button></div>
<div class="bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 rounded-2xl"><h3 class="font-bold">2. WhatsApp <span id="readyWhatsapp"></span></h3><p class="text-sm text-slate-500 mt-2">Prefira um número dedicado à captação. Conecte e execute o diagnóstico antes de ativar.</p><button onclick="selectNavigationTab('settings','WhatsApp','fa-brands fa-whatsapp','emerald');switchSettingsSubTab('whatsapp')" class="underline text-sm mt-4">Conectar e diagnosticar</button></div>
<div class="bg-white dark:bg-slate-900 border dark:border-slate-800 p-5 rounded-2xl"><h3 class="font-bold">3. Agenda <span id="readyAgenda"></span></h3><p class="text-sm text-slate-500 mt-2">Cadastre profissionais, expedientes e ocupações. Atender pelo WhatsApp 24h não exige consultas disponíveis 24h.</p><button onclick="selectNavigationTab('agenda','Agenda','fa-regular fa-calendar-check','sky')" class="underline text-sm mt-4">Preparar agenda</button></div>
</section>
<section class="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-2xl space-y-3">
<h3 class="font-bold">Como manter a disponibilidade correta?</h3>
<label class="block text-sm" for="scheduleMode">Estratégia da agenda</label><select id="scheduleMode" class="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"><option value="aura">Vou manter a agenda principal no Aura</option><option value="dedicated">Vou reservar horários exclusivos para o Aura</option><option value="external_manual">Vou atualizar manualmente as ocupações de outra agenda</option></select>
<label class="flex gap-2 text-sm"><input type="checkbox" id="maintenanceAcknowledged">Confirmo que manterei as ocupações atualizadas ou os horários reservados também na outra agenda.</label>
<p class="text-xs text-slate-500">Uma importação inicial não sincroniza alterações futuras. Compatibilidade com sistemas externos ainda precisa ser validada.</p>
<button id="saveAgendaReadinessBtn" onclick="onboardingAction('agenda',{mode:document.getElementById('scheduleMode').value,maintenanceAcknowledged:document.getElementById('maintenanceAcknowledged').checked})" class="text-sm font-bold text-emerald-600">Confirmar preparação da agenda</button>
</section>
<section class="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-2xl space-y-3"><h3 class="font-bold">Ativar atendimento real</h3><p id="activationSummary" class="text-sm text-slate-500"></p>
<label class="flex gap-2 text-sm"><input type="checkbox" id="activationAcknowledged"><span id="activationAcknowledgmentText">Quero iniciar agora os sete dias e autorizo o atendimento pelo número conectado.</span></label>
<button id="activateTrialBtn" onclick="activateOperationalTrial()" class="bg-emerald-500 text-slate-950 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-40">Ativar atendimento por 7 dias</button><p id="activationAvailability" class="text-sm text-amber-600"></p></section>
<section id="plano" class="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-2xl space-y-3"><h3 class="font-bold">Plano e assinatura</h3><p id="billingAvailability" class="text-sm text-slate-500">Verificando disponibilidade da contratação...</p>
<p id="billingDetails" class="text-sm"></p>
<label class="flex items-start gap-2 text-sm"><input id="paidRenewalAccepted" type="checkbox">Entendo que o plano pago renova automaticamente no ciclo escolhido e que posso gerenciar o cancelamento. O teste gratuito não gera assinatura nem cobrança automática. Confira o valor final e os termos no checkout.</label>
<div class="flex flex-wrap gap-3"><button id="checkoutMonthly" disabled onclick="openAuraCheckout('monthly')" class="bg-emerald-500 text-slate-950 px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-40">Mensal · R$ 199/mês</button><button id="checkoutYearly" disabled onclick="openAuraCheckout('yearly')" class="border border-emerald-500 px-4 py-3 rounded-xl text-sm font-bold disabled:opacity-40">Anual · R$ 2.148/ano</button><button id="billingPortal" disabled onclick="openBillingPortal()" class="underline text-sm disabled:opacity-40">Gerenciar assinatura</button></div>
<p class="text-xs text-slate-500">O anual equivale a R$ 179/mês, com cobrança anual. Custos da Meta são separados.</p></section>
</div></main>`;
