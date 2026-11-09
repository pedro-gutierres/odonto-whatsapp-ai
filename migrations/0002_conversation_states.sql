-- Controle de intervenção humana (quando a secretária pausa a IA em um chat específico)
CREATE TABLE IF NOT EXISTS conversation_states (
  tenant_id      TEXT NOT NULL,
  contact_wa_id  TEXT NOT NULL,
  ai_paused      INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, contact_wa_id)
);
