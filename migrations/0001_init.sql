-- Uma linha por clínica cliente.
CREATE TABLE tenants (
  id               TEXT PRIMARY KEY,                 -- ex: "clinica-sorriso"
  name             TEXT NOT NULL,
  phone_number_id  TEXT NOT NULL UNIQUE,             -- chave de roteamento (vem em todo webhook)
  waba_id          TEXT,
  access_token_enc TEXT,                             -- token do cliente (fase Tech Provider, criptografado)
  bot_config       TEXT NOT NULL DEFAULT '{}',       -- JSON: dados da clínica e regras do bot
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Histórico de mensagens (entrada e saída), sempre ligado a uma clínica.
CREATE TABLE messages (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  contact_wa_id  TEXT NOT NULL,                      -- número do paciente
  contact_name   TEXT,
  direction      TEXT NOT NULL CHECK (direction IN ('in','out')),
  wa_message_id  TEXT UNIQUE,                        -- evita processar a mesma mensagem 2x
  body           TEXT,
  status         TEXT NOT NULL DEFAULT 'received',   -- 'received' -> 'answered'
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_conversa ON messages (tenant_id, contact_wa_id, id);
