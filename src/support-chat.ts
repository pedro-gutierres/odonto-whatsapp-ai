import type { ChatTurn } from './claude';
import { askPatientSimulation, askSupportAssistant, redactSupportText } from './support-ai';
import { tenantConfig } from './access';
import { isCrucialConfigComplete } from './db';
import { jsonResponse } from './http';
import {
  ensureSupportThread, getActiveSupportThread, getSupportMessages, getSupportState,
  resetSupportThread, supportBody, supportResponse, type SupportPrincipal,
} from './support-store';
import type { Env, Tenant } from './types';

type SupportBusiness = { tenant: Tenant; user: { id: number }; canManage: boolean };
type RequestKind = 'support' | 'simulation';
type Reservation = { principal: SupportPrincipal; id: string; lease: string };
type StoredRequest = {
  kind: RequestKind;
  thread_id: string | null;
  payload_hash: string;
  status: 'pending' | 'completed' | 'failed';
  lease_until: number;
  reply: string | null;
};

const REQUEST_LEASE_MS = 45_000;
const MAX_MESSAGE_CHARS = 2_000;
const REQUEST_FIELDS = 'tenant_id=?1 AND user_id=?2 AND access_level=?3 AND request_id=?4';

function supportPrincipal(business: SupportBusiness): SupportPrincipal {
  return { tenantId: business.tenant.id, userId: business.user.id, canSimulate: business.canManage };
}

async function payloadHash(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
}

function readRequest(db: D1Database, principal: SupportPrincipal, requestId: string) {
  return db.prepare(`SELECT kind,thread_id,payload_hash,status,lease_until,reply FROM support_chat_requests WHERE ${REQUEST_FIELDS}`)
    .bind(principal.tenantId, principal.userId, Number(principal.canSimulate), requestId).first<StoredRequest>();
}

function threadChanged() {
  return supportResponse({ error: 'A conversa mudou. Abra a conversa atual e tente novamente.', code: 'SUPPORT_THREAD_CHANGED' }, 409);
}

function pending() {
  return jsonResponse({ error: 'Sua mensagem está sendo processada. Tente novamente em alguns segundos.', code: 'REQUEST_PENDING' },
    409, { 'Cache-Control': 'no-store', 'Retry-After': '3' });
}

function temporarilyLimited(seconds: number) {
  return jsonResponse({ error: 'Aguarde um pouco e tente novamente.', code: 'SUPPORT_TEMPORARILY_LIMITED' },
    429, { 'Cache-Control': 'no-store', 'Retry-After': String(seconds) });
}

function unavailable(messageSaved: boolean) {
  return supportResponse({
    error: 'A IA está indisponível no momento. Tente novamente em instantes.', code: 'AI_UNAVAILABLE', messageSaved,
  }, 502);
}

export async function handleSupport(request: Request, env: Env, business: SupportBusiness) {
  const url = new URL(request.url);
  const principal = supportPrincipal(business);
  try {
    if (url.pathname === '/api/support' && request.method === 'GET') {
      const cursor = url.searchParams.get('before');
      const before = cursor === null ? undefined : Number(cursor);
      if (before !== undefined && (!Number.isSafeInteger(before) || before < 1)) {
        return supportResponse({ error: 'Página inválida.' }, 400);
      }
      return supportResponse(await getSupportState(env.DB, principal, business.tenant, before));
    }
    if (request.method === 'POST') {
      if (url.pathname === '/api/support/reset') return await resetSupportThread(request, env.DB, principal, business.tenant);
      if (url.pathname === '/api/support/chat' || url.pathname === '/api/support/simulation') {
        const kind = url.pathname === '/api/support/simulation' ? 'simulation' : 'support';
        return await handleSupportChat(request, env, business, principal, kind);
      }
    }
    return supportResponse({ error: 'Rota de suporte indisponível.' }, 404);
  } catch {
    console.error('[SUPPORT] request could not be completed');
    return supportResponse({ error: 'Não foi possível acessar o suporte agora. Tente novamente.' }, 503);
  }
}

async function handleSupportChat(request: Request, env: Env, business: SupportBusiness, principal: SupportPrincipal, kind: RequestKind) {
  const body = await supportBody(request, kind === 'simulation' ? 96_000 : 16_000);
  if (body instanceof Response) return body;
  const requestId = body.requestId;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const requestedThread = body.threadId ?? null;
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)
    || !message || message.length > MAX_MESSAGE_CHARS
    || (requestedThread !== null && (typeof requestedThread !== 'string' || requestedThread.length > 100))) {
    return supportResponse({ error: 'Envie uma mensagem válida com até 2.000 caracteres.' }, 400);
  }
  if (kind === 'simulation' && !principal.canSimulate) return supportResponse({ error: 'Acesso permitido apenas ao administrador.' }, 403);
  if (kind === 'simulation' && !isCrucialConfigComplete(tenantConfig(business.tenant))) {
    return supportResponse({ error: 'Preencha e salve os Parâmetros para simular o atendimento.', code: 'TRAINING_REQUIRED' }, 409);
  }

  const safeMessage = redactSupportText(message);
  const simulationHistory: ChatTurn[] = Array.isArray(body.history) && kind === 'simulation'
    ? body.history.slice(-12).flatMap(turn => turn && (turn.role === 'user' || turn.role === 'assistant')
      && typeof turn.content === 'string' && turn.content.trim()
      ? [{ role: turn.role, content: redactSupportText(turn.content.trim().slice(0, MAX_MESSAGE_CHARS)) }] : [])
    : [];
  const hash = await payloadHash([kind, requestedThread, safeMessage, simulationHistory]);
  const existing = await readRequest(env.DB, principal, requestId);
  if (existing && (existing.kind !== kind || existing.payload_hash !== hash)) {
    return supportResponse({ error: 'Identificador já usado para outra mensagem.', code: 'REQUEST_MISMATCH' }, 409);
  }
  const activeThread = kind === 'support' ? await getActiveSupportThread(env.DB, principal) : null;
  if ((existing?.thread_id && activeThread?.id !== existing.thread_id)
    || (requestedThread && activeThread?.id !== requestedThread)) return threadChanged();
  if (existing?.status === 'completed') {
    if (kind === 'simulation') return supportResponse({ reply: existing.reply });
    return supportResponse(await getSupportState(env.DB, principal, business.tenant));
  }
  const now = Date.now();
  if (existing?.status === 'pending' && existing.lease_until > now) return pending();
  const thread = kind === 'support' ? activeThread ?? await ensureSupportThread(env.DB, principal) : null;
  if (existing && thread) {
    const latest = await env.DB.prepare(`SELECT request_id FROM support_messages
      WHERE thread_id=?1 AND role='user' ORDER BY id DESC LIMIT 1`).bind(thread.id).first<string>('request_id');
    if (latest !== requestId) return threadChanged();
  }
  const reservation: Reservation = { principal, id: requestId, lease: crypto.randomUUID() };
  try {
    const operation = existing
      ? env.DB.prepare(`UPDATE support_chat_requests SET status=?5,lease=?6,lease_until=?7,updated_at=?8
          WHERE ${REQUEST_FIELDS} AND (status='failed' OR (status='pending' AND lease_until<=?8))
          AND (thread_id IS NULL OR EXISTS(SELECT 1 FROM support_threads th WHERE th.id=thread_id AND th.active=1))
          AND EXISTS(SELECT 1 FROM users u JOIN tenants t ON t.id=u.tenant_id WHERE u.id=?2 AND t.id=?1
            AND u.active=1 AND t.active=1 AND u.role IN ('admin','staff') AND (u.role='admin')=?3)`)
        .bind(principal.tenantId, principal.userId, Number(principal.canSimulate), requestId,
          'pending', reservation.lease, now + REQUEST_LEASE_MS, now)
      : env.DB.prepare(`INSERT INTO support_chat_requests
          (tenant_id,user_id,access_level,request_id,kind,thread_id,payload_hash,message,status,lease,lease_until,updated_at)
          VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
          ON CONFLICT(tenant_id,user_id,access_level,request_id) DO NOTHING`)
        .bind(principal.tenantId, principal.userId, Number(principal.canSimulate), requestId, kind, thread?.id ?? null,
          hash, kind === 'support' ? safeMessage : null, 'pending',
          reservation.lease, now + REQUEST_LEASE_MS, now);
    if (!(await operation.run()).meta.changes) return pending();
  } catch (error) {
    const reason = String(error);
    if (reason.includes('SUPPORT_BUSY')) {
      const current = await readRequest(env.DB, principal, requestId);
      return current ? pending() : temporarilyLimited(3);
    }
    if (reason.includes('SUPPORT_RATE_LIMIT')) return temporarilyLimited(60);
    if (reason.includes('SUPPORT_THREAD_CHANGED')) return threadChanged();
    if (reason.includes('SUPPORT_ACCESS_CHANGED')) return supportResponse({ error: 'A sessão ou o acesso mudou.' }, 403);
    throw error;
  }

  try {
    const result = thread
      ? await askSupportAssistant(env,
        (await getSupportMessages(env.DB, thread.id, 12))
          .map(turn => ({ role: turn.role, content: turn.content })))
      : await askPatientSimulation(env, business.tenant, [...simulationHistory, { role: 'user', content: safeMessage }]);
    const reply = result.trim();
    if (!reply) throw new Error('SUPPORT_EMPTY_REPLY');
    const updated = await env.DB.prepare(`UPDATE support_chat_requests SET status='completed',updated_at=?6,reply=?7
      WHERE ${REQUEST_FIELDS} AND lease=?5 AND status='pending'
        AND (thread_id IS NULL OR EXISTS(SELECT 1 FROM support_threads th WHERE th.id=thread_id AND th.active=1))
        AND EXISTS(SELECT 1 FROM users u JOIN tenants t ON t.id=u.tenant_id WHERE u.id=?2 AND t.id=?1
          AND u.active=1 AND t.active=1 AND u.role IN ('admin','staff') AND (u.role='admin')=?3)`)
      .bind(principal.tenantId, principal.userId, Number(principal.canSimulate), requestId, reservation.lease,
        Date.now(), reply).run();
    if (!updated.meta.changes) {
      await failRequest(env.DB, reservation);
      return threadChanged();
    }
    if (kind === 'simulation') return supportResponse({ reply });
    return supportResponse(await getSupportState(env.DB, principal, business.tenant));
  } catch {
    await failRequest(env.DB, reservation);
    console.warn('[SUPPORT_CHAT] response unavailable', kind);
    return unavailable(Boolean(thread));
  }
}

function failRequest(db: D1Database, { principal, id, lease }: Reservation) {
  return db.prepare(`UPDATE support_chat_requests SET status='failed',updated_at=?6
    WHERE ${REQUEST_FIELDS} AND status='pending' AND lease=?5`)
    .bind(principal.tenantId, principal.userId, Number(principal.canSimulate), id, lease, Date.now()).run();
}

export async function purgeExpiredSupportData(db: D1Database, now = Date.now()) {
  await db.batch([
    db.prepare(`DELETE FROM support_threads WHERE id IN (
      SELECT id FROM support_threads WHERE updated_at<?1 ORDER BY updated_at LIMIT 100)`)
      .bind(new Date(now - 90 * 86_400_000).toISOString()),
    db.prepare('DELETE FROM support_chat_attempts WHERE rowid IN (SELECT rowid FROM support_chat_attempts WHERE at<?1 LIMIT 1000)').bind(now - 10 * 60_000),
    db.prepare(`DELETE FROM support_chat_requests WHERE rowid IN (
      SELECT rowid FROM support_chat_requests WHERE updated_at<?1 AND thread_id IS NULL LIMIT 1000)`)
      .bind(now - 24 * 60 * 60_000),
  ]);
}
