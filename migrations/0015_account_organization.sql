-- Additive metadata; preserve existing constraints and quota/agenda triggers.
ALTER TABLE tenants ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0,1));
ALTER TABLE tenants ADD COLUMN test_label TEXT;
-- business_sector remains dentistry/aesthetics until a dedicated table rebuild migration.
-- Reporting supports both; registration must not persist both against the existing CHECK.
