import type { Env, Tenant } from './types';
import { commercialAccess } from './access';
import { validLocalDate } from './dates';
import { listProfessionals } from './db';
import { jsonResponse } from './http';

// Deliberately supports an explicit time-only CSV, not arbitrary exports or PDFs.
export function parseOccupationsCsv(csv:string) {
  const text=csv.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trim();
  const delimiter=text.split('\n')[0]?.includes(';')?';':',';
  const rows:string[][]=[];let row:string[]=[],value='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(char==='"') {if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(char===delimiter||char==='\n')){row.push(value.trim());value='';if(char==='\n'){rows.push(row);row=[];}}
    else value+=char;
  }
  if(quoted)throw new Error('Aspas não fechadas no CSV.');
  row.push(value.trim());rows.push(row);
  if(rows[0]?.map(v=>v.toLowerCase()).join(',')!=='profissional,inicio,fim')throw new Error('Use somente as colunas profissional,inicio,fim do modelo Aura.');
  if(rows.length<2||rows.length>41)throw new Error('Importe de 1 a 40 ocupações por vez.');
  return rows.slice(1);
}
export async function agendaImport(request:Request,env:Env,tenant:Tenant,canManage:boolean) {
  if(request.method!=='POST')return jsonResponse({error:'Método não permitido.'},405);
  if(!canManage||!commercialAccess(tenant).can_prepare)return jsonResponse({error:'Prepare a agenda com o acesso do responsável.'},403);
  let body:any;try{body=await request.json();}catch{return jsonResponse({error:'JSON inválido.'},400);}
  const path=new URL(request.url).pathname;
  if(path==='/api/agenda/import/preview') {
    if(typeof body?.csv!=='string'||body.csv.length>100000)return jsonResponse({error:'Envie um CSV do modelo Aura com até 40 ocupações.'},400);
    try {
      const raw=parseOccupationsCsv(body.csv),professionals=await listProfessionals(env.DB,tenant.id,true),seen=new Set<string>();
      const rows=raw.map((row,index)=>{
        const [name,start,end]=row;const matches=professionals.filter(p=>p.name.trim().toLocaleLowerCase('pt-BR')===name?.trim().toLocaleLowerCase('pt-BR'));
        if(row.length!==3||matches.length!==1||!validLocalDate(start)||!validLocalDate(end))throw new Error(`Linha ${index+2}: use profissional cadastrado e datas válidas no formato AAAA-MM-DD HH:MM.`);
        const startsAt=start.replace('T',' '),endsAt=end.replace('T',' ');
        if(startsAt>=endsAt)throw new Error(`Linha ${index+2}: o término deve ocorrer depois do início.`);
        const key=matches[0].id+'|'+startsAt+'|'+endsAt;if(seen.has(key))throw new Error(`Linha ${index+2}: ocupação duplicada no arquivo.`);seen.add(key);
        return {professionalId:matches[0].id,professionalName:matches[0].name,startsAt,endsAt};
      });
      const id=crypto.randomUUID();
      await env.DB.prepare('INSERT INTO agenda_import_batches(id,tenant_id,rows_json) VALUES (?1,?2,?3)').bind(id,tenant.id,JSON.stringify(rows)).run();
      return jsonResponse({batchId:id,rows,notice:'Confira profissionais e horários de Brasília. A importação cria apenas bloqueios; não sincroniza alterações futuras nem gera lembretes.'});
    }catch(error){return jsonResponse({error:error instanceof Error?error.message:'Arquivo inválido.'},400);}
  }
  if(path==='/api/agenda/import/commit') {
    if(typeof body?.batchId!=='string'||body.confirmed!==true)return jsonResponse({error:'Confirme a prévia antes de importar.'},400);
    const batch=await env.DB.prepare('SELECT * FROM agenda_import_batches WHERE tenant_id=?1 AND id=?2').bind(tenant.id,body.batchId).first<any>();
    if(!batch)return jsonResponse({error:'Prévia não encontrada.'},404);
    if(batch.status==='committed')return jsonResponse({success:true,batchId:batch.id});
    const rows=JSON.parse(batch.rows_json) as {professionalId:number;startsAt:string;endsAt:string}[];
    try {
      await env.DB.batch([
        ...rows.map(row=>env.DB.prepare(`INSERT INTO appointment_blocks(tenant_id,professional_id,starts_at,ends_at,source,batch_id)
          SELECT ?1,?2,?3,?4,'aura_csv',?5 WHERE EXISTS(SELECT 1 FROM agenda_import_batches WHERE id=?5 AND tenant_id=?1 AND status='preview')
          AND NOT EXISTS(SELECT 1 FROM appointment_blocks WHERE tenant_id=?1 AND professional_id=?2 AND starts_at=?3 AND ends_at=?4)`)
          .bind(tenant.id,row.professionalId,row.startsAt,row.endsAt,batch.id)),
        env.DB.prepare("UPDATE agenda_import_batches SET status='committed' WHERE id=?1 AND tenant_id=?2 AND status='preview'").bind(batch.id,tenant.id),
      ]);
      return jsonResponse({success:true,batchId:batch.id});
    }catch{return jsonResponse({error:'A agenda mudou ou um profissional está indisponível. Gere uma nova prévia.'},409);}
  }
  if(path==='/api/agenda/import/undo') {
    if(typeof body?.batchId!=='string'||body.confirmed!==true)return jsonResponse({error:'Confirme o lote para desfazer.'},400);
    await env.DB.prepare('DELETE FROM appointment_blocks WHERE tenant_id=?1 AND batch_id=?2').bind(tenant.id,body.batchId).run();
    return jsonResponse({success:true});
  }
  return jsonResponse({error:'Rota não encontrada.'},404);
}
