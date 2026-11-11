-- Etapa 2: Dados cadastrais da clínica, metadados WhatsApp Embedded Signup e controle ativo/pausado da equipe
ALTER TABLE tenants ADD COLUMN legal_name TEXT;
ALTER TABLE tenants ADD COLUMN cnpj TEXT;
ALTER TABLE tenants ADD COLUMN admin_phone TEXT;
ALTER TABLE tenants ADD COLUMN responsible_name TEXT;
ALTER TABLE tenants ADD COLUMN contact_email TEXT;
ALTER TABLE tenants ADD COLUMN wa_display_phone TEXT;
ALTER TABLE tenants ADD COLUMN wa_verified_name TEXT;
ALTER TABLE tenants ADD COLUMN wa_connected_at TEXT;

ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id, active);
