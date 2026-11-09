-- Tabela de Usuários / Autenticação de Clínicas
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de Agendamentos & Avaliações captadas pela IA ou Recepcionista
CREATE TABLE IF NOT EXISTS appointments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id     TEXT NOT NULL,
  contact_wa_id TEXT NOT NULL,
  patient_name  TEXT NOT NULL,
  procedure     TEXT,
  scheduled_at  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pre_agendado', -- 'pre_agendado', 'confirmado', 'concluido', 'cancelado'
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments (tenant_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
