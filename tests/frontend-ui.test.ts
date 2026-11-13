import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Window } from 'happy-dom';
import { INBOX_HTML } from '../src/views/inbox';
import { INBOX_BLOCKS_VIEW_HTML } from '../src/views/inbox/blocks-view';
import { REGISTER_HTML } from '../src/views/register';
import { LOGIN_HTML } from '../src/views/login';
import { LANDING_HTML } from '../src/views/landing';
import { checkoutHtml } from '../src/views/checkout';
import type { Env } from '../src/types';
import { PLANS } from '../src/plans';

// DOM-only tests: no browser, network, external scripts, screenshots or layout rendering.
async function dom(html:string, scripts:string[]=['public/js/ui.js']) {
  const window=new Window({url:'https://unit.invalid',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true,enableImageFileLoading:false,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  window.fetch=(async()=>{throw new Error('Network is disabled in frontend unit tests');}) as any;
  window.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,''));
  // The emulator has no layout. Fixed rectangles test popup logic, not visual appearance.
  window.HTMLElement.prototype.getClientRects=()=>[new window.DOMRect(30,30,220,40)] as any;
  window.HTMLElement.prototype.getBoundingClientRect=()=>new window.DOMRect(30,30,220,40);
  window.HTMLElement.prototype.scrollIntoView=()=>{};
  for(const script of scripts)window.eval(fs.readFileSync(script,'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await window.happyDOM.whenAsyncComplete();
  return window;
}
const source='public/js/ui.js';
function trigger(window:Window,id:string){return window.document.querySelector(`[data-for="${id}"] .aura-control-trigger`) as any;}

test('Payment link stays inactive without configuration or a valid transaction',async()=>{
  for(const config of [null,{token:'test_example',environment:'sandbox'}]){
    const window=await dom('<p id="checkoutStatus"></p><button id="retryCheckout" class="hidden"></button>',[]);
    try{
      const script=window.document.createElement('script');script.type='application/json';script.id='paddlePublicConfig';script.textContent=JSON.stringify(config);window.document.body.append(script);
      window.eval(fs.readFileSync('public/js/checkout.js','utf8'));await window.happyDOM.whenAsyncComplete();
      assert.equal(window.document.querySelectorAll('script[src]').length,0);
      assert.ok(window.document.getElementById('checkoutStatus')!.textContent.includes(config?'link completo':'temporariamente indisponível'));
    }finally{await window.happyDOM.close();}
  }
});

test('Payment email link initializes once, supports reopening and waits for server confirmation',async()=>{
  const window=await dom('<p id="checkoutStatus"></p><button id="retryCheckout" class="hidden"></button>',[]);
  try{
    const transaction='txn_01234567890123456789012345';window.history.replaceState(null,'','/checkout?_ptxn='+transaction);
    const script=window.document.createElement('script');script.type='application/json';script.id='paddlePublicConfig';script.textContent=JSON.stringify({token:'test_example',environment:'sandbox'});window.document.body.append(script);
    let initialized=0,opened=0,options:any;const environments:string[]=[];
    window.Paddle={Environment:{set:(value:string)=>environments.push(value)},Initialize:(value:any)=>{initialized++;options=value;},Checkout:{open:(value:any)=>{assert.equal(value.transactionId,transaction);opened++;}}};
    window.eval(fs.readFileSync('public/js/checkout.js','utf8'));await window.happyDOM.whenAsyncComplete();
    assert.equal(initialized,1);assert.equal(opened,0,'Paddle handles _ptxn automatically on initialization');assert.deepEqual(environments,['sandbox']);
    options.eventCallback({name:'checkout.closed'});(window.document.getElementById('retryCheckout') as any).click();await window.happyDOM.whenAsyncComplete();assert.equal(initialized,1);assert.equal(opened,1);
    options.eventCallback({name:'checkout.completed'});assert.ok(window.document.getElementById('checkoutStatus')!.textContent.includes('confirmação do seu plano'));assert.ok(window.document.getElementById('retryCheckout')!.classList.contains('hidden'));
  }finally{await window.happyDOM.close();}
});

test('Checkout public configuration escapes HTML and excludes private credentials',()=>{
  const html=checkoutHtml({PADDLE_ENABLED:'true',PADDLE_ENVIRONMENT:'sandbox',PADDLE_API_KEY:'pdl_sdbx_apikey_private',PADDLE_WEBHOOK_SECRET:'private-signature',PADDLE_CLIENT_TOKEN:'test_</script><img src=x>',PADDLE_MONTHLY_PRICE_ID:'pri_monthly',PADDLE_YEARLY_PRICE_ID:'pri_yearly',PADDLE_PRO_MONTHLY_PRICE_ID:'pri_pro_monthly',PADDLE_PRO_YEARLY_PRICE_ID:'pri_pro_yearly',PADDLE_ULTRA_MONTHLY_PRICE_ID:'pri_ultra_monthly',PADDLE_ULTRA_YEARLY_PRICE_ID:'pri_ultra_yearly'} as Env);
  assert.ok(!html.includes('<img src=x>'));assert.ok(!html.includes('pdl_sdbx_apikey_private'));assert.ok(!html.includes('private-signature'));assert.ok(html.includes('\\u003c'));
});
test('Dropdown changes the native value and emits the existing change event once',async()=>{
  const window=await dom('<label for="choice">Profissional</label><select id="choice"><option value="a">Ana</option><option value="b">Bia</option><option value="c" disabled>Indisponível</option></select>');
  try{let changes=0;const select=window.document.getElementById('choice') as any;select.addEventListener('change',()=>changes++);trigger(window,'choice').click();
    const items=window.document.querySelectorAll('.aura-option') as any;assert.equal(items.length,3);assert.equal(items[2].disabled,true);items[1].click();assert.equal(select.value,'b');assert.equal(changes,1);assert.equal(trigger(window,'choice').textContent,'Bia');assert.equal(window.document.querySelector('.aura-popover'),null);
  }finally{await window.happyDOM.close();}
});
test('Dynamic dropdowns reflect loaded options, programmatic selection and disabled state',async()=>{
  const window=await dom('<label for="choice">Profissional</label><select id="choice"></select>');
  try{const select=window.document.getElementById('choice') as any;select.innerHTML='<option value="a">Ana</option><option value="b">Bia</option>';select.value='b';select.disabled=true;await window.happyDOM.whenAsyncComplete();assert.equal(trigger(window,'choice').textContent,'Bia');assert.equal(trigger(window,'choice').disabled,true);assert.equal(window.document.querySelectorAll('[data-for=choice]').length,1);
    select.disabled=false;window.auraUI.refresh();await window.happyDOM.whenAsyncComplete();assert.equal(trigger(window,'choice').disabled,false);
  }finally{await window.happyDOM.close();}
});
test('Long option lists can be searched without changing the saved value',async()=>{
  const window=await dom('<select id="choice">'+Array.from({length:10},(_,index)=>`<option value="${index}">Serviço ${index}</option>`).join('')+'</select>');
  try{trigger(window,'choice').click();const search=window.document.querySelector('.aura-popover-search') as any;search.value='servico 8';search.dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(window.document.querySelectorAll('.aura-option').length,1);assert.equal((window.document.getElementById('choice') as any).value,'0');(window.document.querySelector('.aura-option') as any).click();assert.equal((window.document.getElementById('choice') as any).value,'8');
  }finally{await window.happyDOM.close();}
});
test('Escape closes the selector and restores focus; required input focuses its visible control',async()=>{
  const window=await dom('<form><label for="choice">Área</label><select id="choice" required><option value="">Selecione</option><option value="a">Odontologia</option></select></form>');
  try{trigger(window,'choice').click();window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(window.document.querySelector('.aura-popover'),null);assert.equal(window.document.activeElement,trigger(window,'choice'));(window.document.getElementById('choice') as any).dispatchEvent(new window.Event('invalid',{cancelable:true}));assert.equal(trigger(window,'choice').getAttribute('aria-invalid'),'true');
  }finally{await window.happyDOM.close();}
});
test('Calendar preserves ISO dates and supports leap days and limits',async()=>{
  const window=await dom('<label for="day">Dia</label><input id="day" type="date" value="2032-02-10" min="2032-02-05" max="2032-02-29">');
  try{trigger(window,'day').click();assert.equal((window.document.querySelector('[data-date="2032-02-04"]') as any).disabled,true);(window.document.querySelector('[data-date="2032-02-29"]') as any).click();assert.equal((window.document.getElementById('day') as any).value,'2032-02-29');assert.ok(trigger(window,'day').textContent.includes('29'));
  }finally{await window.happyDOM.close();}
});
test('Keyboard navigation crosses calendar months correctly',async()=>{
  const window=await dom('<input id="day" type="date" value="2030-01-31">');
  try{trigger(window,'day').click();const day=window.document.querySelector('[data-date="2030-01-31"]') as any;day.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal((window.document.activeElement as any).dataset.date,'2030-02-01');(window.document.activeElement as any).click();assert.equal((window.document.getElementById('day') as any).value,'2030-02-01');
  }finally{await window.happyDOM.close();}
});
test('Time picker accepts exact minutes without rounding and rejects invalid hours',async()=>{
  const window=await dom('<label for="hour">Das</label><input id="hour" type="time" value="09:07" required>');
  try{trigger(window,'hour').click();const exact=window.document.querySelector('.aura-time-exact') as any;exact.value='25:00';const apply=[...window.document.querySelectorAll('button')].find(button=>button.textContent==='Usar horário') as any;apply.click();assert.equal((window.document.getElementById('hour') as any).value,'09:07');assert.ok(window.document.querySelector('.aura-error')!.textContent);exact.value='14:37';apply.click();assert.equal((window.document.getElementById('hour') as any).value,'14:37');
  }finally{await window.happyDOM.close();}
});
test('Block editor keeps day/time values and validates overnight periods',async()=>{
  const window=await dom(INBOX_BLOCKS_VIEW_HTML,[source,'public/js/inbox/onboarding.js']);
  try{const value=(id:string,val:string)=>{(window.document.getElementById(id) as any).value=val;};value('blockDate','2030-01-01');value('blockStartTime','23:30');value('blockEndTime','00:30');assert.equal(window.syncBlockPeriod(),false);(window.document.getElementById('blockMultipleDays') as any).checked=true;value('blockEndDate','2030-01-02');assert.equal(window.syncBlockPeriod(),true);assert.equal((window.document.getElementById('blockStart') as any).value,'2030-01-01T23:30');assert.equal((window.document.getElementById('blockEnd') as any).value,'2030-01-02T00:30');assert.equal((window.document.getElementById('blockEndDate') as any).required,true);
  }finally{await window.happyDOM.close();}
});
test('Dashboard has unique field IDs and preserves every view and critical action',async()=>{
  const window=await dom(INBOX_HTML);
  try{const ids=[...window.document.querySelectorAll('[id]')].map(element=>element.id);assert.equal(new Set(ids).size,ids.length,'Duplicate IDs make actions target the wrong field');for(const id of ['viewChat','viewAgenda','viewConfig','viewSettings','viewSimulator','viewOnboarding','viewPlan','viewAccount','businessProfileLabel','onboardingStatus','operationalQuota','readyTraining','readyWhatsapp','readyAgenda','scheduleExplanation','maintenanceAcknowledgedLabel','activationSection','activationSummary','trialTerms','activationAcknowledged','activationAcknowledgmentText','activationAvailability','plano','billingAvailability','billingValidity','checkoutFree','checkoutPro','checkoutUltra','billingPortal','chatCount','profCountBadge','prepareTrialBtn','reviewTrainingBtn','saveAgendaReadinessBtn','scheduleMode','maintenanceAcknowledged','activateTrialBtn','btnSaveClinicProfile','cfgClinicName','btnSaveConfigText','blockStart','blockEnd','appDate','appHourSelect','appMinuteSelect'])assert.ok(window.document.getElementById(id),id);assert.equal(window.document.querySelectorAll('[data-nav-tab]').length,8);
  }finally{await window.happyDOM.close();}
});
test('Pages no longer publish demo credentials or imply signup starts the trial',()=>{
  assert.ok(!LOGIN_HTML.includes('admin123'));assert.ok(!LOGIN_HTML.includes('admin@clinica.com'));assert.ok(!REGISTER_HTML.includes('Iniciar Teste Grátis'));assert.ok(LANDING_HTML.includes('Ative o atendimento no WhatsApp quando estiver tudo pronto'));assert.ok(!INBOX_HTML.includes('type="datetime-local"'));
  for(const section of ['como-funciona','recursos','planos','duvidas']){
    assert.ok(LANDING_HTML.includes('id="'+section+'"'));assert.ok(LANDING_HTML.includes('href="#'+section+'"'));
  }
  assert.ok(LANDING_HTML.includes('R$ 1.188 por ano'));assert.ok(LANDING_HTML.includes('R$ 2.388 por ano'));
  assert.ok(LANDING_HTML.includes('Plano Free'));assert.ok(LANDING_HTML.includes('R$ 129/mês'));assert.ok(LANDING_HTML.includes('R$ 249/mês'));
  assert.ok(LANDING_HTML.includes('href="/register"'));
  assert.ok(LANDING_HTML.includes('30 mensagens no Simulador'));
  assert.ok(LANDING_HTML.includes('até 50 respostas automáticas com IA por mês'));
});

test('Registration quiz validates five steps, choices, retry and four-second preparation',async()=>{
 const window=await dom(REGISTER_HTML,[]);try{
 window.matchMedia=(()=>({matches:true})) as any;
 for(const script of REGISTER_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g))window.eval(script[1]);
 const field=(id:string)=>window.document.getElementById(id) as any;
 const visible=()=>[...window.document.querySelectorAll('[data-quiz-step]')].filter(el=>!(el as any).hidden);
 assert.equal(visible().length,1);assert.equal(visible()[0].getAttribute('data-quiz-step'),'1');
 window.nextQuizStep();assert.equal(field('quizStepLabel').textContent,'Etapa 1 de 5');
 field('adminName').value='Mariana Costa';field('adminName').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 assert.equal(field('quizStepLabel').textContent,'Etapa 2 de 5');
 field('email').value='inválido';window.nextQuizStep();assert.equal(visible()[0].getAttribute('data-quiz-step'),'2');
 field('email').value='mariana@example.test';window.nextQuizStep();window.nextQuizStep();assert.equal(visible()[0].getAttribute('data-quiz-step'),'3');
 const solo=window.document.querySelector('[name="businessKind"][value="solo"]') as any,clinic=window.document.querySelector('[name="businessKind"][value="clinic"]') as any;
 solo.checked=true;window.syncQuizChoices();assert.equal(field('businessKind').value,'solo');
 clinic.checked=true;window.syncQuizChoices();assert.equal(solo.checked,false);assert.equal(field('businessKind').value,'clinic');window.nextQuizStep();
 window.nextQuizStep();assert.equal(visible()[0].getAttribute('data-quiz-step'),'4');
 const odonto=window.document.querySelector('[name="sectorChoice"][value="dentistry"]') as any,estetica=window.document.querySelector('[name="sectorChoice"][value="aesthetics"]') as any;
 odonto.checked=true;window.syncQuizChoices();assert.equal(field('businessSector').value,'dentistry');
 odonto.checked=false;estetica.checked=true;window.syncQuizChoices();assert.equal(field('businessSector').value,'aesthetics');
 odonto.checked=true;window.syncQuizChoices();assert.equal(field('businessSector').value,'both');window.nextQuizStep();
 window.previousQuizStep();assert.equal(odonto.checked,true);window.nextQuizStep();assert.equal(visible().length,1);
 let requests=0,request:any;window.fetch=(async(_url:any,options:any)=>{requests++;request=JSON.parse(options.body);return new window.Response(JSON.stringify({error:'E-mail já cadastrado.'}),{status:409});}) as any;
 field('password').value='curta';await window.handleRegister({preventDefault(){}});assert.equal(requests,0);
 field('password').value='senha-do-quiz';field('confirmPassword').value='outra';await window.handleRegister({preventDefault(){}});assert.equal(requests,0);assert.ok(field('errorMessage').textContent.includes('não coincidem'));
 field('confirmPassword').value='senha-do-quiz';window.togglePasswordVisibility();assert.equal(field('password').type,'text');window.togglePasswordVisibility();
 await window.handleRegister({preventDefault(){}});assert.equal(request.businessSectors,'both');assert.equal(request.businessKind,'clinic');assert.equal(field('submitBtn').disabled,false);assert.equal(field('submitBtn').textContent,'Finalizar cadastro');assert.equal(field('adminName').value,'Mariana Costa');
 const timers:{callback:()=>void,delay:number}[]=[];window.setTimeout=((callback:()=>void,delay:number)=>{timers.push({callback,delay});return timers.length;}) as any;
 window.fetch=(async()=>new window.Response(JSON.stringify({success:true}),{status:201})) as any;
 await window.handleRegister({preventDefault(){}});assert.equal(field('accountPreparation').hidden,false);assert.ok(field('registerQuiz').classList.contains('is-preparing'));assert.equal(window.location.hash,'');
 assert.deepEqual(timers.map(t=>t.delay),[1400,2800,4000]);timers[0].callback();assert.ok(field('preparationMessage').textContent.includes('treinamento'));timers[1].callback();assert.ok(field('preparationMessage').textContent.includes('ambiente'));timers[2].callback();assert.equal(window.sessionStorage.getItem('aura_entry_reveal'),'1');assert.equal(window.location.hash,'#simulator');
 }finally{await window.happyDOM.close();}
});

test('Login reports invalid credentials and restores its submit button',async()=>{
  const window=await dom(LOGIN_HTML);
  try{
    for(const script of LOGIN_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g))window.eval(script[1]);
    (window.document.getElementById('email') as any).value='pessoa@example.test';(window.document.getElementById('password') as any).value='senha-de-teste';
    window.fetch=(async(url:any,options:any)=>{assert.equal(url,'/api/auth/login');assert.equal(JSON.parse(options.body).email,'pessoa@example.test');return new window.Response(JSON.stringify({error:'Credenciais inválidas.'}),{status:401});}) as any;
    await window.handleLogin({preventDefault(){}});assert.equal(window.document.getElementById('errorMessage')!.textContent,'Credenciais inválidas.');assert.equal((window.document.getElementById('submitBtn') as any).disabled,false);
    window.togglePasswordVisibility();assert.equal((window.document.getElementById('password') as any).type,'text');
  }finally{await window.happyDOM.close();}
});
test('The actual dashboard initializes and navigates all eight pages with offline API fixtures',async()=>{
  const window=await dom(INBOX_HTML,[]);const errors:string[]=[];
  window.console.error=(...values:any[])=>errors.push(values.map(value=>value?.stack || String(value)).join(' '));window.setInterval=(()=>0) as any;
  const whatsapp={configured:false,raw_phone_number_id:'unconfigured:test',phone_number_id:null,waba_id:null,has_custom_token:false,token_source:'none',display_phone_number:null,verified_name:null,connected_at:null,webhook_url:'https://unit.invalid/webhook',embedded_signup:{enabled:false,missing_env:['META_APP_ID'],app_id:null,config_id:null,graph_version:'v26.0'}};
  const access={status:'free',legacy_review_required:false,can_operate:false,can_prepare:false,can_read_history:false,profile:{kind:'solo',sector:'aesthetics'},readiness:{training:false,whatsapp:false,agenda:false},trial:{started_at:null,ends_at:null,used:0,limit:100},demo:{used:0,limit:30}};
  const fixtures:Record<string,unknown>={
    '/api/auth/me':{user:{name:'Pessoa',email:'pessoa@example.test',tenantId:'test',canManageClinic:true}},
    '/api/onboarding':{access,trial_enabled:true},'/api/billing':{enabled:false,has_subscription:false},
    '/api/professionals':{professionals:[]},'/api/appointments':{appointments:[]},'/api/agenda/blocks':{blocks:[]},
    '/api/config':{config:{clinic_name:'Negócio',hours:'',procedure_items:[],initial_consultation:{}}},
    '/api/clinic/profile':{clinic:{id:'test',name:'Negócio'},whatsapp,canManageClinic:true},
    '/api/clinic/users':{users:[],canManageClinic:true},'/api/clinic/whatsapp/status':{whatsapp,canManageClinic:true},'/api/time':{server_time:Date.now()}
  };
  window.fetch=(async(input:any)=>{const path=String(input).split('?')[0];assert.ok(path in fixtures,'Unexpected request: '+path);return new window.Response(JSON.stringify(fixtures[path]),{status:200,headers:{'content-type':'application/json'}});}) as any;
  try{
    const scripts=['ui','inbox/billing','inbox/onboarding','inbox/core','inbox/chat','inbox/professionals','inbox/agenda','inbox/training','inbox/settings','inbox/simulator'];
    window.eval(scripts.map(name=>fs.readFileSync('public/js/'+name+'.js','utf8')).join('\n'));
    await window.init();await window.happyDOM.whenAsyncComplete();
    assert.equal(window.document.getElementById('selectedMenuLabel')!.textContent,'Conversas','Initialization without a hash keeps the default page');
    for(const page of ['onboarding','plan','config','settings','agenda','account','simulator','chat']){
      window.selectNavigationTab(page);await window.happyDOM.whenAsyncComplete();assert.equal(window.document.querySelector('[aria-current=page]')?.getAttribute('data-nav-tab'),page);
    }
    assert.ok(window.document.getElementById('conversationList')!.textContent.includes('depois que você ativa'));
    assert.equal(window.document.getElementById('selectedMenuLabel')!.textContent,'Conversas');
    window.toggleVerticalMenu({stopPropagation(){}});assert.equal(window.document.getElementById('verticalMenuTrigger')!.getAttribute('aria-expanded'),'true');
    window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(window.document.getElementById('verticalMenuTrigger')!.getAttribute('aria-expanded'),'false');
    assert.equal((window.document.getElementById('btnLaunchEmbeddedSignup') as any).disabled,true,'Missing Meta configuration must keep guided connection disabled');
    for(const tab of ['simulator','onboarding','plan','config','settings','agenda','account','chat']){
      window.history.replaceState(null,'','#'+tab);await window.init();await window.happyDOM.whenAsyncComplete();
      assert.equal(window.document.querySelector('[aria-current=page]')?.getAttribute('data-nav-tab'),tab);
    }
    for(const hash of ['#invalid','#constructor','#toString']){
      window.history.replaceState(null,'',hash);await window.init();await window.happyDOM.whenAsyncComplete();
      assert.equal(window.document.getElementById('selectedMenuLabel')!.textContent,'Conversas');
    }
    Object.assign(access,{status:'preparing',can_prepare:true,schedule_mode:'aura',readiness:{training:true,agenda:true,whatsapp:false}});
    await window.loadOnboarding();
    assert.equal(window.document.getElementById('readyTraining')!.textContent,'Pronto ✓');
    assert.equal(window.document.getElementById('readyWhatsapp')!.textContent,'Pendente');
    assert.ok(window.document.getElementById('reviewTrainingBtn')!.classList.contains('hidden'));
    assert.equal((window.document.getElementById('agendaModeDetails') as any).open,false);
    assert.ok(window.document.getElementById('activationSummary')!.textContent.includes('2 de 3 etapas prontas — falta apenas conectar o WhatsApp'));
    assert.equal((window.document.getElementById('activateTrialBtn') as any).disabled,true);
    Object.assign(access,{schedule_mode:'external_manual',readiness:{training:true,agenda:false,whatsapp:false}});
    await window.loadOnboarding();
    assert.equal((window.document.getElementById('agendaModeDetails') as any).open,true);
    assert.equal((window.document.getElementById('scheduleMode') as any).value,'external_manual');
    assert.ok(!window.document.getElementById('maintenanceAcknowledgedLabel')!.classList.contains('hidden'));
    Object.assign(access,{readiness:{training:true,agenda:true,whatsapp:true}});
    await window.loadOnboarding();
    assert.equal((window.document.getElementById('activateTrialBtn') as any).disabled,false);
    assert.equal(window.document.getElementById('activationProgress')!.getAttribute('aria-valuenow'),'3');
    assert.deepEqual(errors,[]);
  }finally{await window.happyDOM.close();}
});


test('Client sidebar separates operation and account controls without an administrative entry',async()=>{
 const window=await dom(INBOX_HTML,[]);try{
 assert.equal(window.document.getElementById('superAdminNavBtn'),null);assert.equal(window.document.querySelector('.aura-topbar'),null);
 const footer=window.document.querySelector('.aura-sidebar-footer')!;
 assert.deepEqual([...footer.querySelectorAll('button')].map(button=>button.id),['sidebarCollapseTrigger']);
 const header=window.document.querySelector('.aura-dashboard-page-header')!;
 for(const id of ['accountMenuTrigger','staffLogout','headerAccountName','trialStatusWidget','trialDaysBadge','trialMessagesBadge','topUserName','topUserEmail'])assert.ok(header.querySelector('#'+id),id);
 assert.ok(window.document.querySelector('#accountQuickMenu #themeIcon'));
 window.eval(fs.readFileSync('public/js/inbox/core.js','utf8'));
 const sidebar=window.document.getElementById('verticalMenuContainer')!;
 const toggle=footer.querySelector('button')!;
 window.toggleSidebarCollapse();
 sidebar.querySelector('[data-nav-tab="agenda"]')!.dispatchEvent(new window.PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
 assert.ok(sidebar.classList.contains('aura-sidebar-peek'));
 toggle.firstElementChild!.dispatchEvent(new window.PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
 assert.ok(!sidebar.classList.contains('aura-sidebar-peek'));
 assert.ok(window.document.body.classList.contains('aura-sidebar-collapsed'));
 window.toggleSidebarCollapse();
 assert.ok(!window.document.body.classList.contains('aura-sidebar-collapsed'));
 assert.equal(window.document.querySelectorAll('[data-nav-tab]').length,8);
 }finally{await window.happyDOM.close();}
});


test('Dashboard entry reveal consumes its one-shot marker and respects reduced motion',async()=>{
 const window=await dom(INBOX_HTML,[]);try{
 const timers:{callback:()=>void,delay:number}[]=[];
 window.setTimeout=((callback:()=>void,delay:number)=>{timers.push({callback,delay});return timers.length;}) as any;
 window.requestAnimationFrame=((callback:()=>void)=>{callback();return 1;}) as any;
 window.eval(fs.readFileSync('public/js/inbox/core.js','utf8'));
 window.sessionStorage.setItem('aura_entry_reveal','1');window.document.documentElement.classList.add('aura-entry-pending');
 window.revealAccountEntry();assert.ok(window.document.documentElement.classList.contains('aura-entry-revealing'));
 assert.equal(timers[0].delay,550);timers[0].callback();assert.equal(window.sessionStorage.getItem('aura_entry_reveal'),null);assert.ok(!window.document.documentElement.classList.contains('aura-entry-revealing'));
 window.matchMedia=(()=>({matches:true})) as any;window.sessionStorage.setItem('aura_entry_reveal','1');
 const bootstrap=[...INBOX_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('aura_entry_reveal'))![1];window.eval(bootstrap);
 assert.ok(!window.document.documentElement.classList.contains('aura-entry-pending'));window.revealAccountEntry();assert.equal(window.sessionStorage.getItem('aura_entry_reveal'),null);
 }finally{await window.happyDOM.close();}
});


test('Structured training loads quiz profile, weekly hours, fixed durations and quick choices',async()=>{
 const window=await dom(INBOX_HTML,[]);try{
 window.eval(fs.readFileSync('public/js/inbox/core.js','utf8')+'\n'+fs.readFileSync('public/js/inbox/training.js','utf8'));
 window.updateTrainingValidationHighlights=()=>{};window.showToast=()=>{};
 window.eval("currentAccess={profile:{kind:'clinic',sector:'both'}};currentConfig={clinic_name:'Clínica Quiz',hours:'Segunda a Sexta, das 08:00 às 18:00',initial_consultation:{duration:'35 min'},procedure_items:[{name:'Avaliação',duration:'35 min',category:'odonto',checked:true}]};");
 window.renderProceduresLists([{name:'Avaliação',duration:'35 min',category:'odonto',checked:true}]);
 window.loadStructuredTraining({hours:'Segunda a Sexta, das 08:00 às 18:00',initial_consultation:{duration:'35 min'},doctor_cro:'CRO-SP 102450'});
 const el=(id:string)=>window.document.getElementById(id) as any;
 assert.equal(window.trainingProfile().kind,'clinic');assert.equal(window.trainingProfile().sector,'both');
 assert.equal(window.document.querySelectorAll('[data-training-day]').length,7);
 const monday=window.document.querySelector('[data-training-day="1"]')!;
 const saturday=window.document.querySelector('[data-training-day="6"]')!;
 assert.equal(monday.querySelectorAll('select')[0].options.length,24);assert.equal(monday.querySelectorAll('select')[1].options.length,6);
 assert.ok(saturday.classList.contains('is-disabled'));assert.equal((saturday.querySelector('.aura-day-times') as any).hidden,true);
 assert.ok(el('cfgHours').value.includes('Segunda-feira: 08:00 às 18:00'),JSON.stringify({hours:el('cfgHours').value,days:window.trainingScheduleDays()}));
 (saturday.querySelector('input') as any).checked=true;window.syncTrainingSchedule();assert.ok(el('cfgHours').value.includes('Sábado'));assert.ok(!saturday.classList.contains('is-disabled'));
 (monday.querySelector('[data-part="endHour"]') as any).value='07';window.syncTrainingSchedule();assert.equal(el('cfgHours').value,'');
 (monday.querySelector('[data-part="endHour"]') as any).value='18';window.syncTrainingSchedule();
 const saved=window.trainingScheduleDays();window.renderTrainingSchedule({schedule_days:saved});assert.equal((window.document.querySelector('[data-training-day="6"] input') as any).checked,true);
 assert.equal(el('cfgInitEvalDuration').tagName,'SELECT');assert.equal(el('cfgInitEvalDuration').value,'35 min');
 assert.equal(window.document.querySelector('.proc-duration')!.tagName,'SELECT');assert.equal((window.document.querySelector('.proc-duration') as any).value,'35 min');
 assert.ok([...el('cfgInitEvalDuration').options].some((o:any)=>o.value==='1h 15min'));
 const areas=[...window.document.querySelectorAll('[name="trainingSector"]')] as any[];areas[0].checked=false;window.changeTrainingProfile(areas[0]);assert.ok(el('odontoList').parentElement.classList.contains('hidden'));
 areas[1].checked=false;window.changeTrainingProfile(areas[1]);assert.equal(areas[1].checked,true);
 areas[0].checked=true;window.changeTrainingProfile(areas[0]);assert.ok(!el('odontoList').parentElement.classList.contains('hidden'));assert.ok(el('esteticaList').children.length>0);
 assert.equal(el('cfgDoctorCro').value,'CRO-SP 102450');
 const pix=window.document.querySelector('#trainingPayments input') as any;pix.checked=true;el('trainingPayments').onchange();assert.ok(el('cfgPaymentMethods').value.includes('Pix'));
 el('trainingInsuranceMode').value='Atendemos planos e convênios';el('trainingInsuranceNames').value='Plano Exemplo';el('trainingInsurance').onchange();assert.equal(el('cfgInsurance').value,'Atendemos planos e convênios: Plano Exemplo');
 window.loadStructuredTraining({hours:'Terças das 09:15 às 17:45',payment_methods:'Condição antiga',parking:'Entrada lateral',initial_consultation:{duration:'35 min'}});assert.equal(el('cfgHours').value,'Terças das 09:15 às 17:45');assert.equal(el('cfgPaymentMethods').value,'Condição antiga');assert.equal(el('cfgParking').value,'Entrada lateral');
 }finally{await window.happyDOM.close();}
});


test('Automatic status refresh handles transport failures without false save errors and recovers',async()=>{
 const window=await dom(INBOX_HTML,[]);try{
 const toasts:string[]=[];window.showToast=(message:string)=>toasts.push(message);window.console.warn=()=>{};
 window.eval(fs.readFileSync('public/js/inbox/onboarding.js','utf8'));
 window.renderOnboarding=()=>{};let billingCalls=0;window.loadBilling=async()=>{billingCalls++;};
 window.fetch=(async()=>new window.Response(JSON.stringify({access:{can_read_history:false},trial_enabled:true}),{status:200})) as any;
 assert.equal(await window.loadOnboarding(),true);billingCalls=0;
 const field=window.document.getElementById('cfgClinicName') as any;field.value='Alteração ainda não salva';
 window.fetch=(async()=>{throw new TypeError('Failed to fetch');}) as any;
 assert.equal(await window.loadOnboarding({background:true}),false);assert.deepEqual(toasts,[]);
 assert.ok(window.document.getElementById('onboardingRefreshNotice')!.textContent.includes('temporariamente indisponível'));
 assert.equal(field.value,'Alteração ainda não salva');
 for(const status of [429,503]){window.fetch=(async()=>new window.Response('{}',{status})) as any;await window.loadOnboarding({background:true});assert.equal(toasts.length,0);}
 window.fetch=(async()=>{throw new TypeError('Failed to fetch');}) as any;
 await window.loadOnboarding();assert.equal(toasts.length,1);assert.ok(toasts[0].includes('Verifique sua conexão'));assert.ok(!toasts[0].includes('Failed to fetch'));
 for(const status of [401,403]){window.fetch=(async()=>new window.Response('{}',{status})) as any;await window.loadOnboarding({background:true});assert.equal(toasts.length,status===401?2:3);}
 window.fetch=(async()=>new window.Response(JSON.stringify({access:{can_read_history:false},trial_enabled:true}),{status:200})) as any;
 assert.equal(await window.loadOnboarding({background:true}),true);assert.ok(window.document.getElementById('onboardingRefreshNotice')!.classList.contains('hidden'));assert.equal(billingCalls,0);
 let resolve!:(response:any)=>void,calls=0;
 window.fetch=(()=>{calls++;return new Promise(r=>resolve=r);}) as any;
 const pending=window.loadOnboarding({background:true});assert.equal(await window.loadOnboarding({background:true}),false);assert.equal(calls,1);
 resolve(new window.Response(JSON.stringify({access:{can_read_history:false}}),{status:200}));assert.equal(await pending,true);
 assert.equal(field.value,'Alteração ainda não salva');
 const timers:(()=>void)[]=[];const originalTimeout=window.setTimeout;
 window.setTimeout=((callback:()=>void)=>{timers.push(callback);return 1;}) as any;
 window.fetch=((_url:any,options:any)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new window.DOMException('Aborted','AbortError'))))) as any;
 const timed=window.loadOnboarding({background:true});timers[0]();assert.equal(await timed,false);window.setTimeout=originalTimeout;
 assert.equal(toasts.length,3);
 }finally{await window.happyDOM.close();}
});


test('Quiz transitions follow direction, ignore repeated navigation and focus after entry',async()=>{
 const window=await dom(REGISTER_HTML,[]);try{
 window.matchMedia=(()=>({matches:false})) as any;
 const timers:{callback:()=>void,delay:number}[]=[];window.setTimeout=((callback:()=>void,delay:number)=>{timers.push({callback,delay});return timers.length;}) as any;
 for(const script of REGISTER_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g))window.eval(script[1]);
 const field=(id:string)=>window.document.getElementById(id) as any;
 const step=(n:number)=>window.document.querySelector('[data-quiz-step="'+n+'"]') as any;
 field('adminName').value='Mariana Costa';field('adminName').focus();
 window.nextQuizStep();window.nextQuizStep();window.previousQuizStep();
 assert.equal(timers.length,1);assert.equal(timers[0].delay,200);assert.ok(step(1).classList.contains('aura-quiz-exit-forward'));assert.equal(step(1).inert,true);assert.equal(field('step1NextBtn').disabled,true);
 timers.shift()!.callback();assert.equal(step(1).hidden,true);assert.equal(step(2).hidden,false);assert.ok(step(2).classList.contains('aura-quiz-enter-forward'));assert.equal(timers[0].delay,260);
 window.nextQuizStep();assert.equal(timers.length,1);
 timers.shift()!.callback();assert.equal(window.document.activeElement?.id,'email');assert.equal(step(2).inert,false);assert.equal(field('quizNextBtn').disabled,false);assert.ok(!field('registerQuiz').hasAttribute('aria-busy'));
 window.previousQuizStep();assert.ok(step(2).classList.contains('aura-quiz-exit-backward'));timers.shift()!.callback();assert.ok(step(1).classList.contains('aura-quiz-enter-backward'));timers.shift()!.callback();assert.equal(window.document.activeElement?.id,'adminName');assert.equal(field('adminName').value,'Mariana Costa');
 window.beginAccountPreparation();assert.deepEqual(timers.map(t=>t.delay),[1400,2800,4000]);timers.shift()!.callback();timers.shift()!.callback();timers.shift()!.callback();
 assert.ok(field('accountPreparation').classList.contains('is-leaving'));assert.equal(window.sessionStorage.getItem('aura_entry_reveal'),'1');assert.equal(window.location.hash,'');assert.equal(timers[0].delay,450);timers.shift()!.callback();assert.equal(window.location.hash,'#simulator');
 const css=fs.readFileSync('public/css/aura.css','utf8');assert.ok(!/@keyframes aura-dashboard-reveal/.test(css));assert.ok(!/aura-entry[^{}]*[^}]*clip-path/.test(css));
 }finally{await window.happyDOM.close();}
});


test('Account popover opens below the header button and contains the theme control',async()=>{
 const window=await dom(INBOX_HTML,[]);try{
 window.eval(fs.readFileSync('public/js/inbox/core.js','utf8'));
 const menu=window.document.getElementById('accountQuickMenu') as any,trigger=window.document.getElementById('accountMenuTrigger') as any;
 trigger.getBoundingClientRect=()=>new window.DOMRect(window.innerWidth-60,6,48,36);
 window.toggleAccountMenu();assert.equal(menu.style.top,'50px');assert.equal(menu.style.right,'12px');assert.equal(menu.style.maxHeight,(window.innerHeight-58)+'px');
 assert.ok(menu.querySelector('[onclick*="toggleTheme"]'));assert.ok(!window.document.querySelector('.aura-sidebar-footer [onclick*="toggleTheme"]'));
 window.document.documentElement.classList.remove('dark');window.updateAccountThemeLabel();assert.equal(window.document.getElementById('accountThemeLabel')!.textContent,'Modo escuro');
 window.toggleTheme();window.updateAccountThemeLabel();assert.equal(window.document.getElementById('accountThemeLabel')!.textContent,'Modo claro');
 }finally{await window.happyDOM.close();}
});


test('Plans and payment controls belong to their own page',async()=>{
 const window=await dom(INBOX_HTML,[]);try{
 const home=window.document.getElementById('viewOnboarding')!,plan=window.document.getElementById('viewPlan')!;
 for(const id of ['plano','billingAvailability','billingValidity','checkoutFree','checkoutPro','checkoutUltra','billingPortal']){assert.ok(plan.querySelector('#'+id));assert.equal(home.querySelector('#'+id),null);}
 assert.equal(window.document.querySelector('[data-nav-tab="onboarding"] span')!.textContent,'Início');assert.ok(window.document.querySelector('#accountQuickMenu [data-nav-tab="plan"]'));
 }finally{await window.happyDOM.close();}
});


test('Plano pago esconde a própria contratação e o Free, e mantém o Ultra disponível',async()=>{
  const window=await dom(INBOX_HTML,['public/js/inbox/billing.js']);
  try {
    const data={enabled:true,environment:'sandbox',plan:'pro',plans:PLANS,selected:true,has_subscription:true,status:'active',auto_renew:true,renewal_canceled:false,can_open_portal:true,can_select_free:false,ends_at:'2026-12-02T16:30:00Z',pending:null as any};
    window.eval('var currentUser={canManageClinic:true}; var showToast=()=>{};');
    window.fetch=(async()=>new Response(JSON.stringify(data))) as any;
    await window.loadBilling();
    const node=(id:string)=>window.document.getElementById(id)!;
    assert.ok(node('checkoutPro').classList.contains('hidden'));
    assert.ok(node('checkoutFree').classList.contains('hidden'));
    assert.equal(node('checkoutFree').querySelector('button')!.disabled,true);
    assert.ok(!node('checkoutUltra').classList.contains('hidden'));
    const ultraActions=node('checkoutUltra').querySelectorAll('button');
    assert.equal(ultraActions.length,1);
    assert.match(ultraActions[0].getAttribute('onclick') || '',/openAuraCheckout.*dataset.plan/);
    assert.equal(ultraActions[0].disabled,false);
    assert.equal(node('planOffers').dataset.cycle,'yearly');
    const ultraPrice=window.document.querySelector('[data-plan="ultra"] [data-yearly]')!;
    assert.equal(ultraPrice.textContent,'199');
    assert.doesNotMatch(node('planOffers').textContent,/1\.188|2\.388|em uma cobrança/);
    let frame:FrameRequestCallback;
    window.requestAnimationFrame=(callback:FrameRequestCallback)=>{frame=callback;return 1;};
    window.cancelAnimationFrame=()=>{};
    window.setPlanCycle('monthly');
    await window.loadBilling();
    assert.equal(node('planOffers').dataset.cycle,'monthly');
    frame!(0);frame!(160);
    assert.ok(Number(ultraPrice.textContent)>199 && Number(ultraPrice.textContent)<249);
    frame!(320);
    assert.equal(ultraPrice.textContent,'249');
    window.setPlanCycle('yearly');
    frame!(400);frame!(720);
    assert.equal(ultraPrice.textContent,'199');
    assert.ok(node('billingValidity').textContent.includes('13:30'));
    assert.equal(node('billingNextLabel').textContent,'Próxima renovação do Pro');
    assert.equal(node('billingPortal').textContent,'Gerenciar cobrança na Paddle');
    data.pending={plan:'ultra',effective_at:data.ends_at,status:'applied'};
    await window.loadBilling();
    assert.equal(node('billingNextLabel').textContent,'Troca agendada para o Ultra');
    assert.ok(node('checkoutUltra').classList.contains('hidden'));assert.equal(node('planUltraBadge').textContent,'Troca agendada');
    data.auto_renew=false;data.renewal_canceled=true;data.pending=null;
    await window.loadBilling();
    assert.equal(node('billingNextLabel').textContent,'Renovação desativada');
    assert.match(node('billingNextDetails').textContent,/sem nova cobrança automática/);
    assert.equal(window.document.getElementById('billingRenewalToggle'),null);
    assert.ok(!node('viewPlan').textContent.toLowerCase().includes('assinatura'));
  }finally{await window.happyDOM.close();}
});

test('Cada checkout abre apenas o plano e o ciclo informados no link',async()=>{
  for(const plan of ['pro','ultra'] as const) for(const cycle of ['monthly','yearly'] as const) {
  const window=await dom(checkoutHtml({} as Env),[]);
  try {
    window.history.replaceState(null,'','/checkout?plan='+plan+'&cycle='+cycle);
    const opened:any[]=[],requests:any[]=[];
    window.Paddle={Environment:{set(){}},Initialize(){},Checkout:{open: (settings:any)=>opened.push(settings)}};
    window.fetch=(async(url:string,init?:RequestInit)=>{
      if(url==='/api/billing')return new Response(JSON.stringify({enabled:true,plans:PLANS,plan:'free'}));
      const body=JSON.parse(String(init?.body));requests.push({url,...body});
      if(url==='/api/billing/preview')return new Response(JSON.stringify({cycle,amount:PLANS[plan][cycle],scheduled:false}));
      return new Response(JSON.stringify({transactionId:'txn_test',environment:'sandbox',token:'test_public'}));
    }) as any;
    window.eval(fs.readFileSync('public/js/plan-checkout.js','utf8'));await window.happyDOM.whenAsyncComplete();
    assert.equal(opened.length,1);assert.equal(opened[0].settings.displayMode,'inline');assert.equal(opened[0].transactionId,'txn_test');
    assert.deepEqual(requests,[{url:'/api/billing/preview',plan,cycle},{url:'/api/billing/checkout',plan,cycle}]);
    assert.equal(window.document.querySelector('#planCheckoutChoices select, #planCheckoutChoices input'),null);
    assert.match(window.document.getElementById('checkoutEffective')!.textContent,/renova automaticamente até o cancelamento/);
  }finally{await window.happyDOM.close();}
  }
});

test('Checkout bloqueado por Pix exibe a ação da Paddle e oculta as opções de contratação',async()=>{
  const window=await dom(checkoutHtml({} as Env),[]);
  try {
    window.history.replaceState(null,'','/checkout?plan=ultra&cycle=monthly');
    const managementUrl='https://sandbox-customer-portal.paddle.com/payment-method';
    window.fetch=(async(url:string)=>{
      if(url==='/api/billing')return new Response(JSON.stringify({enabled:true,plans:PLANS,plan:'pro',can_select_free:false}));
      assert.equal(url,'/api/billing/preview');
      return new Response(JSON.stringify({code:'PAYMENT_METHOD_CHANGE_REQUIRED',error:'Atualize o meio de pagamento.',update_payment_method_url:managementUrl}),{status:409});
    }) as any;
    window.eval(fs.readFileSync('public/js/plan-checkout.js','utf8'));await window.happyDOM.whenAsyncComplete();
    assert.ok(window.document.getElementById('planCheckoutChoices')!.classList.contains('hidden'));
    const link=window.document.getElementById('checkoutUpdatePayment')!;
    assert.ok(!link.classList.contains('hidden'));
    assert.equal(link.getAttribute('href'),managementUrl);
  }finally{await window.happyDOM.close();}
});
