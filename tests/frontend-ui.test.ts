import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Window } from 'happy-dom';
import { INBOX_HTML } from '../src/views/inbox';
import { INBOX_BLOCKS_VIEW_HTML } from '../src/views/inbox/blocks-view';
import { REGISTER_HTML } from '../src/views/register';
import { LOGIN_HTML } from '../src/views/login';
import { LANDING_HTML } from '../src/views/landing';

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
  try{const ids=[...window.document.querySelectorAll('[id]')].map(element=>element.id);assert.equal(new Set(ids).size,ids.length,'Duplicate IDs make actions target the wrong field');for(const id of ['viewChat','viewAgenda','viewConfig','viewSettings','viewSimulator','viewOnboarding','viewAccount','activateTrialBtn','btnSaveClinicProfile','cfgClinicName','btnSaveConfigText','blockStart','blockEnd','appDate','appHourSelect','appMinuteSelect'])assert.ok(window.document.getElementById(id),id);assert.equal(window.document.querySelectorAll('[data-nav-tab]').length,7);
  }finally{await window.happyDOM.close();}
});
test('Pages no longer publish demo credentials or imply signup starts the trial',()=>{
  assert.ok(!LOGIN_HTML.includes('admin123'));assert.ok(!LOGIN_HTML.includes('admin@clinica.com'));assert.ok(!REGISTER_HTML.includes('Iniciar Teste Grátis'));assert.ok(LANDING_HTML.includes('O cadastro não inicia seu teste'));assert.ok(!INBOX_HTML.includes('type="datetime-local"'));
});

test('Registration keeps the business profile and reports server errors without losing the form',async()=>{
  const window=await dom(REGISTER_HTML);let request:any;
  try{
    for(const script of REGISTER_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g))window.eval(script[1]);
    const values={businessKind:'solo',businessSector:'aesthetics',clinicName:'Meu negócio',adminName:'Pessoa',phone:'11999999999',usesExternalSchedule:'yes',existingSystem:'Agenda em papel',email:'pessoa@example.test',password:'senha-de-teste'};
    for(const [id,value] of Object.entries(values))(window.document.getElementById(id) as any).value=value;
    window.updateExternalSystemField();assert.equal((window.document.getElementById('existingSystem') as any).required,true);
    window.fetch=(async(url:any,options:any)=>{assert.equal(url,'/api/auth/register');request=JSON.parse(options.body);return new window.Response(JSON.stringify({error:'E-mail já cadastrado.'}),{status:409});}) as any;
    await window.handleRegister({preventDefault(){}});
    assert.equal(request.businessKind,'solo');assert.equal(request.businessSector,'aesthetics');assert.equal(request.usesExternalSchedule,true);assert.equal(request.existingSystem,'Agenda em papel');
    assert.equal(window.document.getElementById('errorMessage')!.textContent,'E-mail já cadastrado.');assert.equal((window.document.getElementById('submitBtn') as any).disabled,false);assert.equal((window.document.getElementById('clinicName') as any).value,'Meu negócio');
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
test('The actual dashboard initializes and navigates all seven pages with offline API fixtures',async()=>{
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
    for(const page of ['onboarding','config','settings','agenda','account','simulator','chat']){
      window.selectNavigationTab(page);await window.happyDOM.whenAsyncComplete();assert.equal(window.document.querySelector('[aria-current=page]')?.getAttribute('data-nav-tab'),page);
    }
    assert.ok(window.document.getElementById('conversationList')!.textContent.includes('depois que você ativa'));
    assert.equal(window.document.getElementById('selectedMenuLabel')!.textContent,'Conversas');
    window.toggleVerticalMenu({stopPropagation(){}});assert.equal(window.document.getElementById('verticalMenuTrigger')!.getAttribute('aria-expanded'),'true');
    window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(window.document.getElementById('verticalMenuTrigger')!.getAttribute('aria-expanded'),'false');
    assert.equal((window.document.getElementById('btnLaunchEmbeddedSignup') as any).disabled,true,'Missing Meta configuration must keep guided connection disabled');
    assert.deepEqual(errors,[]);
  }finally{await window.happyDOM.close();}
});
