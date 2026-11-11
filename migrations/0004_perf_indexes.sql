-- Índice de performance por clínica para listagem e polling (/api/sync-check)
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages (tenant_id, id);
