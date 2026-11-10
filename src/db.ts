// Tudo que lê e escreve no banco (D1). Toda consulta passa por tenant_id:
// é isso que impede a conversa de uma clínica de aparecer em outra.
import type { InboundJob, Tenant, ConversationSummary, ConversationMessage, BotConfig } from "./types";
import type { ChatTurn } from "./claude";

export async function getTenantByPhoneNumberId(db: D1Database, phoneNumberId: string): Promise<Tenant | null> {
  return db
    .prepare("SELECT * FROM tenants WHERE phone_number_id = ?1")
    .bind(phoneNumberId)
    .first<Tenant>();
}

// Garante que a tabela de controle de intervenção humana (Pausar IA) existe se necessário
export async function ensureConversationStateTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS conversation_states (
        tenant_id TEXT NOT NULL,
        contact_wa_id TEXT NOT NULL,
        ai_paused INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (tenant_id, contact_wa_id)
      );`
    )
    .run();
}

export async function isAiPaused(db: D1Database, tenantId: string, contact: string): Promise<boolean> {
  await ensureConversationStatesTable(db);
  const row = await db
    .prepare("SELECT ai_paused FROM conversation_states WHERE tenant_id = ?1 AND contact_wa_id = ?2")
    .bind(tenantId, contact)
    .first<{ ai_paused: number }>();
  return row?.ai_paused === 1;
}

export async function setAiPaused(db: D1Database, tenantId: string, contact: string, paused: boolean): Promise<void> {
  await ensureConversationStatesTable(db);
  await db
    .prepare(
      `INSERT INTO conversation_states (tenant_id, contact_wa_id, ai_paused, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'))
       ON CONFLICT(tenant_id, contact_wa_id) DO UPDATE SET ai_paused = excluded.ai_paused, updated_at = datetime('now')`,
    )
    .bind(tenantId, contact, paused ? 1 : 0)
    .run();
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

export async function saveHumanOutbound(
  db: D1Database,
  tenantId: string,
  contact: string,
  body: string,
  waMessageId: string | null = null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO messages (tenant_id, contact_wa_id, direction, wa_message_id, body, status)
       VALUES (?1, ?2, 'out', ?3, ?4, 'human')`,
    )
    .bind(tenantId, contact, waMessageId ?? `human_${Date.now()}`, body)
    .run();
}

export async function markAnswered(db: D1Database, waMessageId: string): Promise<void> {
  await db.prepare("UPDATE messages SET status = 'answered' WHERE wa_message_id = ?1").bind(waMessageId).run();
}

// Lista todas as conversas do tenant para a coluna da esquerda da recepcionista
export async function listConversations(db: D1Database, tenantId: string): Promise<ConversationSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT 
         m.contact_wa_id,
         COALESCE(names.contact_name, m.contact_name, m.contact_wa_id) as contact_name,
         m.body as last_body,
         m.direction as last_direction,
         m.status as last_status,
         m.created_at as last_created_at,
         COALESCE(cs.ai_paused, 0) as ai_paused,
         latest.total_count as message_count
       FROM messages m
       INNER JOIN (
         SELECT contact_wa_id, MAX(id) as max_id, COUNT(id) as total_count
         FROM messages
         WHERE tenant_id = ?1
         GROUP BY contact_wa_id
       ) latest ON m.id = latest.max_id
       LEFT JOIN (
         SELECT contact_wa_id, contact_name
         FROM messages
         WHERE tenant_id = ?1 AND contact_name IS NOT NULL AND contact_name != ''
         GROUP BY contact_wa_id
       ) names ON m.contact_wa_id = names.contact_wa_id
       LEFT JOIN conversation_states cs 
         ON cs.tenant_id = m.tenant_id AND cs.contact_wa_id = m.contact_wa_id
       ORDER BY m.id DESC;`
    )
    .bind(tenantId)
    .all<ConversationSummary>();

  return results;
}

export interface SyncState {
  latestId: number;
  activeLatestId: number;
  activeAiPaused: boolean;
}

// Checagem ultra-leve de 1 linha de leitura no D1 (substitui polling pesado)
export async function getSyncState(
  db: D1Database,
  tenantId: string,
  activeContact: string | null = null,
): Promise<SyncState> {
  if (activeContact) {
    const row = await db
      .prepare(
        `SELECT 
           COALESCE(MAX(m.id), 0) as latest_id,
           COALESCE(MAX(CASE WHEN m.contact_wa_id = ?2 THEN m.id ELSE 0 END), 0) as active_latest_id,
           COALESCE((SELECT cs.ai_paused FROM conversation_states cs WHERE cs.tenant_id = ?1 AND cs.contact_wa_id = ?2), 0) as active_ai_paused
         FROM messages m
         WHERE m.tenant_id = ?1;`
      )
      .bind(tenantId, activeContact)
      .first<{ latest_id: number; active_latest_id: number; active_ai_paused: number }>();

    return {
      latestId: row?.latest_id ?? 0,
      activeLatestId: row?.active_latest_id ?? 0,
      activeAiPaused: row?.active_ai_paused === 1,
    };
  }

  const row = await db
    .prepare("SELECT COALESCE(MAX(id), 0) as latest_id FROM messages WHERE tenant_id = ?1")
    .bind(tenantId)
    .first<{ latest_id: number }>();

  return {
    latestId: row?.latest_id ?? 0,
    activeLatestId: 0,
    activeAiPaused: false,
  };
}

// Retorna todas as mensagens de um contato específico
export async function getConversationMessages(
  db: D1Database,
  tenantId: string,
  contact: string,
  limit = 100,
): Promise<ConversationMessage[]> {
  const { results } = await db
    .prepare(
      `SELECT id, tenant_id, contact_wa_id, contact_name, direction, body, status, created_at
       FROM messages
       WHERE tenant_id = ?1 AND contact_wa_id = ?2
       ORDER BY id ASC
       LIMIT ?3`,
    )
    .bind(tenantId, contact, limit)
    .all<ConversationMessage>();

  return results;
}

export async function clearConversation(db: D1Database, tenantId: string, contact: string): Promise<void> {
  await db
    .prepare("DELETE FROM messages WHERE tenant_id = ?1 AND contact_wa_id = ?2")
    .bind(tenantId, contact)
    .run();
}

// -----------------------------------------------------------------------------
// GESTÃO DE USUÁRIOS & AGENDAMENTOS (CRM & AUTH)
// -----------------------------------------------------------------------------
export interface UserRecord {
  id: number;
  tenant_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
}

export interface AppointmentRecord {
  id: number;
  tenant_id: string;
  contact_wa_id: string;
  patient_name: string;
  procedure: string | null;
  scheduled_at: string;
  status: "pre_agendado" | "confirmado" | "concluido" | "cancelado";
  notes: string | null;
  created_at: string;
}

export async function ensureAuthAndAppointments(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id     TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name          TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'admin',
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS appointments (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id     TEXT NOT NULL,
        contact_wa_id TEXT NOT NULL,
        patient_name  TEXT NOT NULL,
        procedure     TEXT,
        scheduled_at  TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'pre_agendado',
        notes         TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );`
    )
    .run();

  // Verifica se o usuário padrão de Pedro existe
  const user = await db.prepare("SELECT id FROM users LIMIT 1").first();
  if (!user) {
    // Senha padrão inicial para testes: 'admin123'
    // Hash SHA-256 de "admin123:odonto_salt_2026"
    const defaultHash = "219f1b54263a28a320ddb777b89011a54d75d32bc5d0e6b20b9fdbdc02d61876";
    await db
      .prepare(
        `INSERT OR IGNORE INTO users (tenant_id, email, password_hash, name, role)
         VALUES 
         ('lab', 'pedrogutierres@protonmail.com', ?1, 'Pedro Gutierres', 'admin'),
         ('lab', 'admin@clinica.com', ?1, 'Dra. Fernanda (Admin)', 'admin');`
      )
      .bind(defaultHash)
      .run();

    // Cria agendamentos iniciais de exemplo para a clínica
    await db
      .prepare(
        `INSERT OR IGNORE INTO appointments (tenant_id, contact_wa_id, patient_name, procedure, scheduled_at, status, notes)
         VALUES 
         ('lab', '5511988881234', 'Mariana Silveira', 'Botox / Toxina Botulínica', 'Sábado às 10:00', 'confirmado', 'Agendado automaticamente pela Secretária IA Claude 24h'),
         ('lab', '5521973401655', 'Pedro (Paciente Teste)', 'Avaliação Geral & Clareamento', 'Quarta-feira às 15:30', 'pre_agendado', 'Paciente aguardando confirmação de encaixe');`
      )
      .run();
  }
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRecord | null> {
  return db.prepare("SELECT * FROM users WHERE email = ?1").bind(email.toLowerCase().trim()).first<UserRecord>();
}

export async function listAppointments(db: D1Database, tenantId: string): Promise<AppointmentRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM appointments 
       WHERE tenant_id = ?1 
       ORDER BY id DESC LIMIT 100`
    )
    .bind(tenantId)
    .all<AppointmentRecord>();
  return results;
}

export async function createAppointment(
  db: D1Database,
  tenantId: string,
  contactWaId: string,
  patientName: string,
  procedure: string,
  scheduledAt: string,
  status: string = "pre_agendado",
  notes: string = ""
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO appointments (tenant_id, contact_wa_id, patient_name, procedure, scheduled_at, status, notes)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(tenantId, contactWaId, patientName, procedure, scheduledAt, status, notes)
    .run();
}

export async function updateAppointmentStatus(
  db: D1Database,
  tenantId: string,
  id: number,
  status: string
): Promise<void> {
  await db
    .prepare("UPDATE appointments SET status = ?1 WHERE id = ?2 AND tenant_id = ?3")
    .bind(status, id, tenantId)
    .run();
}

export async function getTenantConfig(db: D1Database, tenantId: string): Promise<BotConfig | null> {
  const row = await db
    .prepare("SELECT bot_config FROM tenants WHERE id = ?1")
    .bind(tenantId)
    .first<{ bot_config: string }>();
  if (!row || !row.bot_config) return null;
  try {
    return JSON.parse(row.bot_config) as BotConfig;
  } catch {
    return null;
  }
}

export async function updateTenantConfig(
  db: D1Database,
  tenantId: string,
  config: BotConfig
): Promise<void> {
  const configJson = JSON.stringify(config);
  await db
    .prepare(
      `INSERT INTO tenants (id, name, phone_number_id, bot_config, active)
       VALUES (?1, ?2, '1459702903890342', ?3, 1)
       ON CONFLICT(id) DO UPDATE SET bot_config = excluded.bot_config, name = excluded.name`
    )
    .bind(tenantId, config.clinic_name || "Clínica Sorriso & Estética", configJson)
    .run();
}
