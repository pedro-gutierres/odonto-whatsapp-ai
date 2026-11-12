import { validLocalDate } from "./dates";
import type { Env, Tenant } from './types';
import { commercialAccess } from './access';
import { getProfessionalById } from './db';
import { jsonResponse } from './http';

export async function agendaBlocks(request: Request, env: Env, tenant: Tenant, canManage: boolean) {
  const access = commercialAccess(tenant);
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT b.*,p.name AS professional_name FROM appointment_blocks b JOIN professionals p ON p.id=b.professional_id AND p.tenant_id=b.tenant_id WHERE b.tenant_id=?1 ORDER BY b.starts_at').bind(tenant.id).all();
    return jsonResponse({ blocks: results });
  }
  if (!canManage || !access.can_prepare) return jsonResponse({ error: 'Inicie a preparação da agenda com o acesso do responsável.' }, 403);
  let body: any;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'JSON inválido.' }, 400); }
  if (!body || typeof body !== 'object') return jsonResponse({error:'Dados de bloqueio inválidos.'},400);
  if (request.method === 'DELETE') {
    if (!Number.isSafeInteger(body.id) || body.id <= 0) return jsonResponse({ error: 'Bloqueio inválido.' }, 400);
    await env.DB.prepare('DELETE FROM appointment_blocks WHERE tenant_id=?1 AND id=?2').bind(tenant.id, body.id).run();
    return jsonResponse({ success: true });
  }
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);
  if (!Number.isSafeInteger(body.professionalId) || !validLocalDate(body.startsAt) || !validLocalDate(body.endsAt)
    || body.startsAt >= body.endsAt) return jsonResponse({ error: 'Informe profissional, início e término válidos (horário de Brasília).' }, 400);
  const professional = await getProfessionalById(env.DB, tenant.id, body.professionalId);
  if (!professional || !professional.active) return jsonResponse({ error: 'Profissional não encontrado ou inativo.' }, 400);
  const result = await env.DB.prepare('INSERT INTO appointment_blocks (tenant_id,professional_id,starts_at,ends_at) VALUES (?1,?2,?3,?4)')
    .bind(tenant.id, body.professionalId, body.startsAt.replace('T',' '), body.endsAt.replace('T',' ')).run();
  return jsonResponse({ success: true, id: result.meta.last_row_id }, 201);
}
