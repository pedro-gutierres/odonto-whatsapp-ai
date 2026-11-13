import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import worker, { runDayBeforeConfirmations } from '../src/index';
import { MockD1Database } from './d1-mock';
import { commercialAccess, finishUsage, reserveUsage } from '../src/access';
import { getTenantById, isCrucialConfigComplete, checkAppointmentConflict, createAppointment } from '../src/db';
import { createSessionToken, verifyPassword, hashPassword } from '../src/auth';
import type { Env } from '../src/types';
import { verifyPaddleSignature, inspectPaddleSignature, processPaddleInbox } from '../src/billing';
import { PLANS, effectivePlan, reservePlanUsage, finishPlanUsage, usageMonth, planUsage } from '../src/plans';
import { audioSeconds } from '../src/audio-duration';
import { prepareVoice } from '../src/voice';
import sandboxWorker from '../src/paddle-sandbox';
import { REGISTER_HTML } from '../src/views/register';
import { LOGIN_HTML } from '../src/views/login';
import { INBOX_HTML } from '../src/views/inbox';
import fs from 'node:fs';
import vm from 'node:vm';

function catalogPrice(id:string) {
  const plan=id.includes('ultra')?'ultra':'pro',cycle=id.includes('yearly')?'yearly':'monthly';
  return {id,status:'active',tax_mode:'internal',quantity:{minimum:1,maximum:1},trial_period:null,unit_price_overrides:[],
    unit_price:{amount:String(PLANS[plan][cycle]),currency_code:'BRL'},billing_cycle:{interval:cycle==='monthly'?'month':'year',frequency:1}};
}

const config = { clinic_name:'Negócio real', hours:'Segunda a sexta, 08h às 18h', initial_consultation:{duration:'30 min'}, procedure_items:[{name:'Avaliação',duration:'30 min',checked:true}] };
function setup() {
  const db = new MockD1Database(); db.applyMigrations(path.resolve('migrations'));
  const env: Env = { DB:db as any, INBOX:{send:async()=>{}} as any, META_APP_SECRETS:'secret', WA_VERIFY_TOKEN:'verify', ANTHROPIC_API_KEY:'mock', AUTH_SECRET:'test-auth-secret', GRAPH_VERSION:'v26.0',CLAUDE_MODEL:'mock',CLAUDE_EFFORT:'low',OPERATIONAL_TRIAL_ENABLED:'true' };
  return {db,env};
}
async function api(env:Env,url:string,cookie='',body?:unknown,method?:string) {
  return worker.fetch(new Request('https://aura.test'+url,{method:method || (body ? 'POST':'GET'),headers:{cookie,'content-type':'application/json'},...(body ? {body:JSON.stringify(body)}:{})}),env);
}
async function account(env:Env,overrides:Record<string,unknown>={}) {
  const response = await api(env,'/api/auth/register','',{clinicName:'Negócio real',adminName:'Responsável',email:crypto.randomUUID()+'@test.com',password:'segredo123',phone:'11999999999',businessKind:'solo',businessSector:'aesthetics',usesExternalSchedule:false,...overrides});
  assert.equal(response.status,201); const body:any=await response.json();
  const cookie=response.headers.get('set-cookie')!.split(';')[0]; return {id:body.tenantId,cookie};
}
async function ready(db:MockD1Database,id:string,status='preparing') {
  if(status==='trial'||status==='active')await db.prepare('UPDATE tenants SET plan_tier=NULL WHERE id=?1').bind(id).run();
  const now=new Date().toISOString(), end=new Date(Date.now()+168*3600000).toISOString();
  await db.prepare(`UPDATE tenants SET commercial_status=?2,bot_config=?3,training_reviewed_at=?4,agenda_ready_at=?4,
    schedule_mode='aura',phone_number_id=?5,access_token_enc='mock',whatsapp_diagnosed_at=?4,operational_enabled=1,
    trial_started_at=?6,trial_ends_at=?7 WHERE id=?1`).bind(id,status,JSON.stringify(config),now,'phone-'+id,status==='trial'?now:null,status==='trial'?end:null).run();
  await db.prepare("UPDATE professionals SET name='Profissional',working_days='[0,1,2,3,4,5,6]',break_start=NULL,break_end=NULL WHERE tenant_id=?1").bind(id).run();
  await db.prepare('UPDATE tenants SET agenda_ready_at=?2 WHERE id=?1').bind(id,now).run();
}
function mockNetwork(reply='Resposta de demonstração',fail=false) {
  const original=globalThis.fetch; const calls:{url:string;body:any}[]=[];
  globalThis.fetch=async(input,init)=>{
    const url=String(input); const body=init?.body?JSON.parse(String(init.body)):null;calls.push({url,body});
    if(url.includes('anthropic'))return new Response(fail?'unavailable':JSON.stringify({content:[{type:'text',text:reply}]}),{status:fail?503:200});
    if(url.endsWith('/messages'))return new Response(JSON.stringify({messages:[{id:'sent-'+crypto.randomUUID()}]}));
    throw new Error('Unexpected external request: '+url);
  };
  return {calls,restore:()=>{globalThis.fetch=original;}};
}
async function inbound(env:Env,id:string,messageId=crypto.randomUUID()) {
  let retried=false;
  await worker.queue({messages:[{body:{phoneNumberId:'phone-'+id,from:'5511999999999',waMessageId:messageId,type:'text',text:'Olá'},ack(){},retry(){retried=true;}}]} as any,env);
  return {retried};
}

test('Cadastro cria preparação com template válido sem iniciar prazo ou cobrança',async()=>{
  const {db,env}=setup();const user=await account(env);const tenant=(await getTenantById(env.DB,user.id))!;
  assert.equal(tenant.commercial_status,'preparing');assert.equal(tenant.trial_started_at,null);assert.equal(tenant.trial_ends_at,null);assert.equal(tenant.billing_cycle,null);
  assert.equal(tenant.business_kind,'solo');assert.equal(tenant.business_sector,'aesthetics');assert.equal(isCrucialConfigComplete(JSON.parse(tenant.bot_config)),true);
  assert.ok(tenant.training_reviewed_at);assert.ok(tenant.agenda_ready_at);assert.equal(tenant.schedule_mode,'aura');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM professionals WHERE tenant_id=?1 AND active=1').bind(user.id).first<any>()).n,1);
  assert.equal(commercialAccess(tenant).can_operate,false);
  assert.ok(!tenant.bot_config.includes('CRO'));const row=await db.prepare('SELECT password_hash FROM users WHERE tenant_id=?1').bind(user.id).first<any>();
  assert.equal(await verifyPassword('segredo123',row.password_hash),true);assert.ok(row.password_hash.startsWith('pbkdf2_v1:'));
});
test('As quatro combinações de perfil são persistidas',async()=>{
  const {env}=setup();for(const businessKind of ['solo','clinic'])for(const businessSector of ['dentistry','aesthetics']){
    const user=await account(env,{businessKind,businessSector});const tenant=(await getTenantById(env.DB,user.id))!;
    assert.equal(tenant.business_kind,businessKind);assert.equal(tenant.business_sector,businessSector);
  }
});
test('Cadastro incompleto, JSON inválido e duplicidade não deixam negócios pela metade',async()=>{
  const {db,env}=setup();assert.equal((await api(env,'/api/auth/register','',{email:'incompleto@test.com'})).status,400);
  await account(env,{email:'unico@test.com'});assert.equal((await api(env,'/api/auth/register','',{clinicName:'N',adminName:'Responsável',email:'UNICO@test.com',password:'segredo123',phone:'11999999999',businessKind:'clinic',businessSector:'dentistry',usesExternalSchedule:false})).status,409);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM tenants').first<any>()).n,1);
});
test('Conta em preparação recusa operações reais mesmo por chamada direta',async()=>{
  const {db,env}=setup();const user=await account(env);
  for(const url of ['/api/send','/api/toggle-ai','/api/clear-chat','/api/appointments','/api/appointments/run-confirmations'])
    assert.equal((await api(env,url,user.cookie,{phone:'5511999999999',text:'oi'})).status,403,url);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM messages').first<any>()).n,0);
});
test('Preparação não inicia o relógio e libera profissionais sem consultas reais',async()=>{
  const {env}=setup();const user=await account(env);assert.equal((await api(env,'/api/onboarding/prepare',user.cookie,{})).status,200);
  const tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'preparing');assert.equal(tenant.trial_ends_at,null);
  assert.equal((await api(env,'/api/professionals',user.cookie,{name:'Profissional',workingDays:[1,2,3,4,5],startHour:'08:00',endHour:'18:00'})).status,409);
  assert.equal((await api(env,'/api/appointments',user.cookie,{patientName:'Pessoa',scheduledAt:'2030-01-01 10:00'})).status,403);
});
test('Ativação exige preparação e libera exatamente 168 horas uma única vez',async()=>{
  const {db,env}=setup();const user=await account(env);
  await db.prepare('UPDATE tenants SET plan_tier=NULL WHERE id=?1').bind(user.id).run();
  assert.equal((await api(env,'/api/onboarding/activate',user.cookie,{})).status,409);await ready(db,user.id);
  assert.equal((await api(env,'/api/onboarding/activate',user.cookie,{})).status,200);
  const first=(await getTenantById(env.DB,user.id))!;assert.equal(first.commercial_status,'trial');assert.equal(Date.parse(first.trial_ends_at!)-Date.parse(first.trial_started_at!),168*3600000);
  await api(env,'/api/onboarding/activate',user.cookie,{});assert.equal((await getTenantById(env.DB,user.id))!.trial_ends_at,first.trial_ends_at);
});
test('Ativação pode ficar desabilitada sem impedir cadastro e preparação',async()=>{
  const {db,env}=setup();env.OPERATIONAL_TRIAL_ENABLED='false';const user=await account(env);await ready(db,user.id);
  await db.prepare('UPDATE tenants SET plan_tier=NULL WHERE id=?1').bind(user.id).run();
  assert.equal((await api(env,'/api/onboarding/activate',user.cookie,{})).status,503);assert.equal((await getTenantById(env.DB,user.id))!.trial_started_at,null);
});
test('Cadastro libera ambos os modos do Simulador imediatamente',async()=>{
  const {env}=setup();const user=await account(env);const network=mockNetwork();try{
    assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'patient',message:'oi',requestId:crypto.randomUUID()})).status,200);
    assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'aura',message:'Como funciona?',requestId:crypto.randomUUID()})).status,200);
    assert.equal(network.calls.length,2);assert.ok(!JSON.stringify(network.calls[0].body).includes('CRO'));
  }finally{network.restore();}
});
test('Ambos os modos são incapazes de marcar, confirmar, ler agenda ou enviar WhatsApp',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id);
  await db.prepare("INSERT INTO appointments(tenant_id,contact_wa_id,patient_name,scheduled_at,status,professional_id,ends_at) SELECT ?1,'paciente','Dado sigiloso','2030-01-01 10:00','agendado',id,'2030-01-01 10:30' FROM professionals WHERE tenant_id=?1").bind(user.id).run();
  const network=mockNetwork('Simulação <<<AGENDAR: {"patient_name":"Falso","scheduled_at":"2030-01-01 11:00"}>>> <<<CONFIRMAR: {"appointment_id":1}>>>');
  try {for(const mode of ['patient','aura']){const res=await api(env,'/api/simulator/chat',user.cookie,{mode,message:'Agende',requestId:crypto.randomUUID()});assert.equal(res.status,200);assert.ok(!(await res.json() as any).reply.includes('<<<'));}
    assert.equal((await db.prepare('SELECT count(*) AS n FROM appointments').first<any>()).n,1);assert.equal((await db.prepare('SELECT status FROM appointments').first<any>()).status,'agendado');
    assert.equal((await db.prepare('SELECT count(*) AS n FROM messages').first<any>()).n,0);assert.equal(network.calls.length,2);assert.ok(!JSON.stringify(network.calls).includes('Dado sigiloso'));
  }finally{network.restore();}
});
test('Test Drive tem 30 respostas independentes e a repetição não conta duas vezes',async()=>{
  const {db,env}=setup();const user=await account(env);await db.prepare('UPDATE tenants SET demo_messages_used=29 WHERE id=?1').bind(user.id).run();const requestId=crypto.randomUUID();const network=mockNetwork();
  try{for(let i=0;i<2;i++)assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'aura',message:'oi',requestId})).status,200);
    assert.equal(network.calls.length,1);assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'aura',message:'mais',requestId:crypto.randomUUID()})).status,403);
    const tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.demo_messages_used,30);assert.equal(tenant.trial_messages_used,0);assert.equal(tenant.trial_started_at,null);
  }finally{network.restore();}
});
test('Pedidos simultâneos não ultrapassam a última resposta da demonstração',async()=>{
  const {db,env}=setup();const user=await account(env);await db.prepare('UPDATE tenants SET demo_messages_used=29 WHERE id=?1').bind(user.id).run();const network=mockNetwork();
  try{const results=await Promise.all(Array.from({length:4},()=>api(env,'/api/simulator/chat',user.cookie,{mode:'aura',message:'oi',requestId:crypto.randomUUID()})));
    assert.equal(results.filter(r=>r.status===200).length,1);assert.equal((await getTenantById(env.DB,user.id))!.demo_messages_used,30);
  }finally{network.restore();}
});
test('Falha da IA devolve a reserva uma única vez e permite tentar novamente',async()=>{
  const {env}=setup();const user=await account(env);const requestId=crypto.randomUUID();const network=mockNetwork('',true);
  try{assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'aura',message:'oi',requestId})).status,502);assert.equal((await getTenantById(env.DB,user.id))!.demo_messages_used,0);
    await finishUsage(env,user.id,'demo',requestId,null,true);assert.equal((await getTenantById(env.DB,user.id))!.demo_messages_used,0);
  }finally{network.restore();}
  const success=mockNetwork();try{assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'aura',message:'oi',requestId})).status,200);}finally{success.restore();}
});
test('Validação rejeita modo inventado e conversas sem autenticação',async()=>{
  const {env}=setup();const user=await account(env);assert.equal((await api(env,'/api/simulator/chat','',{mode:'aura',message:'oi',requestId:crypto.randomUUID()})).status,401);
  assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'admin',message:'oi',requestId:crypto.randomUUID()})).status,400);
});
test('Usuário pausado não consegue usar endpoints com cookie antigo',async()=>{
  const {db,env}=setup();const user=await account(env);await db.prepare('UPDATE users SET active=0 WHERE tenant_id=?1').bind(user.id).run();
  assert.equal((await api(env,'/api/config',user.cookie)).status,401);assert.equal((await api(env,'/api/onboarding/activate',user.cookie,{})).status,401);
});
test('Equipe não ativa teste nem altera treinamento',async()=>{
  const {db,env}=setup();const user=await account(env);const row=await db.prepare('SELECT * FROM users WHERE tenant_id=?1').bind(user.id).first<any>();
  await db.prepare("UPDATE users SET role='staff' WHERE id=?1").bind(row.id).run();const token=await createSessionToken({userId:row.id,tenantId:user.id,email:row.email,name:row.name,role:'admin'},env.AUTH_SECRET);
  const cookie='auth_session='+token;assert.equal((await api(env,'/api/onboarding/activate',cookie,{})).status,403);assert.equal((await api(env,'/api/config',cookie,{config})).status,403);
});
test('Reservas e alterações da agenda ficam isoladas por negócio',async()=>{
  const {env}=setup();const a=await account(env),b=await account(env);await reserveUsage(env,a.id,'demo','request-12345');
  assert.equal((await getTenantById(env.DB,b.id))!.demo_messages_used,0);const response=await api(env,'/api/onboarding',b.cookie);assert.equal((await response.json() as any).access.demo.used,0);
});
test('Prazo ou cota encerram operação; histórico e configuração continuam acessíveis',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'trial');await db.prepare('UPDATE tenants SET trial_ends_at=?2 WHERE id=?1').bind(user.id,new Date(Date.now()-1000).toISOString()).run();
  assert.equal(commercialAccess((await getTenantById(env.DB,user.id))!).status,'ended');
  for(const url of ['/api/appointments','/api/config','/api/clinic/profile','/api/conversations'])assert.equal((await api(env,url,user.cookie)).status,200);
  assert.equal((await api(env,'/api/send',user.cookie,{phone:'5511999999999',text:'oi'})).status,403);
  const first=(await getTenantById(env.DB,user.id))!.trial_ends_at;await api(env,'/api/onboarding/activate',user.cookie,{});assert.equal((await getTenantById(env.DB,user.id))!.trial_ends_at,first);
});
test('Pagamento sem preparação não ativa operação e vigência vencida encerra acesso',async()=>{
  const {db,env}=setup();const user=await account(env);await db.prepare("UPDATE tenants SET commercial_status='active',subscription_ends_at=?2 WHERE id=?1").bind(user.id,new Date(Date.now()+3600000).toISOString()).run();
  assert.equal(commercialAccess((await getTenantById(env.DB,user.id))!).can_operate,false);await ready(db,user.id,'active');assert.equal(commercialAccess((await getTenantById(env.DB,user.id))!).can_operate,true);
  await db.prepare('UPDATE tenants SET subscription_ends_at=?2 WHERE id=?1').bind(user.id,new Date(Date.now()-1000).toISOString()).run();assert.equal(commercialAccess((await getTenantById(env.DB,user.id))!).status,'ended');
});
test('Contas antigas não são convertidas, vencidas ou reconfiguradas pela migração',async()=>{
  const {db,env}=setup();await db.prepare("INSERT INTO tenants(id,name,phone_number_id,bot_config,active,trial_ends_at) VALUES ('antiga','Antiga','phone-antiga','{}',1,'2020-01-01')").run();
  const tenant=(await getTenantById(env.DB,'antiga'))!;assert.equal(tenant.commercial_status,'legacy');assert.equal(commercialAccess(tenant).can_operate,true);assert.equal(tenant.trial_ends_at,'2020-01-01');
});
test('Bloqueios exigem preparação e não criam consultas, pacientes ou lembretes',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id);const prof=await db.prepare('SELECT id FROM professionals WHERE tenant_id=?1').bind(user.id).first<any>();
  const res=await api(env,'/api/agenda/blocks',user.cookie,{professionalId:prof.id,startsAt:'2030-01-01T10:00',endsAt:'2030-01-01T11:00'});assert.equal(res.status,201);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM appointments').first<any>()).n,0);
  assert.equal((await checkAppointmentConflict(env.DB,user.id,'2030-01-01 10:30','30 min',undefined,prof.id)).conflict,true);
  assert.equal((await checkAppointmentConflict(env.DB,user.id,'2030-01-01 11:00','30 min',undefined,prof.id)).conflict,false);
});
test('Datas impossíveis e profissionais de outro negócio são recusados',async()=>{
  const {db,env}=setup();const a=await account(env),b=await account(env);await ready(db,a.id);await ready(db,b.id);const prof=await db.prepare('SELECT id FROM professionals WHERE tenant_id=?1').bind(b.id).first<any>();
  assert.equal((await api(env,'/api/agenda/blocks',a.cookie,{professionalId:prof.id,startsAt:'2030-01-01T10:00',endsAt:'2030-01-01T11:00'})).status,400);
  assert.equal((await checkAppointmentConflict(env.DB,a.id,'2030-02-30 10:00','30 min')).conflict,true);assert.equal((await checkAppointmentConflict(env.DB,a.id,'A combinar','30 min')).conflict,true);
});
test('Ocupações externas e períodos exclusivos exigem confirmação de manutenção',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id);
  assert.equal((await api(env,'/api/onboarding/agenda',user.cookie,{mode:'external_manual'})).status,400);
  assert.equal((await api(env,'/api/onboarding/agenda',user.cookie,{mode:'dedicated',maintenanceAcknowledged:true})).status,200);
});
test('Resposta real consome cota operacional, preserva demonstração e não é repetida na fila',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'trial');const network=mockNetwork('Olá!');const id=crypto.randomUUID();
  try{await inbound(env,user.id,id);await inbound(env,user.id,id);const tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.trial_messages_used,1);assert.equal(tenant.demo_messages_used,0);assert.equal(network.calls.filter(c=>c.url.endsWith('/messages')&&!c.url.includes('anthropic')).length,1);}finally{network.restore();}
});
test('A centésima resposta reservada é enviada; a próxima fica bloqueada',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'trial');await db.prepare('UPDATE tenants SET trial_messages_used=99 WHERE id=?1').bind(user.id).run();const network=mockNetwork('Olá!');
  try{await inbound(env,user.id);await inbound(env,user.id);assert.equal((await getTenantById(env.DB,user.id))!.trial_messages_used,100);assert.equal(network.calls.filter(c=>c.url.includes('anthropic')).length,1);}finally{network.restore();}
});
test('Fila e cron não chamam IA nem enviam mensagens após vencimento',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'trial');await db.prepare('UPDATE tenants SET trial_ends_at=?2 WHERE id=?1').bind(user.id,new Date(Date.now()-1000).toISOString()).run();
  const tomorrow=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(Date.now()+86400000));
  await db.prepare("INSERT INTO appointments(tenant_id,contact_wa_id,patient_name,scheduled_at,status,professional_id,ends_at) SELECT ?1,'5511999999999','Pessoa',?2,'agendado',id,substr(?2,1,11)||'10:30' FROM professionals WHERE tenant_id=?1").bind(user.id,tomorrow+' 10:00').run();const network=mockNetwork();
  try{await inbound(env,user.id);const cron=await runDayBeforeConfirmations(env,user.id);assert.equal(cron.sent,0);assert.equal(network.calls.length,0);}finally{network.restore();}
});
test('Salvar treinamento completo revisa automaticamente; incompleto bloqueia operação',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'trial');assert.equal((await api(env,'/api/config',user.cookie,{config})).status,200);assert.equal(commercialAccess((await getTenantById(env.DB,user.id))!).can_operate,true);
  assert.equal((await api(env,'/api/config',user.cookie,{config:{...config,hours:''}})).status,200);
  assert.equal(commercialAccess((await getTenantById(env.DB,user.id))!).can_operate,false);
  assert.equal((await getTenantById(env.DB,user.id))!.training_reviewed_at,null);
});

test('CSV exige prévia, confirmação e isolamento; repetir commit não duplica ocupações',async()=>{
  const {db,env}=setup();const a=await account(env),b=await account(env);await ready(db,a.id);await ready(db,b.id);
  const preview=await api(env,'/api/agenda/import/preview',a.cookie,{csv:'profissional,inicio,fim\nProfissional,2030-01-01 10:00,2030-01-01 11:00'});
  assert.equal(preview.status,200);const data:any=await preview.json();assert.equal((await db.prepare('SELECT count(*) AS n FROM appointment_blocks').first<any>()).n,0);
  assert.equal((await api(env,'/api/agenda/import/commit',b.cookie,{batchId:data.batchId,confirmed:true})).status,404);
  assert.equal((await api(env,'/api/agenda/import/commit',a.cookie,{batchId:data.batchId})).status,400);
  for(let i=0;i<2;i++)assert.equal((await api(env,'/api/agenda/import/commit',a.cookie,{batchId:data.batchId,confirmed:true})).status,200);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM appointment_blocks').first<any>()).n,1);assert.equal((await db.prepare('SELECT count(*) AS n FROM appointments').first<any>()).n,0);
  await api(env,'/api/agenda/import/undo',a.cookie,{batchId:data.batchId,confirmed:true});assert.equal((await db.prepare('SELECT count(*) AS n FROM appointment_blocks').first<any>()).n,0);
});
test('CSV de outro formato, profissionais ambíguos e datas inválidas não são importados',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id);
  for(const csv of ['paciente,telefone,inicio\nPessoa,123,2030-01-01 10:00','profissional,inicio,fim\nProfissional,2030-02-30 10:00,2030-03-01 10:00','profissional,inicio,fim\nDesconhecido,2030-01-01 10:00,2030-01-01 11:00'])assert.equal((await api(env,'/api/agenda/import/preview',user.cookie,{csv})).status,400);
});

function configureBilling(env:Env) {
  Object.assign(env,{PADDLE_ENABLED:'true',PADDLE_ENVIRONMENT:'sandbox',PADDLE_SANDBOX_ENTITLEMENTS:'true',PADDLE_API_KEY:'pdl_sdbx_apikey_mock',PADDLE_WEBHOOK_SECRET:'mock-secret',PADDLE_CLIENT_TOKEN:'test_mock',PADDLE_MONTHLY_PRICE_ID:'pri_monthly',PADDLE_YEARLY_PRICE_ID:'pri_yearly',PADDLE_PRO_MONTHLY_PRICE_ID:'pri_pro_monthly',PADDLE_PRO_YEARLY_PRICE_ID:'pri_pro_yearly',PADDLE_ULTRA_MONTHLY_PRICE_ID:'pri_ultra_monthly',PADDLE_ULTRA_YEARLY_PRICE_ID:'pri_ultra_yearly'});
}
async function signedEvent(env:Env,event:unknown,overrides:Record<string,string>={},drain=true,ctx?:ExecutionContext) {
  const raw=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PADDLE_WEBHOOK_SECRET!),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+':'+raw));
  const signature=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  const target=ctx?sandboxWorker:worker;
  const response=await target.fetch(new Request('https://aura.test/api/webhooks/paddle',{method:'POST',headers:{'Paddle-Signature':`ts=${timestamp};h1=${signature}`,...overrides},body:raw}),env,ctx);
  // Existing business assertions simulate the subsequent billing-only cron explicitly.
  if(drain&&response.status===200&&(await response.clone().json() as any).queued)await processPaddleInbox(env);
  return response;
}
async function billingIntent(db:MockD1Database,id:string) {
  const intent=crypto.randomUUID();await db.prepare("INSERT INTO checkout_intents(id,tenant_id,billing_cycle,transaction_id) VALUES (?1,?2,'monthly','txn_test')").bind(intent,id).run();return intent;
}
function subscriptionEvent(id:string,intent:string,overrides:any={}) {
  return {event_id:'evt_'+crypto.randomUUID(),event_type:'subscription.updated',occurred_at:new Date().toISOString(),data:{id:'sub_test',customer_id:'ctm_test',status:'active',custom_data:{tenant_id:id,checkout_intent:intent},items:[{price:{id:'pri_monthly'}}],current_billing_period:{ends_at:new Date(Date.now()+30*86400000).toISOString()},...overrides}};
}
function mockPaddleProof(id:string,intent:string) {
  const original=globalThis.fetch;
  const state={subscription:subscriptionEvent(id,intent).data,payments:[{
    id:'txn_test',status:'completed',customer_id:'ctm_test',subscription_id:'sub_test',
    custom_data:{tenant_id:id,checkout_intent:intent},items:[{price:{id:'pri_monthly'},quantity:1}],
    billing_period:{starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+30*86400000).toISOString()}
  }] as any[],fail:false};
  globalThis.fetch=async(input)=>{
    if(state.fail)throw Error('Paddle unavailable');
    if(String(input).includes('/transactions?'))return new Response(JSON.stringify({data:state.payments}));
    if(String(input).endsWith('/subscriptions/sub_test'))return new Response(JSON.stringify({data:state.subscription}));
    throw Error('Unexpected Paddle request');
  };
  return {state,restore:()=>{globalThis.fetch=original;}};
}
function completedPayment(id:string,intent:string) {
  return {...subscriptionEvent(id,intent),event_type:'transaction.completed',data:{id:'txn_test',status:'completed',subscription_id:'sub_test',custom_data:{tenant_id:id,checkout_intent:intent}}};
}
test('Cobrança desabilitada sem configuração; escolhas devem ocorrer no checkout',async()=>{
  const {env}=setup();const user=await account(env);assert.equal((await api(env,'/api/billing/checkout',user.cookie,{plan:'pro',cycle:'monthly',autoRenew:true})).status,503);configureBilling(env);
  assert.equal((await api(env,'/api/billing/checkout',user.cookie,{cycle:'monthly'})).status,400);
});

test('Credenciais de sandbox e produção não podem ser misturadas para abrir contratação',async()=>{
  const {env}=setup();const user=await account(env);configureBilling(env);
  for(const patch of [{PADDLE_CLIENT_TOKEN:'live_wrong'},{PADDLE_API_KEY:'pdl_live_apikey_wrong'},{PADDLE_ENVIRONMENT:'live'}]){
    configureBilling(env);Object.assign(env,patch);
    const response=await api(env,'/api/billing',user.cookie);assert.equal((await response.json() as any).enabled,false);
    assert.equal((await api(env,'/api/billing/checkout',user.cookie,{plan:'pro',cycle:'monthly',autoRenew:true})).status,503);
  }
});

test('Worker sandbox exige ambiente de testes e recusa atendimento, Meta e administração de contas',async()=>{
  const {env}=setup();
  assert.equal((await sandboxWorker.fetch(new Request('https://sandbox.test/health'),env)).status,503);
  configureBilling(env);
  const health=await sandboxWorker.fetch(new Request('https://sandbox.test/health'),env);
  assert.equal(health.status,200);assert.equal(health.headers.get('x-robots-tag'),'noindex, nofollow');
  for(const path of ['/webhook','/api/send','/api/toggle-ai','/api/appointments','/api/clinic/whatsapp/manual','/api/admin/overview','/api/simulator/chat']){
    assert.equal((await sandboxWorker.fetch(new Request('https://sandbox.test'+path,{method:'POST'}),env)).status,403,path);
  }
  const html=await sandboxWorker.fetch(new Request('https://sandbox.test/checkout'),env);
  assert.ok((await html.text()).includes('Ambiente de testes Paddle'));
  env.PADDLE_ENVIRONMENT='live';assert.equal((await sandboxWorker.fetch(new Request('https://sandbox.test/health'),env)).status,503);
  assert.ok(!('queue' in sandboxWorker));assert.equal(typeof sandboxWorker.scheduled,'function');
});

test('Página de pagamento é pública, não expõe segredos e não concede acesso por retorno do checkout',async()=>{
  const {env}=setup();
  let response=await worker.fetch(new Request('https://aura.test/checkout'),env);
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.ok((await response.text()).includes('type="application/json">null</script>'));
  configureBilling(env);
  response=await worker.fetch(new Request('https://aura.test/checkout?_ptxn=txn_01234567890123456789012345'),env);
  const html=await response.text();assert.ok(html.includes('test_mock'));
  assert.ok(!html.includes(env.PADDLE_API_KEY!));assert.ok(!html.includes(env.PADDLE_WEBHOOK_SECRET!));
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');
});
test('Checkout usa preço e vínculo criados no servidor; não libera assinatura pelo navegador',async()=>{
  const {env}=setup();configureBilling(env);const user=await account(env);const original=fetch;let sent:any;
  globalThis.fetch=async(input,init)=>{
    if(String(input).includes('/prices/'))return new Response(JSON.stringify({data:{id:'pri_pro_monthly',status:'active',tax_mode:'internal',quantity:{minimum:1,maximum:1},unit_price:{amount:'12900',currency_code:'BRL'},billing_cycle:{interval:'month',frequency:1},trial_period:null}}));
    if(String(input).endsWith('/transactions/txn_test') && init?.method==='GET')return Response.json({data:{id:'txn_test',status:'ready',items:[{price:{id:'pri_pro_monthly'},quantity:1}]}});
    assert.equal(init?.method,'POST');
    assert.equal(String(input),'https://sandbox-api.paddle.com/transactions');sent=JSON.parse(String(init?.body));return new Response(JSON.stringify({data:{id:'txn_test'}}));
  };
  try{
    const result=await api(env,'/api/billing/checkout',user.cookie,{plan:'pro',cycle:'monthly',autoRenew:true,tenant_id:'outro',priceId:'barato'});assert.equal(result.status,200);
    assert.equal(sent.custom_data.tenant_id,user.id);assert.equal(sent.items[0].price_id,'pri_pro_monthly');assert.ok(sent.custom_data.checkout_intent);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'preparing');
    assert.equal((await api(env,'/api/billing/checkout',user.cookie,{plan:'pro',cycle:'monthly',autoRenew:true})).status,200);
  }finally{globalThis.fetch=original;}
});
test('Webhook rejeita assinatura falsa, alteração do corpo e timestamp antigo',async()=>{
  const {env}=setup();configureBilling(env);
  assert.equal(await verifyPaddleSignature('{}','ts=1;h1='+'a'.repeat(64),env.PADDLE_WEBHOOK_SECRET!),false);
  assert.equal((await signedEvent(env,{event_type:'subscription.updated'},{'Paddle-Signature':'ts=1;h1='+'a'.repeat(64)})).status,401);
  assert.equal((await api(env,'/api/webhooks/paddle','',{event_type:'subscription.updated'})).status,401);
});
test('Webhook reconhecido ativa vigência sem ligar atendimento despreparado; duplicados e eventos antigos são ignorados',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id),event=subscriptionEvent(user.id,intent);
  const proof=mockPaddleProof(user.id,intent);
  try {
  assert.equal((await signedEvent(env,event)).status,200);assert.equal((await signedEvent(env,event)).status,200);
  let tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'active');assert.equal(tenant.operational_enabled,0);assert.equal(commercialAccess(tenant).can_operate,false);
  const stale={...subscriptionEvent(user.id,intent,{status:'canceled'}),occurred_at:new Date(Date.now()-3600000).toISOString()};assert.equal((await signedEvent(env,stale)).status,200);
  tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'active');assert.equal((await db.prepare('SELECT count(*) AS n FROM billing_events').first<any>()).n,2);
  } finally { proof.restore(); }
});
test('Cancelamento mantém acesso ao período capturado até sua validade',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);const event=subscriptionEvent(user.id,intent,{scheduled_change:{action:'cancel',effective_at:new Date(Date.now()+86400000).toISOString()}});
  const proof=mockPaddleProof(user.id,intent);
  try {
  await signedEvent(env,event);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'active');assert.ok((await getTenantById(env.DB,user.id))!.renewal_canceled_at);
  const canceled={...subscriptionEvent(user.id,intent,{status:'canceled',current_billing_period:null}),occurred_at:new Date(Date.now()+1000).toISOString()};await signedEvent(env,canceled);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'active');
  } finally { proof.restore(); }
});

test('Assinatura ativa com Pix ainda não capturado não libera período pago; completed confirma pela API',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);
  const proof=mockPaddleProof(user.id,intent);const receipt=proof.state.payments[0];proof.state.payments=[];
  try {
    const initial=subscriptionEvent(user.id,intent);assert.equal((await signedEvent(env,initial)).status,200);
    let tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'preparing');assert.equal(tenant.subscription_ends_at,null);
    assert.equal(tenant.paddle_subscription_id,'sub_test');
    const completed={...completedPayment(user.id,intent),occurred_at:initial.occurred_at};
    assert.equal((await signedEvent(env,completed)).status,200,'Receipt is durable even while the payment API is not ready');
    assert.equal((await db.prepare('SELECT status FROM paddle_webhook_inbox WHERE event_id=?1').bind(completed.event_id).first<any>()).status,'pending');
    proof.state.payments=[receipt];
    await processPaddleInbox(env,Date.now()+61000);
    assert.equal((await signedEvent(env,completed)).status,200);assert.equal((await signedEvent(env,completed)).status,200);
    tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'active');assert.equal(tenant.subscription_ends_at,receipt.billing_period.ends_at);
    assert.equal(tenant.operational_enabled,0);assert.equal((await db.prepare('SELECT count(*) AS n FROM billing_events').first<any>()).n,2);
  } finally { proof.restore(); }
});

test('Confirmação de pagamento pode chegar antes da assinatura sem depender da ordem dos webhooks',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);const proof=mockPaddleProof(user.id,intent);
  try {
    const completed=completedPayment(user.id,intent);assert.equal((await signedEvent(env,completed)).status,200);
    assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'active');
    const stale={...subscriptionEvent(user.id,intent,{status:'paused'}),occurred_at:new Date(Date.now()-60000).toISOString()};assert.equal((await signedEvent(env,stale)).status,200);
    assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'active');
  } finally { proof.restore(); }
});

test('Renovação pendente não estende a vigência sem captura, e falha da API mantém o evento para reenvio',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);const proof=mockPaddleProof(user.id,intent);
  try {
    const expired=new Date(Date.now()-1000).toISOString();proof.state.payments[0].billing_period={starts_at:new Date(Date.now()-30*86400000).toISOString(),ends_at:expired};
    assert.equal((await signedEvent(env,subscriptionEvent(user.id,intent))).status,200);
    let tenant=(await getTenantById(env.DB,user.id))!;assert.notEqual(tenant.commercial_status,'active');assert.equal(tenant.subscription_ends_at,expired);assert.equal(commercialAccess(tenant).can_operate,false);
    const count=(await db.prepare('SELECT count(*) AS n FROM billing_events').first<any>()).n;
    proof.state.fail=true;assert.equal((await signedEvent(env,subscriptionEvent(user.id,intent))).status,200);
    assert.equal((await db.prepare('SELECT count(*) AS n FROM billing_events').first<any>()).n,count);
  } finally { proof.restore(); }
});

test('Confirmação atrasada não reativa uma assinatura que já foi cancelada',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);const proof=mockPaddleProof(user.id,intent);
  try {
    const canceled={...subscriptionEvent(user.id,intent,{status:'canceled',current_billing_period:null}),occurred_at:new Date(Date.now()+1000).toISOString()};
    assert.equal((await signedEvent(env,canceled)).status,200);
    assert.equal((await signedEvent(env,completedPayment(user.id,intent))).status,200);
    assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'ended');
  } finally { proof.restore(); }
});

test('Comprovante de outro cliente, contratação, preço ou quantidade não concede acesso pago',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);const proof=mockPaddleProof(user.id,intent);
  const receipt=proof.state.payments[0];
  try {
    for(const patch of [{customer_id:'ctm_other'},{custom_data:{tenant_id:user.id,checkout_intent:'other'}},{items:[{price:{id:'pri_other'},quantity:1}]},{items:[{price:{id:'pri_monthly'},quantity:2}]}]){
      proof.state.payments=[{...receipt,...patch}];assert.equal((await signedEvent(env,subscriptionEvent(user.id,intent))).status,200);
      const tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'preparing');assert.equal(tenant.subscription_ends_at,null);
    }
  } finally { proof.restore(); }
});
test('Webhook não aceita trocar negócio nem preço pelo custom_data',async()=>{
  const {db,env}=setup();configureBilling(env);const a=await account(env),b=await account(env);const intent=await billingIntent(db,a.id);
  assert.equal((await signedEvent(env,subscriptionEvent(b.id,intent))).status,409);assert.equal((await signedEvent(env,subscriptionEvent(a.id,intent,{items:[{price:{id:'pri_other'}}]}))).status,200);
  assert.equal((await db.prepare("SELECT count(*) AS n FROM paddle_webhook_inbox WHERE status='rejected'").first<any>()).n,1);
  assert.equal((await getTenantById(env.DB,a.id))!.commercial_status,'preparing');assert.equal((await getTenantById(env.DB,b.id))!.commercial_status,'preparing');
});

test('Scripts públicos e scripts das páginas são JavaScript válido',()=>{
  for(const name of fs.readdirSync('public/js/inbox').filter(name=>name.endsWith('.js')))new vm.Script(fs.readFileSync('public/js/inbox/'+name,'utf8'),{filename:name});
  new vm.Script(fs.readFileSync('public/js/ui.js','utf8'));
  for(const html of [REGISTER_HTML,LOGIN_HTML,INBOX_HTML])for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);
});

test('Migração sobre dados antigos preserva contas, credenciais, cota e consultas',async()=>{
  const db=new MockD1Database();const files=fs.readdirSync('migrations').filter(file=>file.endsWith('.sql')).sort();
  for(const file of files.filter(file=>file<'0010'))db.sqlite.exec(fs.readFileSync('migrations/'+file,'utf8'));
  db.sqlite.exec("INSERT INTO tenants(id,name,phone_number_id,bot_config,access_token_enc,plan_status,trial_ends_at,trial_messages_used) VALUES('antiga','Nome anterior','123','{}','mock-token','active','2020-01-01',87)");
  db.sqlite.exec("INSERT INTO appointments(tenant_id,contact_wa_id,patient_name,scheduled_at) VALUES('antiga','123','Paciente anterior','2030-01-01 10:00')");
  for(const file of files.filter(file=>file>='0010'))db.sqlite.exec(fs.readFileSync('migrations/'+file,'utf8'));
  const tenant=await db.prepare("SELECT * FROM tenants WHERE id='antiga'").first<any>();
  assert.equal(tenant.commercial_status,'legacy');assert.equal(tenant.plan_status,'active');assert.equal(tenant.access_token_enc,'mock-token');assert.equal(tenant.trial_messages_used,87);assert.equal(tenant.trial_ends_at,'2020-01-01');
  assert.equal((await db.prepare('SELECT patient_name FROM appointments').first<any>()).patient_name,'Paciente anterior');
});
test('Banco impede duas consultas simultâneas no mesmo profissional e horário',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'trial');const prof=await db.prepare('SELECT id FROM professionals WHERE tenant_id=?1').bind(user.id).first<any>();
  const results=await Promise.all([1,2].map(i=>createAppointment(env.DB,user.id,'5511999999999','Pessoa '+i,'Avaliação','2030-01-01 10:00','agendado','','30 min',prof.id,'Profissional')));
  assert.equal(results.filter(result=>result.success).length,1);assert.equal((await db.prepare('SELECT count(*) AS n FROM appointments').first<any>()).n,1);
});
test('Vencimento durante a geração impede envio e devolve reserva sem criar consulta',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'trial');const original=fetch;let sent=0;
  globalThis.fetch=async(input)=>{
    if(String(input).includes('anthropic')){await db.prepare('UPDATE tenants SET trial_ends_at=?2 WHERE id=?1').bind(user.id,new Date(Date.now()-1000).toISOString()).run();return new Response(JSON.stringify({content:[{type:'text',text:'Olá!'}]}));}
    sent++;throw new Error('Não deveria enviar');
  };
  try{await inbound(env,user.id);assert.equal(sent,0);assert.equal((await getTenantById(env.DB,user.id))!.trial_messages_used,0);assert.equal((await db.prepare('SELECT count(*) AS n FROM appointments').first<any>()).n,0);}finally{globalThis.fetch=original;}
});
test('Sandbox não libera assinatura operacional na produção por padrão',async()=>{
  const {db,env}=setup();configureBilling(env);delete env.PADDLE_SANDBOX_ENTITLEMENTS;const user=await account(env);const intent=await billingIntent(db,user.id);
  const response=await signedEvent(env,subscriptionEvent(user.id,intent));assert.equal(response.status,200);assert.equal((await response.json() as any).sandbox_access_disabled,true);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'preparing');
});
test('Preço externo divergente impede checkout sem criar transação',async()=>{
  const {env}=setup();configureBilling(env);const user=await account(env);const original=fetch;let posted=false;
  globalThis.fetch=async(input,init)=>{if(init?.method==='POST')posted=true;return new Response(JSON.stringify({data:{status:'active',unit_price:{amount:'199',currency_code:'USD'},billing_cycle:{interval:'month',frequency:1}}}));};
  try{assert.equal((await api(env,'/api/billing/checkout',user.cookie,{plan:'pro',cycle:'monthly',autoRenew:true})).status,503);assert.equal(posted,false);}finally{globalThis.fetch=original;}
});
test('Outro ciclo encerra o checkout anterior e cria uma transação com renovação obrigatória',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);const original=fetch;const writes:string[]=[];
  globalThis.fetch=async(input,init)=>{
    if(String(input).includes('/prices/'))return new Response(JSON.stringify({data:{id:'pri_pro_yearly',status:'active',tax_mode:'internal',quantity:{minimum:1,maximum:1},unit_price:{amount:'118800',currency_code:'BRL'},billing_cycle:{interval:'year',frequency:1},trial_period:null}}));
    if(init?.method==='GET')return new Response(JSON.stringify({data:{id:'txn_test',status:'ready'}}));
    const body=JSON.parse(String(init?.body));
    writes.push(init!.method!);
    if(init?.method==='PATCH') {
      assert.deepEqual(body,{status:'canceled'});
      return Response.json({data:{id:'txn_test',status:'canceled'}});
    }
    assert.equal(body.custom_data.auto_renew,true);
    assert.deepEqual(body.items,[{price_id:'pri_pro_yearly',quantity:1}]);
    return Response.json({data:{id:'txn_yearly'}});
  };
  try {
    const response=await api(env,'/api/billing/checkout',user.cookie,{plan:'pro',cycle:'yearly',autoRenew:false});
    assert.equal(response.status,200);
    assert.deepEqual(writes,['PATCH','POST']);
    assert.equal((await db.prepare('SELECT status FROM checkout_intents WHERE id=?1').bind(intent).first<any>()).status,'failed');
    const pending=await db.prepare("SELECT billing_cycle,auto_renew FROM checkout_intents WHERE status='pending'").first<{billing_cycle:string;auto_renew:number}>();
    assert.equal(pending?.billing_cycle,'yearly');
    assert.equal(pending?.auto_renew,1);
  } finally {globalThis.fetch=original;}
});
test('Remover profissional com bloqueios preserva a agenda e informa o impedimento',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id);const prof=await db.prepare('SELECT id FROM professionals WHERE tenant_id=?1').bind(user.id).first<any>();
  await api(env,'/api/agenda/blocks',user.cookie,{professionalId:prof.id,startsAt:'2030-01-01T10:00',endsAt:'2030-01-01T11:00'});
  assert.equal((await api(env,'/api/professionals',user.cookie,{id:prof.id},'DELETE')).status,409);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM appointment_blocks').first<any>()).n,1);
});


test('Agenda externa aguarda revisão inicial e edições normais preservam prontidão',async()=>{
  const {db,env}=setup();const user=await account(env,{usesExternalSchedule:true,existingSystem:'Agenda externa'});
  let tenant=(await getTenantById(env.DB,user.id))!;
  assert.equal(tenant.schedule_mode,'external_manual');assert.equal(tenant.agenda_ready_at,null);
  const professional=await db.prepare('SELECT id FROM professionals WHERE tenant_id=?1').bind(user.id).first<any>();
  assert.equal((await api(env,'/api/professionals',user.cookie,{id:professional.id,endHour:'17:00'},'PATCH')).status,200);
  assert.equal((await getTenantById(env.DB,user.id))!.agenda_ready_at,null);
  assert.equal((await api(env,'/api/onboarding/agenda',user.cookie,{mode:'external_manual',maintenanceAcknowledged:true})).status,200);
  assert.equal((await api(env,'/api/professionals',user.cookie,{id:professional.id,endHour:'18:00'},'PATCH')).status,200);
  assert.ok((await getTenantById(env.DB,user.id))!.agenda_ready_at);
});

test('Equipe válida restaura agenda; expediente inválido ou remoção do último profissional bloqueia',async()=>{
  const {db,env}=setup();const user=await account(env),other=await account(env);
  await db.prepare("UPDATE tenants SET plan_tier='pro',subscription_ends_at=?2 WHERE id=?1").bind(user.id,new Date(Date.now()+86400000).toISOString()).run();
  const professional=await db.prepare('SELECT id FROM professionals WHERE tenant_id=?1').bind(user.id).first<any>();
  assert.equal((await api(env,'/api/professionals',user.cookie,{name:'Equipe adicional'})).status,200);
  const added=await db.prepare('SELECT id FROM professionals WHERE tenant_id=?1 AND id!=?2').bind(user.id,professional.id).first<any>();
  assert.ok((await getTenantById(env.DB,user.id))!.agenda_ready_at);
  assert.equal((await api(env,'/api/professionals',user.cookie,{id:added.id},'DELETE')).status,200);
  assert.ok((await getTenantById(env.DB,user.id))!.agenda_ready_at);
  assert.equal((await api(env,'/api/professionals',user.cookie,{id:professional.id,startHour:'19:00'},'PATCH')).status,200);
  assert.equal((await getTenantById(env.DB,user.id))!.agenda_ready_at,null);
  assert.ok((await getTenantById(env.DB,other.id))!.agenda_ready_at);
  assert.equal((await api(env,'/api/professionals',user.cookie,{id:professional.id,startHour:'08:00'},'PATCH')).status,200);
  assert.ok((await getTenantById(env.DB,user.id))!.agenda_ready_at);
  assert.equal((await api(env,'/api/professionals',user.cookie,{id:professional.id},'DELETE')).status,200);
  assert.equal((await getTenantById(env.DB,user.id))!.agenda_ready_at,null);
});


test('Owner login is isolated to read-only reports; clean official seed has no patient activity',async()=>{
 const {db,env}=setup();db.sqlite.exec(fs.readFileSync('seeds/lab.sql','utf8'));
 await db.prepare('UPDATE users SET password_hash=?1').bind(await hashPassword('fixture-account-password')).run();
 const login=await api(env,'/api/auth/login','',{email:'pedrogutierres@protonmail.com',password:'fixture-account-password'});
 assert.equal(login.status,200);assert.equal((await login.json() as any).redirect,'/admin');
 const cookie=login.headers.get('set-cookie')!.split(';')[0];
 for(const path of ['/inbox','/painel']){const r=await api(env,path,cookie);assert.equal(r.status,302);assert.ok(r.headers.get('location')!.endsWith('/admin'));}
 for(const [path,method] of [['/api/admin/tenants','POST'],['/api/admin/tenants','PATCH'],['/api/admin/users','POST'],['/api/admin/users/password','PATCH']])assert.equal((await api(env,path,cookie,{},method)).status,405);
 assert.equal((await api(env,'/api/conversations',cookie)).status,403);
 const report=await api(env,'/api/admin/overview',cookie);assert.equal(report.status,200);const data=await report.json() as any;
 assert.equal(data.stats.tenants_total,2);assert.equal(data.tenants.length,2);
 assert.ok(!JSON.stringify(data).includes('password_hash'));assert.ok(!JSON.stringify(data).includes('access_token'));assert.ok(!JSON.stringify(data).includes('messages_count'));
 for(const tenant of data.tenants){assert.equal(tenant.is_test,1);assert.equal(tenant.appointments_count,0);assert.equal(tenant.training_complete,true);assert.ok(tenant.owner_email);}
 const customer=await api(env,'/api/auth/login','',{email:'autonomo.odonto@teste.aura.ai',password:'fixture-account-password'});
 assert.equal((await customer.json() as any).redirect,'/inbox');const customerCookie=customer.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await api(env,'/api/admin/overview',customerCookie)).status,403);
 for(const table of ['messages','conversation_states','appointments','appointment_blocks','usage_reservations'])assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM '+table).first<any>()).n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM professionals WHERE active=1').first<any>()).n,2);
});


test('Lean quiz registration supports both areas and preserves legacy sector constraints',async()=>{
 const {db,env}=setup();
 for(const sectors of ['both',['dentistry','aesthetics'],['dentistry'],['aesthetics']]){
 const response=await api(env,'/api/auth/register','',{adminName:'Mariana Costa',email:crypto.randomUUID()+'@quiz.test',businessKind:'clinic',businessSectors:sectors,password:'quiz-password',confirmPassword:'quiz-password'});
 assert.equal(response.status,201);const data=await response.json() as any;const tenant=(await getTenantById(env.DB,data.tenantId))!;
 const expected=Array.isArray(sectors)?sectors.length===2?'both':sectors[0]:sectors;
 assert.equal(tenant.business_sectors,expected);assert.equal(tenant.business_sector,expected==='both'?'dentistry':expected);assert.equal(commercialAccess(tenant).profile.sector,expected);
 assert.equal(tenant.name,'Clínica Mariana');assert.equal(tenant.admin_phone,null);assert.equal(tenant.schedule_mode,'aura');assert.ok(tenant.agenda_ready_at);assert.ok(tenant.training_reviewed_at);assert.equal(commercialAccess(tenant).can_operate,false);
 const cfg=JSON.parse(tenant.bot_config);assert.equal(cfg.procedure_items.length,expected==='both'?6:3);assert.equal(isCrucialConfigComplete(cfg),true);
 if(expected==='both'){assert.deepEqual([...new Set(cfg.procedure_items.map((p:any)=>p.category))],['odonto','estetica']);const professional=await db.prepare('SELECT specialty FROM professionals WHERE tenant_id=?1').bind(tenant.id).first<any>();assert.equal(professional.specialty,'Odontologia e Estética');}
 }
 const before=(await db.prepare('SELECT COUNT(*) AS n FROM tenants').first<any>()).n;
 for(const patch of [{adminName:'A'},{confirmPassword:'errada'},{businessSectors:[]},{businessSectors:[['dentistry']]},{businessSectors:['dentistry','invalido']},{phone:'123'},{businessKind:'invalido'}]){
 assert.equal((await api(env,'/api/auth/register','',{adminName:'Titular Quiz',email:crypto.randomUUID()+'@quiz.test',businessKind:'solo',businessSector:'dentistry',password:'quiz-password',...patch})).status,400);
 }
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM tenants').first<any>()).n,before);
});


test('Training persists quiz profile and canonical schedule within the authenticated operation',async()=>{
 const {db,env}=setup();const a=await account(env),b=await account(env);
 const schedule_days=[1,2,3,4,5,6,0].map(day=>({day,enabled:day>0&&day<6,startHour:'08',startMinute:'00',endHour:'18',endMinute:'00'}));
 const payload={...config,business_kind:'clinic',business_sector:'both',schedule_days};
 assert.equal((await api(env,'/api/config',a.cookie,{config:payload,tenantId:b.id})).status,200);
 const tenant=(await getTenantById(env.DB,a.id))!;assert.equal(tenant.business_kind,'clinic');assert.equal(tenant.business_sector,'dentistry');assert.equal(tenant.business_sectors,'both');assert.ok(tenant.training_reviewed_at);
 const saved=JSON.parse(tenant.bot_config);assert.ok(saved.hours.includes('Segunda-feira: 08:00 às 18:00'));assert.deepEqual(saved.schedule_days,schedule_days);
 assert.equal((await getTenantById(env.DB,b.id))!.business_kind,'solo');
 for(const change of [{business_kind:'invalid'},{business_sector:'invalid'},{schedule_days:[{day:1}]},{schedule_days:schedule_days.map(d=>({...d,endHour:'07'}))}])assert.equal((await api(env,'/api/config',a.cookie,{config:{...payload,...change}})).status,400);
 assert.deepEqual(JSON.parse((await getTenantById(env.DB,a.id))!.bot_config),saved);
});


test('Signature diagnostics preserve the exact five-second window without exposing secrets',async()=>{
 const raw='{"event_id":"evt_test"}',secret='fixture-secret',now=1700000000000;
 const sign=async(timestamp:number)=>{
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+':'+raw));
  return 'ts='+timestamp+';h1='+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 };
 assert.deepEqual(await inspectPaddleSignature(raw,null,secret,now),{valid:false,reason:'missing_header'});
 assert.equal((await inspectPaddleSignature(raw,'ts=invalid;h1=bad',secret,now) as any).reason,'malformed_header');
 for(const seconds of [-5,0,5])assert.equal(await verifyPaddleSignature(raw,await sign(now/1000+seconds),secret,now),true);
 for(const seconds of [-6,6])assert.equal((await inspectPaddleSignature(raw,await sign(now/1000+seconds),secret,now) as any).reason,'timestamp_outside_tolerance');
 assert.equal(await verifyPaddleSignature(raw,await sign(now/1000-5),secret,now+1),false);
 assert.equal((await inspectPaddleSignature(raw+' ',await sign(now/1000),secret,now) as any).reason,'hmac_mismatch');
});

test('Webhook acknowledges durable receipt without calling Paddle and duplicate deliveries are idempotent',async()=>{
 const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);
 const event=subscriptionEvent(user.id,intent);event.data.customer_email='private@example.test';event.data.access_token='private-token';
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Must not call Paddle at receipt time');};
 try{
  for(let n=0;n<2;n++)assert.equal((await signedEvent(env,event,{},false)).status,200);
  assert.equal(calls,0);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'preparing');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM paddle_webhook_inbox').first<any>()).n,1);
  const queued=await db.prepare('SELECT payload_json,status FROM paddle_webhook_inbox').first<any>();assert.equal(queued.status,'pending');assert.ok(!queued.payload_json.includes('private@example.test'));assert.ok(!queued.payload_json.includes('private-token'));
  await processPaddleInbox(env);assert.ok(calls>0);assert.equal((await db.prepare('SELECT status FROM paddle_webhook_inbox').first<any>()).status,'pending');
 }finally{globalThis.fetch=original;}
 const proof=mockPaddleProof(user.id,intent);
 try{
  // A separate invocation recovers the persisted event even though its original signature is now old.
  await processPaddleInbox({...env},Date.now()+61000);
  assert.equal((await db.prepare('SELECT status FROM paddle_webhook_inbox').first<any>()).status,'completed');assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'active');
  await processPaddleInbox(env,Date.now()+7200000);assert.equal((await db.prepare('SELECT count(*) AS n FROM billing_events').first<any>()).n,1);
 }finally{proof.restore();}
});

test('Failed durable write is not acknowledged; Paddle can retry delivery',async()=>{
 const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);
 const broken={...env,DB:{prepare(sql:string){if(sql.includes('INSERT INTO paddle_webhook_inbox'))throw new Error('fixture outage');return db.prepare(sql);}}} as any;
 assert.equal((await signedEvent(broken,subscriptionEvent(user.id,intent),{},false)).status,503);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM paddle_webhook_inbox').first<any>()).n,0);
});

test('Concurrent consumers and expired leases do not apply a notification twice',async()=>{
 const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id),event=subscriptionEvent(user.id,intent);
 await signedEvent(env,event,{},false);
 await db.prepare("UPDATE paddle_webhook_inbox SET status='processing',lease_token='terminated-worker',lease_until=?1").bind(Date.now()+120000).run();
 assert.equal((await processPaddleInbox(env)).processed,0);
 const proof=mockPaddleProof(user.id,intent);
 try{
  const now=Date.now()+121000;
  await Promise.all([processPaddleInbox(env,now),processPaddleInbox(env,now)]);
  const job=await db.prepare('SELECT status,attempts FROM paddle_webhook_inbox').first<any>();assert.equal(job.status,'completed');assert.equal(job.attempts,1);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM billing_events').first<any>()).n,1);
  const before=(await getTenantById(env.DB,user.id))!.commercial_status;
  const next=subscriptionEvent(user.id,intent,{status:'paused'});await signedEvent(env,next,{},false);
  await sandboxWorker.scheduled({cron:'* * * * *'} as any,{...env,PADDLE_ENVIRONMENT:'live'});
  assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,before);
  await sandboxWorker.scheduled({cron:'* * * * *'} as any,env);
  assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'active');
 }finally{proof.restore();}
});


test('Billing cron recovers the inbox and a rejected notification can be replayed after correction',async()=>{
 const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);
 const event=subscriptionEvent(user.id,intent,{status:'paused',items:[{price:{id:'pri_corrected'}}]});
 await signedEvent(env,event,{},false);await worker.scheduled({cron:'* * * * *'} as any,env);
 assert.equal((await db.prepare('SELECT status FROM paddle_webhook_inbox').first<any>()).status,'rejected');
 env.PADDLE_MONTHLY_PRICE_ID='pri_corrected';await signedEvent(env,event,{},false);
 assert.equal((await db.prepare('SELECT status FROM paddle_webhook_inbox').first<any>()).status,'pending');
 await worker.scheduled({cron:'* * * * *'} as any,env);
 assert.equal((await db.prepare('SELECT status FROM paddle_webhook_inbox').first<any>()).status,'completed');
 assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'ended');
});

test('Sandbox starts processing a captured payment when its verified webhook arrives',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);
  const tasks:Promise<unknown>[]=[];
  const ctx={waitUntil(task:Promise<unknown>){tasks.push(task);}} as ExecutionContext;
  const proof=mockPaddleProof(user.id,intent);
  try {
    const event=completedPayment(user.id,intent);
    assert.equal((await signedEvent(env,event,{},false,ctx)).status,200);
    assert.equal(tasks.length,1);
    await Promise.all(tasks);
    assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'active');
    assert.equal((await db.prepare('SELECT status FROM paddle_webhook_inbox WHERE event_id=?1').bind(event.event_id).first<any>()).status,'completed');
  } finally {proof.restore();}
});

test('A pending Pix on a ready checkout cannot be replaced with a new purchase',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);await billingIntent(db,user.id);
  const original=globalThis.fetch;
  globalThis.fetch=async(input,init)=>{
    const url=String(input);
    assert.equal(init?.method,'GET');
    if(url.endsWith('/prices/pri_pro_monthly'))return new Response(JSON.stringify({data:catalogPrice('pri_pro_monthly')}));
    assert.ok(url.endsWith('/transactions/txn_test'));
    return new Response(JSON.stringify({data:{status:'ready',payments:[{status:'pending_no_action_required'}]}}));
  };
  try {
    const response=await api(env,'/api/billing/checkout',user.cookie,{plan:'pro',cycle:'monthly',autoRenew:true});
    assert.equal(response.status,409);
    assert.equal((await response.json() as any).code,'PAYMENT_PENDING');
    assert.equal((await db.prepare('SELECT status FROM checkout_intents').first<any>()).status,'pending');
  } finally {globalThis.fetch=original;}
});


test('Free funciona sem Paddle e exige preparação antes do atendimento real',async()=>{
  const {db,env}=setup();env.OPERATIONAL_TRIAL_ENABLED='false';const user=await account(env);
  assert.equal((await api(env,'/api/billing/free',user.cookie,{})).status,200);
  let tenant=(await getTenantById(env.DB,user.id))!;
  assert.equal(tenant.plan_tier,'free');assert.equal(commercialAccess(tenant).can_operate,false);
  await ready(db,user.id,'free');
  assert.equal((await api(env,'/api/onboarding/start-paid',user.cookie,{})).status,200);
  tenant=(await getTenantById(env.DB,user.id))!;
  assert.equal(commercialAccess(tenant).can_operate,true);assert.equal(tenant.trial_started_at,null);
  assert.equal((await api(env,'/api/billing',user.cookie).then(r=>r.json()) as any).auto_renew,false);
});

test('Cotas Free são atômicas, isoladas, idempotentes e devolvidas somente uma vez',async()=>{
  const {db,env}=setup();const user=await account(env),other=await account(env);await ready(db,user.id,'free');
  const tenant=(await getTenantById(env.DB,user.id))!;
  assert.equal(await reservePlanUsage(env,tenant,'responses','first-49',49),'reserved');
  await finishPlanUsage(env,tenant.id,'responses','first-49');
  assert.equal(await reservePlanUsage(env,tenant,'responses','first-49',49),'replay');
  const parallel=await Promise.all(['last-a','last-b'].map(id=>reservePlanUsage(env,tenant,'responses',id)));
  assert.equal(parallel.filter(value=>value==='reserved').length,1);assert.equal(parallel.filter(value=>value==='limit').length,1);
  const winner=parallel[0]==='reserved'?'last-a':'last-b';
  await finishPlanUsage(env,tenant.id,'responses',winner,true);await finishPlanUsage(env,tenant.id,'responses',winner,true);
  assert.equal(await reservePlanUsage(env,tenant,'responses','recovered'),'reserved');
  assert.equal(await reservePlanUsage(env,(await getTenantById(env.DB,other.id))!,'responses','recovered'),'reserved');
  assert.equal(await reservePlanUsage(env,tenant,'voice','forbidden'),'limit');
  assert.equal((await planUsage(env,tenant)).used.responses,50);
  await db.prepare("INSERT INTO plan_usage(tenant_id,month,metric,request_id,amount,limit_value,status) VALUES (?1,'2020-01','images','old',15,15,'completed')").bind(tenant.id).run();
  assert.equal(await reservePlanUsage(env,tenant,'images','new-month',15),'reserved');
  assert.equal(await reservePlanUsage(env,tenant,'images','one-too-many'),'limit');
  assert.equal(usageMonth(Date.parse('2026-12-01T02:59:59Z')),'2026-11');
  assert.equal(usageMonth(Date.parse('2026-12-01T03:00:00Z')),'2026-12');
});

test('Pro limita todos os recursos; Ultra libera somente os recursos anunciados como ilimitados',async()=>{
  const {db,env}=setup();const user=await account(env);
  await db.prepare("UPDATE tenants SET plan_tier='pro',commercial_status='active',subscription_ends_at=?2 WHERE id=?1").bind(user.id,new Date(Date.now()+86400000).toISOString()).run();
  let tenant=(await getTenantById(env.DB,user.id))!;
  for(const metric of ['responses','transcription','images','voice'] as const){
    assert.equal(await reservePlanUsage(env,tenant,metric,'pro-cap',PLANS.pro[metric]),'reserved');
    assert.equal(await reservePlanUsage(env,tenant,metric,'pro-excess'),'limit');
  }
  await db.prepare("UPDATE tenants SET plan_tier='ultra' WHERE id=?1").bind(user.id).run();tenant=(await getTenantById(env.DB,user.id))!;
  for(const metric of ['responses','transcription','images'] as const)assert.equal(await reservePlanUsage(env,tenant,metric,'ultra',1000000),'reserved');
  assert.equal(await reservePlanUsage(env,tenant,'voice','ultra-remaining',2700),'reserved');
  assert.equal(await reservePlanUsage(env,tenant,'voice','ultra-excess'),'limit');
  assert.equal(effectivePlan(tenant,Date.parse(tenant.subscription_ends_at!)+1),'free');
});

test('Fila real respeita a quinquagésima resposta e mantém o atendimento humano disponível',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'free');
  await db.prepare("UPDATE tenants SET plan_tier='free' WHERE id=?1").bind(user.id).run();const tenant=(await getTenantById(env.DB,user.id))!;
  await reservePlanUsage(env,tenant,'responses','existing',49);await finishPlanUsage(env,user.id,'responses','existing');
  const network=mockNetwork();try{
    await inbound(env,user.id,'50');await inbound(env,user.id,'51');await inbound(env,user.id,'50');
    assert.equal(network.calls.filter(c=>c.url.includes('anthropic')).length,1);
    assert.equal(network.calls.filter(c=>c.url.endsWith('/messages')&&c.body?.type==='text').length,1);
    assert.equal((await api(env,'/api/send',user.cookie,{phone:'5511999999999',text:'Recepção humana'})).status,200);
  }finally{network.restore();}
});

test('Rebaixamento preserva profissionais e consultas, mas limita novas reservas por capacidade',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'active');
  await db.prepare("UPDATE tenants SET plan_tier='ultra',subscription_ends_at=?2 WHERE id=?1").bind(user.id,new Date(Date.now()+86400000).toISOString()).run();
  for(const name of ['Segundo','Terceiro'])assert.equal((await api(env,'/api/professionals',user.cookie,{name,workingDays:[0,1,2,3,4,5,6]})).status,200);
  const all=await db.prepare('SELECT * FROM professionals WHERE tenant_id=?1 ORDER BY id').bind(user.id).all<any>();
  const third=all.results[2];
  assert.equal((await createAppointment(env.DB,user.id,'5511','Paciente','Avaliação','2030-01-01 10:00','agendado',null,'30 min',third.id,third.name)).success,true);
  await db.prepare("UPDATE tenants SET plan_tier='pro' WHERE id=?1").bind(user.id).run();
  assert.equal((await api(env,'/api/professionals?active_only=1',user.cookie).then(r=>r.json()) as any).professionals.length,2);
  assert.equal((await api(env,'/api/professionals',user.cookie).then(r=>r.json()) as any).professionals.length,3);
  assert.equal((await createAppointment(env.DB,user.id,'5522','Outra pessoa','Avaliação','2030-01-01 11:00','agendado',null,'30 min',third.id,third.name)).success,false);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM appointments WHERE tenant_id=?1').bind(user.id).first<any>()).n,1);
  assert.equal((await api(env,'/api/professionals',user.cookie,{name:'Quarto'})).status,409);
});

async function paidBillingFixture(tier:'pro'|'ultra'='pro',cycle:'monthly'|'yearly'='monthly') {
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);
  const start=new Date(Date.now()-86400000).toISOString(),end=new Date(Date.now()+86400000*15).toISOString(),price=`pri_${tier}_${cycle}`;
  await db.prepare("UPDATE tenants SET plan_tier=?2,commercial_status='active',paddle_customer_id='ctm_test',paddle_subscription_id='sub_test',billing_status='active',subscription_starts_at=?3,subscription_ends_at=?4,billing_cycle=?5,plan_price_id=?6 WHERE id=?1")
    .bind(user.id,tier,start,end,cycle,price).run();
  const state={subscription:{...subscriptionEvent(user.id,intent).data,next_billed_at:end,items:[{price:{id:price},quantity:1}],scheduled_change:null as any},
    payment:{id:'txn_test',status:'completed',customer_id:'ctm_test',subscription_id:'sub_test',custom_data:{tenant_id:user.id,checkout_intent:intent},items:[{price:{id:price},quantity:1}],billing_period:{starts_at:start,ends_at:end}},failPatch:false,unsafePreview:false,calls:[] as {url:string;body:any;method:string}[]};
  const original=fetch;
  globalThis.fetch=async(input,init)=>{
    const url=String(input),body=init?.body?JSON.parse(String(init.body)):null,method=init?.method||'GET';state.calls.push({url,body,method});
    let data:any;
    if(url.includes('/prices/'))data=catalogPrice(url.split('/').at(-1)!);
    else if(url.endsWith('/preview')) {
      assert.ok(!('next_billed_at' in body), 'Paddle rejects item and billing date changes in the same request');
      data={...state.subscription,immediate_transaction:state.unsafePreview?{total:'1'}:null,next_transaction:state.subscription.scheduled_change ? null : {billing_period:{starts_at:end},details:{totals:{currency_code:'BRL',grand_total:catalogPrice(body.items[0].price_id).unit_price.amount}}}};
    }
    else if(url.endsWith('/cancel')){state.subscription.scheduled_change={action:'cancel',effective_at:state.subscription.next_billed_at};state.subscription.next_billed_at=null as any;data=state.subscription;}
    else if(url.endsWith('/subscriptions/sub_test')&&method==='PATCH'){
      if(state.failPatch)throw new Error('Timeout after request');
      assert.ok(!('next_billed_at' in body));
      if(body.items)state.subscription.items=body.items.map((item:any)=>({price:{id:item.price_id},quantity:item.quantity}));
      if(body.scheduled_change===null){state.subscription.scheduled_change=null;state.subscription.next_billed_at=end;}
      data=state.subscription;
    }else if(url.endsWith('/subscriptions/sub_test'))data=state.subscription;
    else if(url.includes('/transactions?'))data=[state.payment];
    else throw new Error('Unexpected test URL '+url);
    return new Response(JSON.stringify({data}));
  };
  return {db,env,user,intent,state,end,start,restore:()=>{globalThis.fetch=original;}};
}

test('Upgrade, downgrade e mensal/anual começam no próximo período, sem antecipar benefícios ou cobrança',async()=>{
  for(const [from,to,cycle] of [['pro','ultra','monthly'],['ultra','pro','monthly'],['pro','ultra','yearly']] as const){
    const f=await paidBillingFixture(from);try{
      const choice={plan:to,cycle,autoRenew:true};
      const summary=await api(f.env,'/api/billing/preview',f.user.cookie,choice).then(r=>r.json()) as any;
      assert.equal(summary.scheduled,true);assert.equal(summary.effective_at,f.end);assert.equal(summary.amount,PLANS[to][cycle]);
      assert.equal((await api(f.env,'/api/billing/checkout',f.user.cookie,{...choice,fingerprint:'altered'})).status,409);
      assert.equal((await api(f.env,'/api/billing/checkout',f.user.cookie,{...choice,fingerprint:summary.fingerprint})).status,200);
      const patch=f.state.calls.find(c=>c.method==='PATCH'&&!c.url.endsWith('/preview'))!;
      assert.equal(patch.body.proration_billing_mode,'do_not_bill');assert.equal(f.state.subscription.next_billed_at,f.end);
      assert.ok(!('scheduled_change' in patch.body));
      assert.equal(patch.body.items[0].price_id,`pri_${to}_${cycle}`);
      let tenant=(await getTenantById(f.env.DB,f.user.id))!;assert.equal(tenant.plan_tier,from);assert.equal(tenant.subscription_ends_at,f.end);
      await signedEvent(f.env,subscriptionEvent(f.user.id,f.intent,{items:f.state.subscription.items}));
      tenant=(await getTenantById(f.env.DB,f.user.id))!;assert.equal(tenant.plan_tier,from);
      const pending=await f.db.prepare("SELECT * FROM plan_changes WHERE tenant_id=?1 AND status='applied'").bind(f.user.id).first<any>();assert.equal(pending.plan_tier,to);
      const before=Date.now;Date.now=()=>Date.parse(f.end)+1000;
      try {
        f.state.payment.items=[{price:{id:`pri_${to}_${cycle}`},quantity:1}];
        f.state.payment.billing_period={starts_at:f.end,ends_at:new Date(Date.now()+86400000*30).toISOString()};
        await signedEvent(f.env,{...completedPayment(f.user.id,f.intent),occurred_at:new Date(Date.now()).toISOString()});
        tenant=(await getTenantById(f.env.DB,f.user.id))!;assert.equal(tenant.plan_tier,to);assert.equal(tenant.billing_cycle,cycle);
        assert.equal((await f.db.prepare('SELECT status FROM plan_changes WHERE id=?1').bind(pending.id).first<any>()).status,'completed');
      }finally{Date.now=before;}
    }finally{f.restore();}
  }
});

test('A Paddle payment mandate restriction returns the payment update link without scheduling a change',async()=>{
  const f=await paidBillingFixture();
  const managementUrl='https://sandbox-customer-portal.paddle.com/payment-method';
  f.state.subscription.management_urls={update_payment_method:managementUrl};
  f.state.subscription.next_billed_at=f.end.replace('Z','71Z');
  const mockFetch=globalThis.fetch;
  globalThis.fetch=async(input,init)=>{
    if(String(input).endsWith('/preview')) {
      const body=JSON.parse(String(init?.body));
      assert.ok(!('scheduled_change' in body));
      assert.ok(!('next_billed_at' in body));
      return new Response(JSON.stringify({error:{code:'subscription_change_not_allowed_for_payment_method'}}),{status:400});
    }
    return mockFetch(input,init);
  };
  try {
    const response=await api(f.env,'/api/billing/preview',f.user.cookie,{plan:'ultra',cycle:'monthly',autoRenew:true});
    assert.equal(response.status,409);
    const data=await response.json() as any;
    assert.equal(data.code,'PAYMENT_METHOD_CHANGE_REQUIRED');
    assert.equal(data.update_payment_method_url,managementUrl);
    assert.match(data.error,/Pix Automático do seu plano Pro.*plano Ultra/);
    assert.equal((await f.db.prepare('SELECT count(*) AS n FROM plan_changes').first<any>()).n,0);
  } finally {f.restore();}
});

test('A paid period blocks direct Free selection even when auto-renewal was canceled',async()=>{
  const f=await paidBillingFixture();
  try {
    await f.db.prepare('UPDATE tenants SET auto_renew=0,renewal_canceled_at=?2 WHERE id=?1').bind(f.user.id,f.end).run();
    const response=await api(f.env,'/api/billing/free',f.user.cookie,{});
    assert.equal(response.status,409);
    assert.equal((await response.json() as any).code,'FREE_UNAVAILABLE');
    const billing=await api(f.env,'/api/billing',f.user.cookie).then(r=>r.json()) as any;
    assert.equal(billing.can_select_free,false);
    assert.equal(billing.plan,'pro');
    assert.equal(billing.ends_at,f.end);
    assert.equal(f.state.calls.length,0);
  } finally {f.restore();}
});

test('O portal de cobrança usa somente o vínculo da clínica autenticada e gera uma sessão a cada pedido',async()=>{
  const f=await paidBillingFixture();
  const other=await account(f.env);
  const mockFetch=globalThis.fetch;
  let sessions=0;
  globalThis.fetch=async(input,init)=>{
    if(!String(input).endsWith('/portal-sessions'))return mockFetch(input,init);
    assert.match(String(input),/\/customers\/ctm_test\/portal-sessions$/);
    assert.deepEqual(JSON.parse(String(init?.body)),{subscription_ids:['sub_test']});
    const url=`https://sandbox-customer-portal.paddle.com/session-${++sessions}`;
    return Response.json({data:{urls:{subscriptions:[{id:'sub_test',view_subscription:url}]}}});
  };
  try {
    assert.equal((await api(f.env,'/api/billing/portal','',{})).status,401);
    assert.equal((await api(f.env,'/api/billing/portal',other.cookie,{})).status,404);
    assert.equal(sessions,0);
    for(let i=1;i<=2;i++) {
      const response=await api(f.env,'/api/billing/portal',f.user.cookie,{customer_id:'ctm_other',subscription_ids:['sub_other']});
      assert.equal(response.status,200);
      assert.equal(response.headers.get('cache-control'),'no-store');
      assert.deepEqual(await response.json(),{url:`https://sandbox-customer-portal.paddle.com/session-${i}`});
    }
  } finally {f.restore();}
});

test('A scheduled cancellation explains the prerequisite without restoring renewal during preview',async()=>{
  const f=await paidBillingFixture();
  try {
    f.state.subscription.next_billed_at=null;
    f.state.subscription.scheduled_change={action:'cancel',effective_at:f.end};
    const response=await api(f.env,'/api/billing/preview',f.user.cookie,{plan:'ultra',cycle:'monthly',autoRenew:true});
    assert.equal(response.status,409);
    assert.equal((await response.json() as any).code,'RENEWAL_DISABLED');
    assert.ok(f.state.calls.every(call=>call.method==='GET' || call.url.endsWith('/preview')));
  } finally {f.restore();}
});

test('Prévia que cobra imediatamente é recusada; timeout de alteração fica registrado e é recuperado pelo cron',async()=>{
  const f=await paidBillingFixture();try{
    const choice={plan:'ultra',cycle:'monthly',autoRenew:true};f.state.unsafePreview=true;
    assert.equal((await api(f.env,'/api/billing/preview',f.user.cookie,choice)).status,409);
    assert.equal(f.state.calls.filter(c=>c.method==='PATCH'&&!c.url.endsWith('/preview')).length,0);
    f.state.unsafePreview=false;const summary=await api(f.env,'/api/billing/preview',f.user.cookie,choice).then(r=>r.json()) as any;
    f.state.failPatch=true;assert.equal((await api(f.env,'/api/billing/checkout',f.user.cookie,{...choice,fingerprint:summary.fingerprint})).status,409);
    assert.equal((await f.db.prepare('SELECT status FROM plan_changes').first<any>()).status,'prepared');
    f.state.failPatch=false;await processPaddleInbox(f.env);
    assert.equal((await f.db.prepare('SELECT status FROM plan_changes').first<any>()).status,'applied');
    assert.equal((await getTenantById(f.env.DB,f.user.id))!.plan_tier,'pro');
  }finally{f.restore();}
});

test('Renovação pode ser cancelada e reativada sem remover validade ou disparar cobrança',async()=>{
  const f=await paidBillingFixture();try{
    assert.equal((await api(f.env,'/api/billing/renewal',f.user.cookie,{enabled:false})).status,200);
    let tenant=(await getTenantById(f.env.DB,f.user.id))!;assert.equal(tenant.auto_renew,0);assert.equal(tenant.subscription_ends_at,f.end);assert.equal(tenant.plan_tier,'pro');
    assert.equal((await api(f.env,'/api/billing/renewal',f.user.cookie,{enabled:true})).status,200);
    tenant=(await getTenantById(f.env.DB,f.user.id))!;assert.equal(tenant.auto_renew,1);assert.equal(tenant.renewal_canceled_at,null);assert.equal(tenant.subscription_ends_at,f.end);
    assert.equal(f.state.calls.filter(c=>c.url.endsWith('/transactions')&&c.method==='POST').length,0);
  }finally{f.restore();}
});

test('Cancelar a renovação desfaz a troca na Paddle e reativar renova somente o plano pago',async()=>{
  const f=await paidBillingFixture();try{
    const choice={plan:'ultra',cycle:'monthly',autoRenew:true};
    const summary=await api(f.env,'/api/billing/preview',f.user.cookie,choice).then(r=>r.json()) as any;
    assert.equal((await api(f.env,'/api/billing/checkout',f.user.cookie,{...choice,fingerprint:summary.fingerprint})).status,200);
    f.state.failPatch=true;
    assert.equal((await api(f.env,'/api/billing/renewal',f.user.cookie,{enabled:false})).status,409);
    let state=await api(f.env,'/api/billing',f.user.cookie).then(r=>r.json()) as any;
    assert.equal(state.auto_renew,false);assert.equal(state.canceling_change,true);
    assert.equal(f.state.subscription.scheduled_change.action,'cancel');
    f.state.failPatch=false;
    await processPaddleInbox(f.env);
    state=await api(f.env,'/api/billing',f.user.cookie).then(r=>r.json()) as any;
    assert.equal(state.pending,null);assert.equal(state.ends_at,f.end);assert.equal(state.auto_renew,false);
    assert.equal(f.state.subscription.items[0].price.id,'pri_pro_monthly');
    assert.equal(f.state.subscription.scheduled_change.effective_at,f.end);
    assert.equal(f.state.subscription.next_billed_at,null);
    assert.equal((await api(f.env,'/api/billing/renewal',f.user.cookie,{enabled:true})).status,200);
    assert.equal(f.state.subscription.items[0].price.id,'pri_pro_monthly');
    assert.equal(f.state.subscription.next_billed_at,f.end);
    assert.equal(f.state.calls.filter(c=>c.url.endsWith('/transactions')&&c.method==='POST').length,0);
  }finally{f.restore();}
});

test('Áudio é medido pela duração real e voz Free nunca chama o provedor',async()=>{
  const bytes=new ArrayBuffer(44+16000*4);const view=new DataView(bytes),u=new Uint8Array(bytes);
  const text=(offset:number,s:string)=>u.set(new TextEncoder().encode(s),offset);
  text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  text(36,'data');view.setUint32(40,bytes.byteLength-44,true);
  assert.equal(audioSeconds(bytes,'audio/wav'),4);assert.equal(audioSeconds(new ArrayBuffer(2),'audio/ogg'),null);
  const {env}=setup();const user=await account(env);let called=false;
  env.AI={run:async()=>{called=true;throw new Error('Unexpected TTS');}} as any;
  env.MEDIA_BUCKET={} as any;
  assert.equal(await prepareVoice(env,(await getTenantById(env.DB,user.id))!,'voice-free','Olá'),null);assert.equal(called,false);
});
