-- Suporte a múltiplos dentistas/esteticistas por clínica com grades e horários independentes
CREATE TABLE IF NOT EXISTS professionals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  specialty       TEXT,
  cro_crm         TEXT,
  working_days    TEXT NOT NULL DEFAULT '[1,2,3,4,5]', -- 0=Dom .. 6=Sáb
  start_hour      TEXT NOT NULL DEFAULT '08:00',
  end_hour        TEXT NOT NULL DEFAULT '18:00',
  break_start     TEXT DEFAULT '12:00',
  break_end       TEXT DEFAULT '13:00',
  procedures_json TEXT NOT NULL DEFAULT '[]',           -- Lista JSON de procedimentos (vazio = atende todos)
  color           TEXT NOT NULL DEFAULT '#10b981',
  active          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_professionals_tenant ON professionals (tenant_id, active);

ALTER TABLE appointments ADD COLUMN professional_id INTEGER REFERENCES professionals(id);
ALTER TABLE appointments ADD COLUMN professional_name TEXT;
