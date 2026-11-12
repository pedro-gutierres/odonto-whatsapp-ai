CREATE TABLE appointment_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  professional_id INTEGER NOT NULL REFERENCES professionals(id),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  batch_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_blocks_tenant ON appointment_blocks(tenant_id,professional_id,starts_at);
