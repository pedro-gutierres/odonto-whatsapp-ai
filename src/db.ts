// Tudo que lê e escreve no banco (D1). Toda consulta passa por tenant_id:
// é isso que impede a conversa de uma clínica de aparecer em outra.
import type {
  InboundJob,
  Tenant,
  ConversationSummary,
  ConversationMessage,
  BotConfig,
  ProfessionalRecord,
  ClinicUserSummary,
  TenantTrialInfo,
} from "./types";
import type { ChatTurn } from "./claude";

export async function getTenantByPhoneNumberId(db: D1Database, phoneNumberId: string): Promise<Tenant | null> {
  return db
    .prepare("SELECT * FROM tenants WHERE phone_number_id = ?1")
    .bind(phoneNumberId)
    .first<Tenant>();
}

export async function getTenantById(db: D1Database, tenantId: string): Promise<Tenant | null> {
  return db
    .prepare("SELECT * FROM tenants WHERE id = ?1")
    .bind(tenantId)
    .first<Tenant>();
}

export function isConfiguredPhoneNumberId(phoneNumberId?: string | null): boolean {
  const trimmed = phoneNumberId?.trim();
  return Boolean(trimmed && !trimmed.startsWith("unconfigured:"));
}

// Garante criação idempotente da tabela conversation_states (usado apenas na inicialização manual /api/init-perf)
export async function ensureConversationStatesTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS conversation_states (
        tenant_id TEXT NOT NULL,
        contact_wa_id TEXT NOT NULL,
        ai_paused INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (tenant_id, contact_wa_id)
      );`,
    )
    .run();
}
export const ensureConversationStateTable = ensureConversationStatesTable;

export async function isAiPaused(db: D1Database, tenantId: string, contact: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT ai_paused FROM conversation_states WHERE tenant_id = ?1 AND contact_wa_id = ?2")
    .bind(tenantId, contact)
    .first<{ ai_paused: number }>();
  return row?.ai_paused === 1;
}

export async function setAiPaused(db: D1Database, tenantId: string, contact: string, paused: boolean): Promise<void> {
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

export async function getInboundMessageByWaId(
  db: D1Database,
  waMessageId: string,
): Promise<{ body: string | null; media_key: string | null; media_mime: string | null; media_type: string | null } | null> {
  return db
    .prepare("SELECT body, media_key, media_mime, media_type FROM messages WHERE wa_message_id = ?1")
    .bind(waMessageId)
    .first<{ body: string | null; media_key: string | null; media_mime: string | null; media_type: string | null }>();
}

export async function updateInboundMessageMediaAndBody(
  db: D1Database,
  waMessageId: string,
  body: string | null,
  mediaKey: string | null,
  mediaMime: string | null,
  mediaType: string | null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE messages
       SET body = ?2, media_key = ?3, media_mime = ?4, media_type = ?5
       WHERE wa_message_id = ?1`,
    )
    .bind(waMessageId, body, mediaKey, mediaMime, mediaType)
    .run();
}

export async function getMessageMediaForTenant(
  db: D1Database,
  tenantId: string,
  msgId: number,
): Promise<{ id: number; media_key: string | null; media_mime: string | null; media_type: string | null; created_at: string } | null> {
  return db
    .prepare(
      `SELECT id, media_key, media_mime, media_type, created_at
       FROM messages
       WHERE id = ?1 AND tenant_id = ?2`,
    )
    .bind(msgId, tenantId)
    .first<{ id: number; media_key: string | null; media_mime: string | null; media_type: string | null; created_at: string }>();
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
  const fallbackId = `human_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  await db
    .prepare(
      `INSERT INTO messages (tenant_id, contact_wa_id, direction, wa_message_id, body, status)
       VALUES (?1, ?2, 'out', ?3, ?4, 'human')`,
    )
    .bind(tenantId, contact, waMessageId ?? fallbackId, body)
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
      `SELECT id, tenant_id, contact_wa_id, contact_name, direction, body, status, media_key, media_mime, media_type, created_at
       FROM messages
       WHERE tenant_id = ?1 AND contact_wa_id = ?2
       ORDER BY id ASC
       LIMIT ?3`,
    )
    .bind(tenantId, contact, limit)
    .all<ConversationMessage>();

  return results;
}

export async function clearConversation(db: D1Database, tenantId: string, contact: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT media_key FROM messages WHERE tenant_id = ?1 AND contact_wa_id = ?2 AND media_key IS NOT NULL")
    .bind(tenantId, contact)
    .all<{ media_key: string }>();

  await db
    .prepare("DELETE FROM messages WHERE tenant_id = ?1 AND contact_wa_id = ?2")
    .bind(tenantId, contact)
    .run();

  return (results || []).map((r) => r.media_key).filter(Boolean);
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
  active?: number;
  created_at: string;
}

export interface AppointmentRecord {
  id: number;
  tenant_id: string;
  contact_wa_id: string;
  patient_name: string;
  procedure: string | null;
  scheduled_at: string;
  status: "agendado" | "pre_agendado" | "confirmado" | "concluido" | "cancelado";
  duration?: string;
  notes: string | null;
  professional_id?: number | null;
  professional_name?: string | null;
  confirmed_at?: string;
  confirmed_by?: "human" | "ai" | string;
  created_at: string;
}

// Rotina explícita de inicialização de schema e índices (executada apenas via migrations ou /api/init-perf)
export async function ensureAuthAndAppointments(db: D1Database): Promise<void> {
  await ensureConversationStatesTable(db);
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
        status        TEXT NOT NULL DEFAULT 'agendado',
        notes         TEXT,
        duration      TEXT DEFAULT '30 min',
        confirmed_at  TEXT,
        confirmed_by  TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS professionals (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id       TEXT NOT NULL REFERENCES tenants(id),
        name            TEXT NOT NULL,
        specialty       TEXT,
        cro_crm         TEXT,
        working_days    TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
        start_hour      TEXT NOT NULL DEFAULT '08:00',
        end_hour        TEXT NOT NULL DEFAULT '18:00',
        break_start     TEXT DEFAULT '12:00',
        break_end       TEXT DEFAULT '13:00',
        procedures_json TEXT NOT NULL DEFAULT '[]',
        color           TEXT NOT NULL DEFAULT '#10b981',
        active          INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );`
    )
    .run();

  await db.prepare("CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages (tenant_id, id);").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments (tenant_id, scheduled_at);").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_professionals_tenant ON professionals (tenant_id, active);").run();

  // Verifica colunas via PRAGMA antes de alterar (sem gerar erros propositais no D1)
  const cols = await db.prepare("PRAGMA table_info(appointments)").all<{ name: string }>();
  const existingCols = new Set((cols.results || []).map((c) => c.name));
  if (!existingCols.has("duration")) {
    await db.prepare("ALTER TABLE appointments ADD COLUMN duration TEXT DEFAULT '30 min';").run();
  }
  if (!existingCols.has("confirmed_at")) {
    await db.prepare("ALTER TABLE appointments ADD COLUMN confirmed_at TEXT;").run();
  }
  if (!existingCols.has("confirmed_by")) {
    await db.prepare("ALTER TABLE appointments ADD COLUMN confirmed_by TEXT;").run();
  }
  if (!existingCols.has("professional_id")) {
    await db.prepare("ALTER TABLE appointments ADD COLUMN professional_id INTEGER;").run();
  }
  if (!existingCols.has("professional_name")) {
    await db.prepare("ALTER TABLE appointments ADD COLUMN professional_name TEXT;").run();
  }

  const msgCols = await db.prepare("PRAGMA table_info(messages)").all<{ name: string }>();
  const existingMsgCols = new Set((msgCols.results || []).map((c) => c.name));
  if (!existingMsgCols.has("media_key")) {
    await db.prepare("ALTER TABLE messages ADD COLUMN media_key TEXT;").run();
  }
  if (!existingMsgCols.has("media_mime")) {
    await db.prepare("ALTER TABLE messages ADD COLUMN media_mime TEXT;").run();
  }
  if (!existingMsgCols.has("media_type")) {
    await db.prepare("ALTER TABLE messages ADD COLUMN media_type TEXT;").run();
  }

  const tenantCols = await db.prepare("PRAGMA table_info(tenants)").all<{ name: string }>();
  const existingTenantCols = new Set((tenantCols.results || []).map((c) => c.name));
  const tenantAdditions = [
    "legal_name",
    "cnpj",
    "admin_phone",
    "responsible_name",
    "contact_email",
    "wa_display_phone",
    "wa_verified_name",
    "wa_connected_at",
  ];
  for (const col of tenantAdditions) {
    if (!existingTenantCols.has(col)) {
      await db.prepare(`ALTER TABLE tenants ADD COLUMN ${col} TEXT;`).run();
    }
  }

  // Milestone 1 (Etapa 3): Colunas de controle de plano e limites de trial
  if (!existingTenantCols.has("plan_status")) {
    await db
      .prepare(
        "ALTER TABLE tenants ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'trial' CHECK (plan_status IN ('trial', 'active', 'past_due', 'canceled'));"
      )
      .run();
  }
  if (!existingTenantCols.has("trial_ends_at")) {
    await db.prepare("ALTER TABLE tenants ADD COLUMN trial_ends_at TEXT;").run();
  }
  if (!existingTenantCols.has("trial_messages_used")) {
    await db.prepare("ALTER TABLE tenants ADD COLUMN trial_messages_used INTEGER NOT NULL DEFAULT 0;").run();
  }
  if (!existingTenantCols.has("trial_messages_limit")) {
    await db.prepare("ALTER TABLE tenants ADD COLUMN trial_messages_limit INTEGER NOT NULL DEFAULT 100;").run();
  }
  if (!existingTenantCols.has("billing_cycle")) {
    await db.prepare("ALTER TABLE tenants ADD COLUMN billing_cycle TEXT DEFAULT 'monthly';").run();
  }

  // Backfill de trial_ends_at para tenants existentes sem expiração definida
  await db
    .prepare(
      "UPDATE tenants SET trial_ends_at = datetime(COALESCE(created_at, datetime('now')), '+7 days') WHERE trial_ends_at IS NULL;"
    )
    .run();

  const userCols = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  const existingUserCols = new Set((userCols.results || []).map((c) => c.name));
  if (!existingUserCols.has("active")) {
    await db.prepare("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1;").run();
  }
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id, active);").run();

  // Semeia usuários iniciais apenas se a tabela users estiver vazia
  const user = await db.prepare("SELECT id FROM users LIMIT 1").first();
  if (!user) {
    // Senha padrão inicial para testes: 'admin123'
    // Hash SHA-256 de "admin123:odonto_salt_2026"
    const defaultHash = "219f1b54263a28a320ddb777b89011a54d75d32bc5d0e6b20b9fdbdc02d61876";
    await db
      .prepare(
        `INSERT OR IGNORE INTO users (tenant_id, email, password_hash, name, role)
         VALUES 
         ('lab', 'pedrogutierres@protonmail.com', ?1, 'Pedro Gutierres', 'superadmin'),
         ('lab', 'admin@clinica.com', ?1, 'Dra. Fernanda (Admin)', 'admin');`
      )
      .bind(defaultHash)
      .run();

    await db
      .prepare(
        `INSERT OR IGNORE INTO appointments (tenant_id, contact_wa_id, patient_name, procedure, scheduled_at, status, notes)
         VALUES 
         ('lab', '5511988881234', 'Mariana Silveira', 'Botox / Toxina Botulínica', '2026-11-14 10:00', 'confirmado', 'Agendado automaticamente pela Secretária IA Claude 24h'),
         ('lab', '5521973401655', 'Pedro (Paciente Teste)', 'Avaliação Geral & Clareamento', '2026-11-11 15:30', 'agendado', 'Paciente aguardando confirmação de véspera');`
      )
      .run();
  }
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRecord | null> {
  return db.prepare("SELECT * FROM users WHERE email = ?1").bind(email.toLowerCase().trim()).first<UserRecord>();
}

export async function getUserById(db: D1Database, id: number): Promise<UserRecord | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?1").bind(id).first<UserRecord>();
}

// -----------------------------------------------------------------------------
// GESTÃO DE PROFISSIONAIS (DENTISTAS / ESTETICISTAS POR CLÍNICA)
// -----------------------------------------------------------------------------
export async function listProfessionals(
  db: D1Database,
  tenantId: string,
  activeOnly = false
): Promise<ProfessionalRecord[]> {
  const query = activeOnly
    ? "SELECT * FROM professionals WHERE tenant_id = ?1 AND active = 1 ORDER BY name ASC, id ASC"
    : "SELECT * FROM professionals WHERE tenant_id = ?1 ORDER BY active DESC, name ASC, id ASC";
  const { results } = await db.prepare(query).bind(tenantId).all<ProfessionalRecord>();
  return results || [];
}

export async function getProfessionalById(
  db: D1Database,
  tenantId: string,
  id: number
): Promise<ProfessionalRecord | null> {
  return db
    .prepare("SELECT * FROM professionals WHERE id = ?1 AND tenant_id = ?2")
    .bind(id, tenantId)
    .first<ProfessionalRecord>();
}

export async function createProfessional(
  db: D1Database,
  tenantId: string,
  input: {
    name: string;
    specialty?: string | null;
    croCrm?: string | null;
    workingDays?: number[];
    startHour?: string;
    endHour?: string;
    breakStart?: string | null;
    breakEnd?: string | null;
    procedures?: string[];
    color?: string;
    active?: boolean;
  }
): Promise<number> {
  const workingDaysJson = JSON.stringify(
    Array.isArray(input.workingDays) && input.workingDays.length > 0 ? input.workingDays : [1, 2, 3, 4, 5]
  );
  const proceduresJson = JSON.stringify(Array.isArray(input.procedures) ? input.procedures : []);
  const res = await db
    .prepare(
      `INSERT INTO professionals
         (tenant_id, name, specialty, cro_crm, working_days, start_hour, end_hour, break_start, break_end, procedures_json, color, active)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
    )
    .bind(
      tenantId,
      input.name.trim(),
      input.specialty?.trim() || null,
      input.croCrm?.trim() || null,
      workingDaysJson,
      input.startHour || "08:00",
      input.endHour || "18:00",
      input.breakStart?.trim() || null,
      input.breakEnd?.trim() || null,
      proceduresJson,
      input.color || "#10b981",
      input.active === false ? 0 : 1
    )
    .run();
  return res.meta?.last_row_id ?? 0;
}

export async function updateProfessional(
  db: D1Database,
  tenantId: string,
  id: number,
  updates: {
    name?: string;
    specialty?: string | null;
    croCrm?: string | null;
    workingDays?: number[];
    startHour?: string;
    endHour?: string;
    breakStart?: string | null;
    breakEnd?: string | null;
    procedures?: string[];
    color?: string;
    active?: boolean;
  }
): Promise<boolean> {
  const sets: string[] = [];
  const bindings: (string | number | null)[] = [];
  let idx = 1;

  if (typeof updates.name === "string" && updates.name.trim()) {
    sets.push(`name = ?${idx++}`);
    bindings.push(updates.name.trim());
  }
  if (typeof updates.specialty !== "undefined") {
    sets.push(`specialty = ?${idx++}`);
    bindings.push(updates.specialty?.trim() || null);
  }
  if (typeof updates.croCrm !== "undefined") {
    sets.push(`cro_crm = ?${idx++}`);
    bindings.push(updates.croCrm?.trim() || null);
  }
  if (Array.isArray(updates.workingDays)) {
    sets.push(`working_days = ?${idx++}`);
    bindings.push(JSON.stringify(updates.workingDays));
  }
  if (typeof updates.startHour === "string") {
    sets.push(`start_hour = ?${idx++}`);
    bindings.push(updates.startHour);
  }
  if (typeof updates.endHour === "string") {
    sets.push(`end_hour = ?${idx++}`);
    bindings.push(updates.endHour);
  }
  if (typeof updates.breakStart !== "undefined") {
    sets.push(`break_start = ?${idx++}`);
    bindings.push(updates.breakStart?.trim() || null);
  }
  if (typeof updates.breakEnd !== "undefined") {
    sets.push(`break_end = ?${idx++}`);
    bindings.push(updates.breakEnd?.trim() || null);
  }
  if (Array.isArray(updates.procedures)) {
    sets.push(`procedures_json = ?${idx++}`);
    bindings.push(JSON.stringify(updates.procedures));
  }
  if (typeof updates.color === "string" && updates.color.trim()) {
    sets.push(`color = ?${idx++}`);
    bindings.push(updates.color.trim());
  }
  if (typeof updates.active === "boolean") {
    sets.push(`active = ?${idx++}`);
    bindings.push(updates.active ? 1 : 0);
  }

  if (sets.length === 0) return false;

  bindings.push(id, tenantId);
  const res = await db
    .prepare(`UPDATE professionals SET ${sets.join(", ")} WHERE id = ?${idx++} AND tenant_id = ?${idx}`)
    .bind(...bindings)
    .run();

  if ((res.meta?.changes ?? 0) > 0 && typeof updates.name === "string" && updates.name.trim()) {
    await db
      .prepare("UPDATE appointments SET professional_name = ?1 WHERE professional_id = ?2 AND tenant_id = ?3")
      .bind(updates.name.trim(), id, tenantId)
      .run();
  }

  return (res.meta?.changes ?? 0) > 0;
}

export async function deleteProfessional(db: D1Database, tenantId: string, id: number): Promise<void> {
  // Desvincula agendamentos existentes mantendo professional_name histórico antes de excluir
  await db.batch([
    db.prepare("UPDATE appointments SET professional_id = NULL WHERE professional_id = ?1 AND tenant_id = ?2").bind(id, tenantId),
    db.prepare("DELETE FROM professionals WHERE id = ?1 AND tenant_id = ?2").bind(id, tenantId),
  ]);
}

export async function getAppointmentById(
  db: D1Database,
  tenantId: string,
  id: number
): Promise<AppointmentRecord | null> {
  return db
    .prepare("SELECT * FROM appointments WHERE id = ?1 AND tenant_id = ?2")
    .bind(id, tenantId)
    .first<AppointmentRecord>();
}

export async function listAppointments(db: D1Database, tenantId: string): Promise<AppointmentRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM appointments 
       WHERE tenant_id = ?1 
       ORDER BY scheduled_at ASC, id DESC LIMIT 200`
    )
    .bind(tenantId)
    .all<AppointmentRecord>();
  return results || [];
}

export function parseDurationMinutes(durationStr?: string | null): number {
  if (!durationStr) return 30;
  const s = String(durationStr).toLowerCase().trim();
  const hMatch = s.match(/(\d+)\s*h(?:oras?)?(?:\s*(\d+))?/);
  if (hMatch) {
    const hours = parseInt(hMatch[1], 10);
    const mins = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    return hours * 60 + mins;
  }
  const mMatch = s.match(/(\d+)\s*m/);
  if (mMatch) {
    return parseInt(mMatch[1], 10);
  }
  const num = parseInt(s, 10);
  if (!isNaN(num) && num > 0) return num;
  return 30;
}

export function parseAppointmentTimeInterval(
  scheduledAt: string,
  durationStr?: string | null
): { date: string; startMin: number; endMin: number } | null {
  if (!scheduledAt) return null;
  const dateMatch = scheduledAt.match(/(\d{4}-\d{2}-\d{2})/);
  const timeMatch = scheduledAt.match(/(\d{2}):(\d{2})/);
  if (!dateMatch || !timeMatch) return null;

  const date = dateMatch[1];
  const startMin = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
  const durMin = parseDurationMinutes(durationStr);
  const endMin = startMin + durMin;

  return { date, startMin, endMin };
}

function parseHmMinutes(hm?: string | null): number | null {
  if (!hm) return null;
  const m = String(hm).trim().match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

const WEEKDAY_SHORT_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function checkAppointmentConflict(
  db: D1Database,
  tenantId: string,
  scheduledAt: string,
  durationStr?: string | null,
  excludeId?: number,
  professionalId?: number | null
): Promise<{ conflict: boolean; reason?: string; conflictWith?: AppointmentRecord }> {
  const targetInterval = parseAppointmentTimeInterval(scheduledAt, durationStr);
  if (!targetInterval) {
    return { conflict: false };
  }

  // 1. Se um profissional foi informado, valida dia da semana, expediente e intervalo dele
  if (professionalId) {
    const prof = await getProfessionalById(db, tenantId, professionalId);
    if (prof) {
      if (!prof.active) {
        return { conflict: true, reason: `O profissional ${prof.name} está pausado/inativo no momento.` };
      }

      const [yy, mm, dd] = targetInterval.date.split("-").map(Number);
      const dayOfWeek = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
      let workingDays: number[] = [1, 2, 3, 4, 5];
      try {
        const parsedDays = JSON.parse(prof.working_days);
        if (Array.isArray(parsedDays)) workingDays = parsedDays.map(Number);
      } catch {}

      if (!workingDays.includes(dayOfWeek)) {
        const daysLabel = workingDays.map((d) => WEEKDAY_SHORT_PT[d] ?? "").filter(Boolean).join(", ");
        return {
          conflict: true,
          reason: `${prof.name} não atende neste dia (${WEEKDAY_SHORT_PT[dayOfWeek]}). Dias de atendimento: ${daysLabel || "não configurados"}.`,
        };
      }

      const shiftStart = parseHmMinutes(prof.start_hour);
      const shiftEnd = parseHmMinutes(prof.end_hour);
      if (shiftStart !== null && shiftEnd !== null) {
        if (targetInterval.startMin < shiftStart || targetInterval.endMin > shiftEnd) {
          return {
            conflict: true,
            reason: `Horário fora do expediente de ${prof.name} (${prof.start_hour} às ${prof.end_hour}).`,
          };
        }
      }

      const breakStart = parseHmMinutes(prof.break_start);
      const breakEnd = parseHmMinutes(prof.break_end);
      if (breakStart !== null && breakEnd !== null && breakStart < breakEnd) {
        if (targetInterval.startMin < breakEnd && targetInterval.endMin > breakStart) {
          return {
            conflict: true,
            reason: `Horário coincide com o intervalo de ${prof.name} (${prof.break_start} às ${prof.break_end}).`,
          };
        }
      }
    }
  }

  // 2. Verifica sobreposição de consultas na agenda do mesmo profissional (ou geral se sem profissional)
  const { results } = await db
    .prepare(
      `SELECT * FROM appointments 
       WHERE tenant_id = ?1 
         AND status != 'cancelado' 
         AND scheduled_at LIKE ?2`
    )
    .bind(tenantId, `%${targetInterval.date}%`)
    .all<AppointmentRecord>();

  if (!results || results.length === 0) {
    return { conflict: false };
  }

  for (const existing of results) {
    if (excludeId && existing.id === excludeId) continue;

    if (professionalId) {
      if (existing.professional_id !== professionalId) continue;
    } else if (existing.professional_id) {
      // Sem profissional específico: não bloqueia consultas já atribuídas a um profissional diferente,
      // a menos que este agendamento também seja geral (NULL)
      continue;
    }

    const exInterval = parseAppointmentTimeInterval(existing.scheduled_at, existing.duration);
    if (!exInterval) continue;

    // Conflito temporal por sobreposição de intervalos: startA < endB && endA > startB
    if (targetInterval.startMin < exInterval.endMin && targetInterval.endMin > exInterval.startMin) {
      return { conflict: true, conflictWith: existing };
    }
  }

  return { conflict: false };
}

export interface CreateAppointmentResult {
  success: boolean;
  id?: number;
  conflict?: boolean;
  message?: string;
}

export async function createAppointment(
  db: D1Database,
  tenantId: string,
  contactWaId: string,
  patientName: string,
  procedure: string,
  scheduledAt: string,
  status: string = "agendado",
  notes: string = "",
  duration: string = "30 min",
  professionalId: number | null = null,
  professionalName: string | null = null
): Promise<CreateAppointmentResult> {
  // Verificação centralizada de conflitos na grade (por profissional quando informado)
  const conflictCheck = await checkAppointmentConflict(db, tenantId, scheduledAt, duration, undefined, professionalId);
  if (conflictCheck.conflict) {
    if (conflictCheck.reason) {
      return { success: false, conflict: true, message: conflictCheck.reason };
    }
    if (conflictCheck.conflictWith) {
      const c = conflictCheck.conflictWith;
      const profSuffix = c.professional_name ? ` com ${c.professional_name}` : "";
      return {
        success: false,
        conflict: true,
        message: `Conflito de horário! Já existe consulta agendada${profSuffix} para ${c.patient_name} (${c.procedure || "Consulta"}) em ${c.scheduled_at} (${c.duration || "30 min"}).`,
      };
    }
  }

  const result = await db
    .prepare(
      `INSERT INTO appointments (tenant_id, contact_wa_id, patient_name, procedure, scheduled_at, status, notes, duration, professional_id, professional_name)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    )
    .bind(
      tenantId,
      contactWaId,
      patientName,
      procedure,
      scheduledAt,
      status,
      notes,
      duration,
      professionalId,
      professionalName
    )
    .run();
  return { success: true, id: result.meta.last_row_id ?? 0 };
}

export async function updateAppointmentDetails(
  db: D1Database,
  tenantId: string,
  id: number,
  updates: {
    status?: string;
    notes?: string;
    procedure?: string;
    scheduledAt?: string;
    duration?: string;
    professionalId?: number | null;
    professionalName?: string | null;
  }
): Promise<void> {
  const sets: string[] = [];
  const bindings: (string | number | null)[] = [];
  let paramIdx = 1;

  if (typeof updates.status !== "undefined") {
    sets.push(`status = ?${paramIdx++}`);
    bindings.push(updates.status);
    if (updates.status === "confirmado") {
      sets.push(`confirmed_at = datetime('now')`);
      sets.push(`confirmed_by = 'human'`);
    }
  }
  if (typeof updates.notes !== "undefined") {
    sets.push(`notes = ?${paramIdx++}`);
    bindings.push(updates.notes);
  }
  if (typeof updates.procedure !== "undefined") {
    sets.push(`procedure = ?${paramIdx++}`);
    bindings.push(updates.procedure);
  }
  if (typeof updates.scheduledAt !== "undefined") {
    sets.push(`scheduled_at = ?${paramIdx++}`);
    bindings.push(updates.scheduledAt);
  }
  if (typeof updates.duration !== "undefined") {
    sets.push(`duration = ?${paramIdx++}`);
    bindings.push(updates.duration);
  }
  if (typeof updates.professionalId !== "undefined") {
    sets.push(`professional_id = ?${paramIdx++}`);
    bindings.push(updates.professionalId);
  }
  if (typeof updates.professionalName !== "undefined") {
    sets.push(`professional_name = ?${paramIdx++}`);
    bindings.push(updates.professionalName);
  }

  if (sets.length === 0) return;

  const sql = `UPDATE appointments SET ${sets.join(", ")} WHERE id = ?${paramIdx++} AND tenant_id = ?${paramIdx++}`;
  bindings.push(id, tenantId);

  await db.prepare(sql).bind(...bindings).run();
}

export async function updateAppointmentStatus(
  db: D1Database,
  tenantId: string,
  id: number,
  status: string,
  confirmedBy?: "human" | "ai"
): Promise<void> {
  if (status === "confirmado") {
    await db
      .prepare(
        "UPDATE appointments SET status = ?1, confirmed_at = datetime('now'), confirmed_by = ?2 WHERE id = ?3 AND tenant_id = ?4"
      )
      .bind(status, confirmedBy || "human", id, tenantId)
      .run();
  } else {
    await db
      .prepare("UPDATE appointments SET status = ?1 WHERE id = ?2 AND tenant_id = ?3")
      .bind(status, id, tenantId)
      .run();
  }
}

export async function confirmUpcomingAppointmentForContact(
  db: D1Database,
  tenantId: string,
  contactWaId: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM appointments 
       WHERE tenant_id = ?1 AND contact_wa_id = ?2 AND status IN ('agendado', 'pre_agendado')
       ORDER BY scheduled_at ASC LIMIT 1`
    )
    .bind(tenantId, contactWaId)
    .first<{ id: number }>();
  if (row) {
    await updateAppointmentStatus(db, tenantId, row.id, "confirmado", "ai");
    return true;
  }
  return false;
}

export async function getUpcomingAppointments(
  db: D1Database,
  tenantId: string,
  days: number = 14
): Promise<AppointmentRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM appointments 
       WHERE tenant_id = ?1 AND status NOT IN ('cancelado')
       ORDER BY scheduled_at ASC LIMIT 100`
    )
    .bind(tenantId)
    .all<AppointmentRecord>();
  return results || [];
}

export async function deleteAppointment(
  db: D1Database,
  tenantId: string,
  id: number
): Promise<void> {
  await db
    .prepare("DELETE FROM appointments WHERE id = ?1 AND tenant_id = ?2")
    .bind(id, tenantId)
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
  const clinicName = config.clinic_name?.trim() || "Clínica Sorriso & Estética";

  // Atualiza clínica já cadastrada sem tocar em phone_number_id (evita colisão na constraint UNIQUE)
  const updateResult = await db
    .prepare("UPDATE tenants SET bot_config = ?1, name = ?2 WHERE id = ?3")
    .bind(configJson, clinicName, tenantId)
    .run();

  if ((updateResult.meta?.changes ?? 0) === 0) {
    // Fallback seguro caso o tenant ainda não exista na tabela tenants
    const placeholderPhoneNumberId = `unconfigured:${tenantId}`;
    await db
      .prepare(
        `INSERT INTO tenants (id, name, phone_number_id, bot_config, active)
         VALUES (?1, ?2, ?3, ?4, 1)
         ON CONFLICT(id) DO UPDATE SET bot_config = excluded.bot_config, name = excluded.name`
      )
      .bind(tenantId, clinicName, placeholderPhoneNumberId, configJson)
      .run();
  }
}

export function isCrucialConfigComplete(cfg: BotConfig | null | undefined): boolean {
  if (!cfg || !cfg.clinic_name || !cfg.clinic_name.trim()) return false;
  if (!cfg.hours || !cfg.hours.trim()) return false;
  if (!cfg.initial_consultation || !cfg.initial_consultation.duration || !cfg.initial_consultation.duration.trim()) {
    return false;
  }
  if (!Array.isArray(cfg.procedure_items)) return false;
  const activeItems = cfg.procedure_items.filter((p) => p.checked !== false);
  if (activeItems.length === 0) return false;
  const hasInvalidActive = activeItems.some((p) => !p.name?.trim() || !p.duration?.trim());
  if (hasInvalidActive) return false;
  return true;
}

// -----------------------------------------------------------------------------
// SUPER ADMIN (VISÃO GLOBAL DO SAAS E GESTÃO DE CLÍNICAS/USUÁRIOS)
// -----------------------------------------------------------------------------
export interface AdminTenantSummary {
  id: string;
  name: string;
  phone_number_id: string;
  whatsapp_configured: boolean;
  waba_id: string | null;
  has_custom_token: boolean;
  training_complete: boolean;
  active: boolean;
  created_at: string;
  messages_count: number;
  contacts_count: number;
  appointments_count: number;
  users_count: number;
  last_message_at: string | null;
}

export interface AdminUserSummary {
  id: number;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface AdminOverviewData {
  stats: {
    tenants_total: number;
    tenants_active: number;
    tenants_whatsapp_connected: number;
    users_total: number;
    messages_total: number;
    appointments_total: number;
  };
  tenants: AdminTenantSummary[];
  users: AdminUserSummary[];
}

export async function listAdminOverview(db: D1Database): Promise<AdminOverviewData> {
  const [tenantsRes, msgStatsRes, appStatsRes, usersRes] = await db.batch([
    db.prepare(
      `SELECT id, name, phone_number_id, waba_id,
              CASE WHEN access_token_enc IS NOT NULL AND TRIM(access_token_enc) != '' THEN 1 ELSE 0 END AS has_custom_token,
              bot_config, active, created_at
       FROM tenants
       ORDER BY created_at DESC, id ASC`
    ),
    db.prepare(
      `SELECT tenant_id,
              COUNT(*) AS messages_count,
              COUNT(DISTINCT contact_wa_id) AS contacts_count,
              MAX(created_at) AS last_message_at
       FROM messages
       GROUP BY tenant_id`
    ),
    db.prepare(
      `SELECT tenant_id, COUNT(*) AS appointments_count
       FROM appointments
       GROUP BY tenant_id`
    ),
    db.prepare(
      `SELECT id, tenant_id, email, name, role, created_at
       FROM users
       ORDER BY id ASC`
    ),
  ]);

  const rawTenants = (tenantsRes.results || []) as Array<{
    id: string;
    name: string;
    phone_number_id: string;
    waba_id: string | null;
    has_custom_token: number;
    bot_config: string;
    active: number;
    created_at: string;
  }>;

  const msgMap = new Map<string, { messages_count: number; contacts_count: number; last_message_at: string | null }>();
  for (const r of (msgStatsRes.results || []) as Array<{
    tenant_id: string;
    messages_count: number;
    contacts_count: number;
    last_message_at: string | null;
  }>) {
    msgMap.set(r.tenant_id, r);
  }

  const appMap = new Map<string, number>();
  for (const r of (appStatsRes.results || []) as Array<{ tenant_id: string; appointments_count: number }>) {
    appMap.set(r.tenant_id, r.appointments_count);
  }

  const users = (usersRes.results || []) as AdminUserSummary[];
  const userCountMap = new Map<string, number>();
  for (const u of users) {
    userCountMap.set(u.tenant_id, (userCountMap.get(u.tenant_id) || 0) + 1);
  }

  let messagesTotal = 0;
  let appointmentsTotal = 0;
  let tenantsActive = 0;
  let tenantsWhatsappConnected = 0;

  const tenants: AdminTenantSummary[] = rawTenants.map((t) => {
    let parsedCfg: BotConfig | null = null;
    try {
      parsedCfg = JSON.parse(t.bot_config) as BotConfig;
    } catch {
      parsedCfg = null;
    }

    const msgInfo = msgMap.get(t.id);
    const msgCount = msgInfo?.messages_count || 0;
    const appCount = appMap.get(t.id) || 0;
    const isActive = t.active === 1;
    const whatsappOk = isConfiguredPhoneNumberId(t.phone_number_id);

    messagesTotal += msgCount;
    appointmentsTotal += appCount;
    if (isActive) tenantsActive++;
    if (whatsappOk) tenantsWhatsappConnected++;

    return {
      id: t.id,
      name: t.name,
      phone_number_id: t.phone_number_id,
      whatsapp_configured: whatsappOk,
      waba_id: t.waba_id,
      has_custom_token: t.has_custom_token === 1,
      training_complete: isCrucialConfigComplete(parsedCfg),
      active: isActive,
      created_at: t.created_at,
      messages_count: msgCount,
      contacts_count: msgInfo?.contacts_count || 0,
      appointments_count: appCount,
      users_count: userCountMap.get(t.id) || 0,
      last_message_at: msgInfo?.last_message_at || null,
    };
  });

  // Inclui também contagens órfãs caso haja registros de tenant ainda não criados em tenants
  for (const [tid, info] of msgMap.entries()) {
    if (!tenants.some((t) => t.id === tid)) messagesTotal += info.messages_count || 0;
  }
  for (const [tid, count] of appMap.entries()) {
    if (!tenants.some((t) => t.id === tid)) appointmentsTotal += count || 0;
  }

  return {
    stats: {
      tenants_total: tenants.length,
      tenants_active: tenantsActive,
      tenants_whatsapp_connected: tenantsWhatsappConnected,
      users_total: users.length,
      messages_total: messagesTotal,
      appointments_total: appointmentsTotal,
    },
    tenants,
    users,
  };
}

export async function createTenantWithOptionalUser(
  db: D1Database,
  input: {
    tenantId: string;
    name: string;
    phoneNumberId?: string | null;
    wabaId?: string | null;
    accessTokenEnc?: string | null;
    active?: boolean;
    adminUser?: {
      name: string;
      email: string;
      passwordHash: string;
    };
  }
): Promise<void> {
  const effectivePhoneId = input.phoneNumberId?.trim() || `unconfigured:${input.tenantId}`;
  const initialConfig = JSON.stringify({ clinic_name: input.name });
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO tenants (id, name, phone_number_id, waba_id, access_token_enc, bot_config, active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
      .bind(
        input.tenantId,
        input.name,
        effectivePhoneId,
        input.wabaId?.trim() || null,
        input.accessTokenEnc || null,
        initialConfig,
        input.active === false ? 0 : 1
      ),
  ];

  if (input.adminUser) {
    statements.push(
      db
        .prepare(
          `INSERT INTO users (tenant_id, email, password_hash, name, role)
           VALUES (?1, ?2, ?3, ?4, 'admin')`
        )
        .bind(
          input.tenantId,
          input.adminUser.email.toLowerCase().trim(),
          input.adminUser.passwordHash,
          input.adminUser.name.trim()
        )
    );
  }

  await db.batch(statements);
}

export async function updateTenantAdminSettings(
  db: D1Database,
  tenantId: string,
  updates: {
    name?: string;
    active?: boolean;
    phoneNumberId?: string | null;
    wabaId?: string | null;
    accessTokenEnc?: string | null;
    clearToken?: boolean;
  }
): Promise<boolean> {
  const sets: string[] = [];
  const bindings: (string | number | null)[] = [];
  let idx = 1;

  if (typeof updates.name === "string" && updates.name.trim()) {
    sets.push(`name = ?${idx++}`);
    bindings.push(updates.name.trim());
  }
  if (typeof updates.active === "boolean") {
    sets.push(`active = ?${idx++}`);
    bindings.push(updates.active ? 1 : 0);
  }
  if (typeof updates.phoneNumberId !== "undefined") {
    const cleanPhoneId = updates.phoneNumberId?.trim();
    sets.push(`phone_number_id = ?${idx++}`);
    bindings.push(cleanPhoneId || `unconfigured:${tenantId}`);
  }
  if (typeof updates.wabaId !== "undefined") {
    sets.push(`waba_id = ?${idx++}`);
    bindings.push(updates.wabaId?.trim() || null);
  }
  if (updates.clearToken) {
    sets.push(`access_token_enc = NULL`);
  } else if (typeof updates.accessTokenEnc === "string" && updates.accessTokenEnc.trim()) {
    sets.push(`access_token_enc = ?${idx++}`);
    bindings.push(updates.accessTokenEnc.trim());
  }

  if (sets.length === 0) return false;

  bindings.push(tenantId);
  const res = await db
    .prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...bindings)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function createClinicUser(
  db: D1Database,
  input: {
    tenantId: string;
    name: string;
    email: string;
    passwordHash: string;
    role?: "admin" | "staff";
  }
): Promise<number> {
  const role = input.role === "staff" ? "staff" : "admin";
  const res = await db
    .prepare(
      `INSERT INTO users (tenant_id, email, password_hash, name, role)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(input.tenantId, input.email.toLowerCase().trim(), input.passwordHash, input.name.trim(), role)
    .run();
  return res.meta?.last_row_id ?? 0;
}

export async function resetUserPassword(db: D1Database, userId: number, passwordHash: string): Promise<boolean> {
  const res = await db
    .prepare("UPDATE users SET password_hash = ?1 WHERE id = ?2")
    .bind(passwordHash, userId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// -----------------------------------------------------------------------------
// CONFIGURAÇÕES DA CLÍNICA, EQUIPE INTERNA & CONEXÃO WHATSAPP (ETAPA 2)
// -----------------------------------------------------------------------------
export async function updateClinicProfile(
  db: D1Database,
  tenantId: string,
  updates: {
    name?: string;
    legalName?: string | null;
    cnpj?: string | null;
    adminPhone?: string | null;
    responsibleName?: string | null;
    contactEmail?: string | null;
  }
): Promise<boolean> {
  const existing = await db
    .prepare("SELECT name, bot_config FROM tenants WHERE id = ?1")
    .bind(tenantId)
    .first<{ name: string; bot_config: string }>();
  if (!existing) return false;

  const sets: string[] = [];
  const bindings: (string | number | null)[] = [];
  let idx = 1;

  if (typeof updates.name === "string" && updates.name.trim()) {
    const cleanName = updates.name.trim();
    sets.push(`name = ?${idx++}`);
    bindings.push(cleanName);

    // Mantém bot_config.clinic_name sincronizado com tenants.name
    let cfg: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(existing.bot_config || "{}");
      if (parsed && typeof parsed === "object") cfg = parsed as Record<string, unknown>;
    } catch {}
    cfg.clinic_name = cleanName;
    sets.push(`bot_config = ?${idx++}`);
    bindings.push(JSON.stringify(cfg));
  }

  if (typeof updates.legalName !== "undefined") {
    sets.push(`legal_name = ?${idx++}`);
    bindings.push(updates.legalName?.trim() || null);
  }
  if (typeof updates.cnpj !== "undefined") {
    sets.push(`cnpj = ?${idx++}`);
    bindings.push(updates.cnpj?.trim() || null);
  }
  if (typeof updates.adminPhone !== "undefined") {
    sets.push(`admin_phone = ?${idx++}`);
    bindings.push(updates.adminPhone?.trim() || null);
  }
  if (typeof updates.responsibleName !== "undefined") {
    sets.push(`responsible_name = ?${idx++}`);
    bindings.push(updates.responsibleName?.trim() || null);
  }
  if (typeof updates.contactEmail !== "undefined") {
    sets.push(`contact_email = ?${idx++}`);
    bindings.push(updates.contactEmail?.trim().toLowerCase() || null);
  }

  if (sets.length === 0) return false;

  bindings.push(tenantId);
  const res = await db
    .prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...bindings)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function isPhoneNumberIdTakenByOtherTenant(
  db: D1Database,
  phoneNumberId: string,
  currentTenantId: string
): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM tenants WHERE phone_number_id = ?1 AND id != ?2")
    .bind(phoneNumberId.trim(), currentTenantId)
    .first<{ id: string }>();
  return Boolean(row?.id);
}

export async function updateTenantWhatsAppConnection(
  db: D1Database,
  tenantId: string,
  data: {
    phoneNumberId: string;
    wabaId?: string | null;
    accessTokenEnc?: string | null;
    waDisplayPhone?: string | null;
    waVerifiedName?: string | null;
    markConnected?: boolean;
  }
): Promise<boolean> {
  const sets: string[] = ["phone_number_id = ?1"];
  const bindings: (string | number | null)[] = [data.phoneNumberId.trim()];
  let idx = 2;

  if (typeof data.wabaId !== "undefined") {
    sets.push(`waba_id = ?${idx++}`);
    bindings.push(data.wabaId?.trim() || null);
  }
  if (typeof data.accessTokenEnc === "string" && data.accessTokenEnc.trim()) {
    sets.push(`access_token_enc = ?${idx++}`);
    bindings.push(data.accessTokenEnc.trim());
  }
  if (typeof data.waDisplayPhone !== "undefined") {
    sets.push(`wa_display_phone = ?${idx++}`);
    bindings.push(data.waDisplayPhone?.trim() || null);
  }
  if (typeof data.waVerifiedName !== "undefined") {
    sets.push(`wa_verified_name = ?${idx++}`);
    bindings.push(data.waVerifiedName?.trim() || null);
  }
  if (data.markConnected) {
    sets.push(`wa_connected_at = datetime('now')`);
  }

  bindings.push(tenantId);
  const res = await db
    .prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?${idx}`)
    .bind(...bindings)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function disconnectTenantWhatsApp(db: D1Database, tenantId: string): Promise<boolean> {
  const placeholder = `unconfigured:${tenantId}`;
  const res = await db
    .prepare(
      `UPDATE tenants
       SET phone_number_id = ?1,
           waba_id = NULL,
           access_token_enc = NULL,
           wa_display_phone = NULL,
           wa_verified_name = NULL,
           wa_connected_at = NULL
       WHERE id = ?2`
    )
    .bind(placeholder, tenantId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function listClinicUsers(db: D1Database, tenantId: string): Promise<ClinicUserSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT id, tenant_id, email, name, role, COALESCE(active, 1) AS active, created_at
       FROM users
       WHERE tenant_id = ?1
       ORDER BY id ASC`
    )
    .bind(tenantId)
    .all<ClinicUserSummary>();
  return results || [];
}

export async function getClinicUserById(
  db: D1Database,
  tenantId: string,
  userId: number
): Promise<ClinicUserSummary | null> {
  return db
    .prepare(
      `SELECT id, tenant_id, email, name, role, COALESCE(active, 1) AS active, created_at
       FROM users
       WHERE id = ?1 AND tenant_id = ?2`
    )
    .bind(userId, tenantId)
    .first<ClinicUserSummary>();
}

export async function countActiveClinicAdmins(db: D1Database, tenantId: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS cnt
       FROM users
       WHERE tenant_id = ?1
         AND role IN ('admin', 'superadmin')
         AND COALESCE(active, 1) = 1`
    )
    .bind(tenantId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function updateClinicUser(
  db: D1Database,
  tenantId: string,
  userId: number,
  updates: {
    name?: string;
    role?: "admin" | "staff";
    active?: boolean;
    passwordHash?: string;
  }
): Promise<boolean> {
  const sets: string[] = [];
  const bindings: (string | number | null)[] = [];
  let idx = 1;

  if (typeof updates.name === "string" && updates.name.trim()) {
    sets.push(`name = ?${idx++}`);
    bindings.push(updates.name.trim());
  }
  if (updates.role === "admin" || updates.role === "staff") {
    sets.push(`role = ?${idx++}`);
    bindings.push(updates.role);
  }
  if (typeof updates.active === "boolean") {
    sets.push(`active = ?${idx++}`);
    bindings.push(updates.active ? 1 : 0);
  }
  if (typeof updates.passwordHash === "string" && updates.passwordHash.trim()) {
    sets.push(`password_hash = ?${idx++}`);
    bindings.push(updates.passwordHash.trim());
  }

  if (sets.length === 0) return false;

  bindings.push(userId, tenantId);
  const res = await db
    .prepare(
      `UPDATE users
       SET ${sets.join(", ")}
       WHERE id = ?${idx++} AND tenant_id = ?${idx} AND role != 'superadmin'`
    )
    .bind(...bindings)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function deleteClinicUser(db: D1Database, tenantId: string, userId: number): Promise<boolean> {
  const res = await db
    .prepare("DELETE FROM users WHERE id = ?1 AND tenant_id = ?2 AND role != 'superadmin'")
    .bind(userId, tenantId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function updateOwnPassword(
  db: D1Database,
  tenantId: string,
  userId: number,
  passwordHash: string
): Promise<boolean> {
  const res = await db
    .prepare("UPDATE users SET password_hash = ?1 WHERE id = ?2 AND tenant_id = ?3")
    .bind(passwordHash, userId, tenantId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

/**
 * Normaliza e analisa timestamps de expiração de trial do SQLite ('YYYY-MM-DD HH:MM:SS')
 * ou ISO 8601 em UTC determinístico.
 */
function parseTrialDate(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const raw = dateStr.trim();
  if (!raw) return null;
  let normalized = raw;
  if (!normalized.includes("T")) {
    normalized = normalized.replace(" ", "T");
  }
  if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
    normalized += "Z";
  }
  const ms = new Date(normalized).getTime();
  return isNaN(ms) ? null : ms;
}

/**
 * Avalia o estado de assinatura e limites de trial de uma clínica.
 */
export function getTenantTrialInfo(tenant: Tenant): TenantTrialInfo {
  const status = (tenant.plan_status || "trial").toLowerCase();
  const used = Number(tenant.trial_messages_used ?? 0);
  const limit = Number(tenant.trial_messages_limit ?? 100);

  let daysRemaining = 0;
  let isExpired = false;

  const endMs = parseTrialDate(tenant.trial_ends_at);
  if (endMs !== null) {
    const diffMs = endMs - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / 86_400_000));
    isExpired = diffMs <= 0;
  }

  let isLimitReached = status === "trial" ? used >= limit : false;

  let canSend = false;
  if (tenant.active === 0) {
    // Clínica desativada pelo administrador
    canSend = false;
  } else if (status === "active") {
    // Plano ativo / pago - sem restrições de trial
    canSend = true;
    isExpired = false;
    isLimitReached = false;
  } else if (status === "trial") {
    canSend = !isExpired && !isLimitReached;
  } else {
    // past_due, canceled ou outros status de bloqueio
    canSend = false;
    isExpired = true;
  }

  return {
    plan_status: status,
    trial_ends_at: tenant.trial_ends_at ?? null,
    trial_messages_used: used,
    trial_messages_limit: limit,
    days_remaining: daysRemaining,
    is_expired: isExpired,
    is_limit_reached: isLimitReached,
    can_send_messages: canSend,
  };
}

/**
 * Incrementa atomicamente o contador de mensagens de trial de uma clínica.
 * Retorna o novo total de mensagens consumidas, ou 0 se a clínica não for encontrada.
 */
export async function incrementTenantTrialMessages(
  db: D1Database,
  tenantId: string
): Promise<number> {
  const row = await db
    .prepare(
      `UPDATE tenants
       SET trial_messages_used = COALESCE(trial_messages_used, 0) + 1
       WHERE id = ?1
       RETURNING trial_messages_used`
    )
    .bind(tenantId)
    .first<{ trial_messages_used: number }>();

  return row ? Number(row.trial_messages_used) : 0;
}

