import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import worker, { runDayBeforeConfirmations } from '../src/index';
import { MockD1Database } from './d1-mock';
import { commercialAccess, finishUsage, reserveUsage } from '../src/access';
import { getTenantById, isCrucialConfigComplete, checkAppointmentConflict, createAppointment } from '../src/db';
import { createSessionToken, verifyPassword } from '../src/auth';
import type { Env } from '../src/types';
import { verifyPaddleSignature } from '../src/billing';
import { REGISTER_HTML } from '../src/views/register';
import { LOGIN_HTML } from '../src/views/login';
import { INBOX_HTML } from '../src/views/inbox';
import fs from 'node:fs';
import vm from 'node:vm';

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
  const now=new Date().toISOString(), end=new Date(Date.now()+168*3600000).toISOString();
  await db.prepare(`UPDATE tenants SET commercial_status=?2,bot_config=?3,training_reviewed_at=?4,agenda_ready_at=?4,
    schedule_mode='aura',phone_number_id=?5,access_token_enc='mock',whatsapp_diagnosed_at=?4,operational_enabled=1,
    trial_started_at=?6,trial_ends_at=?7 WHERE id=?1`).bind(id,status,JSON.stringify(config),now,'phone-'+id,status==='trial'?now:null,status==='trial'?end:null).run();
  await db.prepare("INSERT INTO professionals (tenant_id,name,working_days,start_hour,end_hour,break_start,break_end) VALUES (?1,'Profissional','[0,1,2,3,4,5,6]','08:00','18:00',NULL,NULL)").bind(id).run();
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

test('Cadastro cria acesso gratuito sem prazo, cobrança ou treinamento fictício',async()=>{
  const {db,env}=setup();const user=await account(env);const tenant=(await getTenantById(env.DB,user.id))!;
  assert.equal(tenant.commercial_status,'free');assert.equal(tenant.trial_started_at,null);assert.equal(tenant.trial_ends_at,null);assert.equal(tenant.billing_cycle,null);
  assert.equal(tenant.business_kind,'solo');assert.equal(tenant.business_sector,'aesthetics');assert.equal(isCrucialConfigComplete(JSON.parse(tenant.bot_config)),false);
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
  await account(env,{email:'unico@test.com'});assert.equal((await api(env,'/api/auth/register','',{clinicName:'N',adminName:'R',email:'UNICO@test.com',password:'segredo123',phone:'11999999999',businessKind:'clinic',businessSector:'dentistry',usesExternalSchedule:false})).status,409);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM tenants').first<any>()).n,1);
});
test('Conta gratuita recusa operações reais mesmo por chamada direta',async()=>{
  const {db,env}=setup();const user=await account(env);
  for(const url of ['/api/send','/api/toggle-ai','/api/clear-chat','/api/appointments','/api/appointments/run-confirmations','/api/professionals','/api/clinic/whatsapp/manual'])
    assert.equal((await api(env,url,user.cookie,{phone:'5511999999999',text:'oi'})).status,403,url);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM messages').first<any>()).n,0);
});
test('Preparação não inicia o relógio e libera profissionais sem consultas reais',async()=>{
  const {env}=setup();const user=await account(env);assert.equal((await api(env,'/api/onboarding/prepare',user.cookie,{})).status,200);
  const tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'preparing');assert.equal(tenant.trial_ends_at,null);
  assert.equal((await api(env,'/api/professionals',user.cookie,{name:'Profissional',workingDays:[1,2,3,4,5],startHour:'08:00',endHour:'18:00'})).status,200);
  assert.equal((await api(env,'/api/appointments',user.cookie,{patientName:'Pessoa',scheduledAt:'2030-01-01 10:00'})).status,403);
});
test('Ativação exige preparação e libera exatamente 168 horas uma única vez',async()=>{
  const {db,env}=setup();const user=await account(env);
  assert.equal((await api(env,'/api/onboarding/activate',user.cookie,{})).status,409);await ready(db,user.id);
  assert.equal((await api(env,'/api/onboarding/activate',user.cookie,{})).status,200);
  const first=(await getTenantById(env.DB,user.id))!;assert.equal(first.commercial_status,'trial');assert.equal(Date.parse(first.trial_ends_at!)-Date.parse(first.trial_started_at!),168*3600000);
  await api(env,'/api/onboarding/activate',user.cookie,{});assert.equal((await getTenantById(env.DB,user.id))!.trial_ends_at,first.trial_ends_at);
});
test('Ativação pode ficar desabilitada sem impedir cadastro e preparação',async()=>{
  const {db,env}=setup();env.OPERATIONAL_TRIAL_ENABLED='false';const user=await account(env);await ready(db,user.id);
  assert.equal((await api(env,'/api/onboarding/activate',user.cookie,{})).status,503);assert.equal((await getTenantById(env.DB,user.id))!.trial_started_at,null);
});
test('Modo paciente exige treinamento; modo Aura funciona antes da revisão',async()=>{
  const {env}=setup();const user=await account(env);const network=mockNetwork();try{
    assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'patient',message:'oi',requestId:crypto.randomUUID()})).status,409);
    assert.equal((await api(env,'/api/simulator/chat',user.cookie,{mode:'aura',message:'Como funciona?',requestId:crypto.randomUUID()})).status,200);
    assert.equal(network.calls.length,1);assert.ok(!JSON.stringify(network.calls[0].body).includes('CRO'));
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
test('Salvar treinamento exige nova revisão e impede operação até confirmar',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id,'trial');assert.equal((await api(env,'/api/config',user.cookie,{config})).status,200);assert.equal(commercialAccess((await getTenantById(env.DB,user.id))!).can_operate,false);
  assert.equal((await api(env,'/api/onboarding/review-training',user.cookie,{})).status,200);assert.equal(commercialAccess((await getTenantById(env.DB,user.id))!).can_operate,true);
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
  Object.assign(env,{PADDLE_ENABLED:'true',PADDLE_ENVIRONMENT:'sandbox',PADDLE_SANDBOX_ENTITLEMENTS:'true',PADDLE_API_KEY:'mock-api',PADDLE_WEBHOOK_SECRET:'mock-secret',PADDLE_CLIENT_TOKEN:'test_mock',PADDLE_MONTHLY_PRICE_ID:'pri_monthly',PADDLE_YEARLY_PRICE_ID:'pri_yearly'});
}
async function signedEvent(env:Env,event:unknown,overrides:Record<string,string>={}) {
  const raw=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PADDLE_WEBHOOK_SECRET!),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+':'+raw));
  const signature=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  return worker.fetch(new Request('https://aura.test/api/webhooks/paddle',{method:'POST',headers:{'Paddle-Signature':`ts=${timestamp};h1=${signature}`,...overrides},body:raw}),env);
}
async function billingIntent(db:MockD1Database,id:string) {
  const intent=crypto.randomUUID();await db.prepare("INSERT INTO checkout_intents(id,tenant_id,billing_cycle,transaction_id) VALUES (?1,?2,'monthly','txn_test')").bind(intent,id).run();return intent;
}
function subscriptionEvent(id:string,intent:string,overrides:any={}) {
  return {event_id:'evt_'+crypto.randomUUID(),event_type:'subscription.updated',occurred_at:new Date().toISOString(),data:{id:'sub_test',customer_id:'ctm_test',status:'active',custom_data:{tenant_id:id,checkout_intent:intent},items:[{price:{id:'pri_monthly'}}],current_billing_period:{ends_at:new Date(Date.now()+30*86400000).toISOString()},...overrides}};
}
test('Cobrança permanece desabilitada sem configuração e checkout exige aceite',async()=>{
  const {env}=setup();const user=await account(env);assert.equal((await api(env,'/api/billing/checkout',user.cookie,{cycle:'monthly',renewalAccepted:true})).status,503);configureBilling(env);
  assert.equal((await api(env,'/api/billing/checkout',user.cookie,{cycle:'monthly'})).status,400);
});
test('Checkout usa preço e vínculo criados no servidor; não libera assinatura pelo navegador',async()=>{
  const {env}=setup();configureBilling(env);const user=await account(env);const original=fetch;let sent:any;
  globalThis.fetch=async(input,init)=>{
    if(String(input).includes('/prices/'))return new Response(JSON.stringify({data:{status:'active',unit_price:{amount:'19900',currency_code:'BRL'},billing_cycle:{interval:'month',frequency:1},trial_period:null}}));
    assert.equal(String(input),'https://sandbox-api.paddle.com/transactions');sent=JSON.parse(String(init?.body));return new Response(JSON.stringify({data:{id:'txn_test'}}));
  };
  try{
    const result=await api(env,'/api/billing/checkout',user.cookie,{cycle:'monthly',renewalAccepted:true,tenant_id:'outro',priceId:'barato'});assert.equal(result.status,200);
    assert.equal(sent.custom_data.tenant_id,user.id);assert.equal(sent.items[0].price_id,'pri_monthly');assert.ok(sent.custom_data.checkout_intent);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'free');
    assert.equal((await api(env,'/api/billing/checkout',user.cookie,{cycle:'monthly',renewalAccepted:true})).status,200);
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
  assert.equal((await signedEvent(env,event)).status,200);assert.equal((await signedEvent(env,event)).status,200);
  let tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'active');assert.equal(tenant.operational_enabled,0);assert.equal(commercialAccess(tenant).can_operate,false);
  const stale={...subscriptionEvent(user.id,intent,{status:'canceled'}),occurred_at:new Date(Date.now()-3600000).toISOString()};assert.equal((await signedEvent(env,stale)).status,200);
  tenant=(await getTenantById(env.DB,user.id))!;assert.equal(tenant.commercial_status,'active');assert.equal((await db.prepare('SELECT count(*) AS n FROM billing_events').first<any>()).n,2);
});
test('Cancelamento de renovação mantém período pago; cancelamento efetivo encerra a operação',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);const event=subscriptionEvent(user.id,intent,{scheduled_change:{action:'cancel',effective_at:new Date(Date.now()+86400000).toISOString()}});
  await signedEvent(env,event);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'active');assert.ok((await getTenantById(env.DB,user.id))!.renewal_canceled_at);
  const canceled={...subscriptionEvent(user.id,intent,{status:'canceled',current_billing_period:null}),occurred_at:new Date(Date.now()+1000).toISOString()};await signedEvent(env,canceled);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'ended');
});
test('Webhook não aceita trocar negócio nem preço pelo custom_data',async()=>{
  const {db,env}=setup();configureBilling(env);const a=await account(env),b=await account(env);const intent=await billingIntent(db,a.id);
  assert.equal((await signedEvent(env,subscriptionEvent(b.id,intent))).status,409);assert.equal((await signedEvent(env,subscriptionEvent(a.id,intent,{items:[{price:{id:'pri_other'}}]}))).status,409);
  assert.equal((await getTenantById(env.DB,a.id))!.commercial_status,'free');assert.equal((await getTenantById(env.DB,b.id))!.commercial_status,'free');
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
  const response=await signedEvent(env,subscriptionEvent(user.id,intent));assert.equal(response.status,200);assert.equal((await response.json() as any).sandbox_access_disabled,true);assert.equal((await getTenantById(env.DB,user.id))!.commercial_status,'free');
});
test('Preço externo divergente impede checkout sem criar transação',async()=>{
  const {env}=setup();configureBilling(env);const user=await account(env);const original=fetch;let posted=false;
  globalThis.fetch=async(input,init)=>{if(init?.method==='POST')posted=true;return new Response(JSON.stringify({data:{status:'active',unit_price:{amount:'199',currency_code:'USD'},billing_cycle:{interval:'month',frequency:1}}}));};
  try{assert.equal((await api(env,'/api/billing/checkout',user.cookie,{cycle:'monthly',renewalAccepted:true})).status,503);assert.equal(posted,false);}finally{globalThis.fetch=original;}
});
test('Troca de ciclo antes do pagamento reutiliza a transação sem duplicar a contratação',async()=>{
  const {db,env}=setup();configureBilling(env);const user=await account(env);const intent=await billingIntent(db,user.id);const original=fetch;let patches=0;
  globalThis.fetch=async(input,init)=>{
    if(String(input).includes('/prices/'))return new Response(JSON.stringify({data:{status:'active',unit_price:{amount:'214800',currency_code:'BRL'},billing_cycle:{interval:'year',frequency:1},trial_period:null}}));
    assert.equal(init?.method,'PATCH');patches++;return new Response(JSON.stringify({data:{id:'txn_test'}}));
  };
  try{assert.equal((await api(env,'/api/billing/checkout',user.cookie,{cycle:'yearly',renewalAccepted:true})).status,200);assert.equal(patches,1);assert.equal((await db.prepare('SELECT billing_cycle FROM checkout_intents WHERE id=?1').bind(intent).first<any>()).billing_cycle,'yearly');}finally{globalThis.fetch=original;}
});
test('Remover profissional com bloqueios preserva a agenda e informa o impedimento',async()=>{
  const {db,env}=setup();const user=await account(env);await ready(db,user.id);const prof=await db.prepare('SELECT id FROM professionals WHERE tenant_id=?1').bind(user.id).first<any>();
  await api(env,'/api/agenda/blocks',user.cookie,{professionalId:prof.id,startsAt:'2030-01-01T10:00',endsAt:'2030-01-01T11:00'});
  assert.equal((await api(env,'/api/professionals',user.cookie,{id:prof.id},'DELETE')).status,409);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM appointment_blocks').first<any>()).n,1);
});
