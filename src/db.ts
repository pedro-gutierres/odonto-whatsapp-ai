// Tudo que lê e escreve no banco (D1). Toda consulta passa por tenant_id:
// é isso que impede a conversa de uma clínica de aparecer em outra.
import type { InboundJob, Tenant } from "./types";
import type { ChatTurn } from "./claude";

export async function getTenantByPhoneNumberId(db: D1Database, phoneNumberId: string): Promise<Tenant | null> {
  return db
    .prepare("SELECT * FROM tenants WHERE phone_number_id = ?1")
    .bind(phoneNumberId)
    .first<Tenant>();
}

// Grava a mensagem recebida. A Meta às vezes entrega a mesma mensagem duas vezes;
// o campo único wa_message_id evita responder em dobro.
//  "new"   -> primeira vez: processar
//  "retry" -> já existia mas ainda sem resposta (falhou antes): processar de novo
//  "done"  -> já respondida: ignorar
export async function claimInbound(db: D1Database, tenantId: string, job: InboundJob): Promise<"new" | "retry" | "done"> {
  const r = await db
    .prepare(
      `INSERT OR IGNORE INTO messages (tenant_id, contact_wa_id, contact_name, direction, wa_message_id, body)
       VALUES (?1, ?2, ?3, 'in', ?4, ?5)`,
    )
    .bind(tenantId, job.from, job.contactName ?? null, job.waMessageId, job.text)
    .run();

  if (r.meta.changes === 1) return "new";

  const row = await db
    .prepare("SELECT status FROM messages WHERE wa_message_id = ?1")
    .bind(job.waMessageId)
    .first<{ status: string }>();
  return row?.status === "answered" ? "done" : "retry";
}

// Últimas mensagens da conversa, no formato que o Claude espera.
export async function loadHistory(db: D1Database, tenantId: string, contact: string, limit = 20): Promise<ChatTurn[]> {
  const { results } = await db
    .prepare(
      `SELECT direction, body FROM messages
       WHERE tenant_id = ?1 AND contact_wa_id = ?2 AND body IS NOT NULL
       ORDER BY id DESC LIMIT ?3`,
    )
    .bind(tenantId, contact, limit)
    .all<{ direction: "in" | "out"; body: string }>();

  const turns: ChatTurn[] = results
    .reverse()
    .map((m) => ({ role: m.direction === "in" ? "user" : "assistant", content: m.body }));

  // O Claude exige que a conversa comece com uma fala do usuário.
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

export async function saveOutbound(
  db: D1Database,
  tenantId: string,
  contact: string,
  body: string,
  waMessageId: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO messages (tenant_id, contact_wa_id, direction, wa_message_id, body, status)
       VALUES (?1, ?2, 'out', ?3, ?4, 'sent')`,
    )
    .bind(tenantId, contact, waMessageId, body)
    .run();
}

export async function markAnswered(db: D1Database, waMessageId: string): Promise<void> {
  await db.prepare("UPDATE messages SET status = 'answered' WHERE wa_message_id = ?1").bind(waMessageId).run();
}
