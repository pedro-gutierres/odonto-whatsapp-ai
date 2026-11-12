CREATE TABLE agenda_import_batches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  rows_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preview' CHECK (status IN ('preview','committed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TRIGGER block_professional_guard BEFORE INSERT ON appointment_blocks BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM professionals WHERE id=NEW.professional_id AND tenant_id=NEW.tenant_id AND active=1)
    THEN RAISE(ABORT,'BLOCK_PROFESSIONAL_INVALID') END;
END;
