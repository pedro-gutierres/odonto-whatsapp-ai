import { tenantConfig } from './access';
import { isCrucialConfigComplete } from './db';
import { jsonResponse } from './http';
import type { Tenant } from './types';

export interface SupportPrincipal {
  tenantId: string;
  userId: number;
  canSimulate: boolean;
}

export interface SupportThread {
  id: string;
}

export interface SupportMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export function supportResponse(data: unknown, status = 200) {
  return jsonResponse(data, status, { 'Cache-Control': 'no-store' });
}

export async function supportBody(request: Request, maxBytes = 8192): Promise<Record<string, unknown> | Response> {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return supportResponse({ error: 'Origem da solicitação inválida.' }, 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return supportResponse({ error: 'Envie os dados em JSON.' }, 415);
  }
  if (Number(request.headers.get('content-length')) > maxBytes) {
    return supportResponse({ error: 'Solicitação muito grande.' }, 413);
  }
  const reader = request.body?.getReader();
  if (!reader) return supportResponse({ error: 'JSON inválido.' }, 400);
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
  try {
    let text = '';
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > maxBytes) {
        await reader.cancel();
        return supportResponse({ error: 'Solicitação muito grande.' }, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    const data: unknown = JSON.parse(text + decoder.decode());
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>;
  } catch {
    await reader.cancel().catch(() => undefined);
  } finally {
    reader.releaseLock();
  }
  return supportResponse({ error: 'JSON inválido.' }, 400);
}

export function getActiveSupportThread(db: D1Database, { tenantId, userId, canSimulate }: SupportPrincipal) {
  return db.prepare(`SELECT th.id
    FROM support_threads th JOIN users u ON u.id=th.user_id AND u.tenant_id=th.tenant_id
    JOIN tenants tn ON tn.id=th.tenant_id
    WHERE th.tenant_id=?1 AND th.user_id=?2 AND th.access_level=?3 AND th.active=1
      AND u.active=1 AND tn.active=1 AND u.role IN ('admin','staff') AND (u.role='admin')=?3`)
    .bind(tenantId, userId, Number(canSimulate)).first<SupportThread>();
}

export async function ensureSupportThread(db: D1Database, principal: SupportPrincipal) {
  const existing = await getActiveSupportThread(db, principal);
  if (existing) return existing;
  await db.prepare(`INSERT INTO support_threads(id,tenant_id,user_id,access_level)
    SELECT ?1,tn.id,u.id,?4 FROM users u JOIN tenants tn ON tn.id=u.tenant_id
    WHERE tn.id=?2 AND u.id=?3 AND u.active=1 AND tn.active=1 AND u.role IN ('admin','staff') AND (u.role='admin')=?4
    ON CONFLICT(tenant_id,user_id,access_level) WHERE active=1 DO NOTHING`)
    .bind(crypto.randomUUID(), principal.tenantId, principal.userId, Number(principal.canSimulate)).run();
  const thread = await getActiveSupportThread(db, principal);
  if (!thread) throw new Error('SUPPORT_THREAD_UNAVAILABLE');
  return thread;
}

export async function getSupportMessages(db: D1Database, threadId: string, limit = 100, before?: number) {
  const { results } = await db.prepare(`SELECT CAST(id AS TEXT) AS id,role,content,created_at AS createdAt
    FROM support_messages WHERE thread_id=?1 AND (?3 IS NULL OR id<?3) ORDER BY id DESC LIMIT ?2`)
    .bind(threadId, limit, before ?? null).all<SupportMessage>();
  return results.reverse();
}

export async function getSupportState(db: D1Database, principal: SupportPrincipal, tenant: Tenant, before?: number) {
  const thread = await getActiveSupportThread(db, principal);
  const messages = thread ? await getSupportMessages(db, thread.id, 101, before) : [];
  const hasMore = messages.length > 100;
  if (hasMore) messages.shift();
  return {
    threadId: thread?.id ?? null, messages, canSimulate: principal.canSimulate,
    simulationReady: principal.canSimulate && isCrucialConfigComplete(tenantConfig(tenant)),
    before: hasMore ? messages[0].id : null,
  };
}

export async function resetSupportThread(request: Request, db: D1Database, principal: SupportPrincipal, tenant: Tenant) {
  const body = await supportBody(request);
  if (body instanceof Response) return body;
  const current = await getActiveSupportThread(db, principal);
  if (body.threadId !== (current?.id ?? null)) {
    return supportResponse({ error: 'Abra a conversa atual para reiniciar.' }, 409);
  }
  if (current) {
    await db.prepare('UPDATE support_threads SET active=0 WHERE id=?1 AND active=1').bind(current.id).run();
  }
  return supportResponse(await getSupportState(db, principal, tenant));
}
