-- Additive transition: existing accounts keep their previous operation until reviewed.
-- Never derive a new trial, payment or profile from legacy creation dates.
ALTER TABLE tenants ADD COLUMN commercial_status TEXT NOT NULL DEFAULT 'legacy'
  CHECK (commercial_status IN ('legacy','free','preparing','trial','active','ended'));
ALTER TABLE tenants ADD COLUMN business_kind TEXT CHECK (business_kind IN ('solo','clinic'));
ALTER TABLE tenants ADD COLUMN business_sector TEXT CHECK (business_sector IN ('dentistry','aesthetics'));
ALTER TABLE tenants ADD COLUMN existing_system TEXT;
ALTER TABLE tenants ADD COLUMN uses_external_schedule INTEGER;
ALTER TABLE tenants ADD COLUMN trial_started_at TEXT;
ALTER TABLE tenants ADD COLUMN training_reviewed_at TEXT;
ALTER TABLE tenants ADD COLUMN agenda_ready_at TEXT;
ALTER TABLE tenants ADD COLUMN schedule_mode TEXT CHECK (schedule_mode IN ('aura','dedicated','external_manual','request'));
ALTER TABLE tenants ADD COLUMN whatsapp_diagnosed_at TEXT;
ALTER TABLE tenants ADD COLUMN operational_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN demo_messages_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN demo_messages_limit INTEGER NOT NULL DEFAULT 30;
ALTER TABLE tenants ADD COLUMN subscription_ends_at TEXT;

-- Reservations count against quota immediately, including concurrent requests.
-- Releasing a failed reservation refunds it exactly once. Completed results are replayable.
CREATE TABLE usage_reservations (
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  scope TEXT NOT NULL CHECK (scope IN ('demo','trial')),
  request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','completed','released')),
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (tenant_id,scope,request_id)
);
CREATE TRIGGER reserve_usage_guard BEFORE INSERT ON usage_reservations BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM tenants WHERE id=NEW.tenant_id AND active=1)
    THEN RAISE(ABORT,'ACCOUNT_INACTIVE') END;
  SELECT CASE WHEN NEW.scope='demo' AND NOT EXISTS (
    SELECT 1 FROM tenants WHERE id=NEW.tenant_id AND demo_messages_used < demo_messages_limit)
    THEN RAISE(ABORT,'DEMO_LIMIT') END;
  SELECT CASE WHEN NEW.scope='trial' AND NOT EXISTS (
    SELECT 1 FROM tenants WHERE id=NEW.tenant_id AND commercial_status='trial'
      AND operational_enabled=1 AND trial_started_at IS NOT NULL
      AND julianday(trial_ends_at)>julianday('now') AND trial_messages_used<trial_messages_limit)
    THEN RAISE(ABORT,'TRIAL_LIMIT') END;
END;
CREATE TRIGGER reserve_usage_count AFTER INSERT ON usage_reservations BEGIN
  UPDATE tenants SET
    demo_messages_used=demo_messages_used+CASE WHEN NEW.scope='demo' THEN 1 ELSE 0 END,
    trial_messages_used=trial_messages_used+CASE WHEN NEW.scope='trial' THEN 1 ELSE 0 END
    WHERE id=NEW.tenant_id;
END;
CREATE TRIGGER release_usage_count AFTER UPDATE OF status ON usage_reservations
WHEN OLD.status='reserved' AND NEW.status='released' BEGIN
  UPDATE tenants SET
    demo_messages_used=MAX(0,demo_messages_used-CASE WHEN NEW.scope='demo' THEN 1 ELSE 0 END),
    trial_messages_used=MAX(0,trial_messages_used-CASE WHEN NEW.scope='trial' THEN 1 ELSE 0 END)
    WHERE id=NEW.tenant_id;
END;
