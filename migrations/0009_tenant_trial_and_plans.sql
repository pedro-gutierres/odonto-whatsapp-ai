-- Migration 0009: Controle de planos, limites de mensagens e período de Trial
ALTER TABLE tenants ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'trial' CHECK (plan_status IN ('trial', 'active', 'past_due', 'canceled'));
ALTER TABLE tenants ADD COLUMN trial_ends_at TEXT;
ALTER TABLE tenants ADD COLUMN trial_messages_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN trial_messages_limit INTEGER NOT NULL DEFAULT 100;
ALTER TABLE tenants ADD COLUMN billing_cycle TEXT DEFAULT 'monthly';

-- Backfill retrocompatível para clínicas existentes: define o término do trial em 7 dias a partir da criação ou do momento atual
UPDATE tenants
SET trial_ends_at = datetime(COALESCE(created_at, datetime('now')), '+7 days')
WHERE trial_ends_at IS NULL;
