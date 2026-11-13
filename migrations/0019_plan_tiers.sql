-- Existing captured periods remain valid. No new payment or trial is inferred.
ALTER TABLE tenants ADD COLUMN plan_tier TEXT CHECK(plan_tier IN ('free','pro','ultra'));
UPDATE tenants SET plan_tier='ultra' WHERE commercial_status='active' AND paddle_subscription_id IS NOT NULL;
-- Preparing accounts can activate Free; existing trials keep their original term.
UPDATE tenants SET plan_tier='free' WHERE commercial_status IN ('preparing','free');
ALTER TABLE tenants ADD COLUMN subscription_starts_at TEXT;
ALTER TABLE tenants ADD COLUMN plan_price_id TEXT;
ALTER TABLE tenants ADD COLUMN auto_renew INTEGER NOT NULL DEFAULT 1 CHECK(auto_renew IN (0,1));
ALTER TABLE tenants ADD COLUMN billing_lock_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN billing_lock_token TEXT;
ALTER TABLE checkout_intents ADD COLUMN plan_tier TEXT CHECK(plan_tier IN ('pro','ultra'));
ALTER TABLE checkout_intents ADD COLUMN auto_renew INTEGER NOT NULL DEFAULT 1 CHECK(auto_renew IN (0,1));

-- Journal persisted before Paddle mutations. A timeout is retried by the billing cron.
CREATE TABLE plan_changes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  subscription_id TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK(plan_tier IN ('free','pro','ultra')),
  billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('monthly','yearly')),
  price_id TEXT,
  auto_renew INTEGER NOT NULL CHECK(auto_renew IN (0,1)),
  effective_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','applied','completed','superseded','failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX idx_plan_change_open ON plan_changes(tenant_id) WHERE status IN ('prepared','applied');
CREATE TABLE plan_usage (
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  month TEXT NOT NULL,
  metric TEXT NOT NULL CHECK(metric IN ('responses','transcription','images','voice')),
  request_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount>0),
  limit_value INTEGER,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','completed','released')),
  PRIMARY KEY(tenant_id,metric,request_id)
);
CREATE INDEX idx_plan_usage_month ON plan_usage(tenant_id,month,metric,status);
CREATE TRIGGER plan_usage_limit BEFORE INSERT ON plan_usage BEGIN
  SELECT CASE WHEN NEW.limit_value IS NOT NULL AND NEW.amount + COALESCE((
    SELECT SUM(amount) FROM plan_usage WHERE tenant_id=NEW.tenant_id AND month=NEW.month AND metric=NEW.metric AND status!='released'
  ),0)>NEW.limit_value THEN RAISE(ABORT,'PLAN_LIMIT') END;
END;

-- Guard concurrent creation/reactivation in the database. Existing records and
-- appointments survive downgrades; only the first N active agendas are bookable.
CREATE TRIGGER professional_plan_insert BEFORE INSERT ON professionals WHEN NEW.active=1 BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM professionals WHERE tenant_id=NEW.tenant_id AND active=1) >= (
    SELECT CASE WHEN (commercial_status='legacy' AND plan_tier IS NULL) OR (plan_tier='ultra' AND julianday(subscription_ends_at)>julianday('now')) THEN 2147483647
      WHEN plan_tier='pro' AND julianday(subscription_ends_at)>julianday('now') THEN 2 ELSE 1 END FROM tenants WHERE id=NEW.tenant_id
  ) THEN RAISE(ABORT,'PROFESSIONAL_PLAN_LIMIT') END;
END;
CREATE TRIGGER professional_plan_activate BEFORE UPDATE OF active ON professionals WHEN NEW.active=1 AND OLD.active=0 BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM professionals WHERE tenant_id=NEW.tenant_id AND active=1) >= (
    SELECT CASE WHEN (commercial_status='legacy' AND plan_tier IS NULL) OR (plan_tier='ultra' AND julianday(subscription_ends_at)>julianday('now')) THEN 2147483647
      WHEN plan_tier='pro' AND julianday(subscription_ends_at)>julianday('now') THEN 2 ELSE 1 END FROM tenants WHERE id=NEW.tenant_id
  ) THEN RAISE(ABORT,'PROFESSIONAL_PLAN_LIMIT') END;
END;

CREATE VIEW plan_bookable_professionals AS
SELECT p.* FROM professionals p JOIN tenants t ON t.id=p.tenant_id WHERE p.active=1 AND (
  (SELECT COUNT(*) FROM professionals older WHERE older.tenant_id=p.tenant_id AND older.active=1 AND older.id<p.id)
  < CASE WHEN (t.commercial_status='legacy' AND t.plan_tier IS NULL) OR (t.plan_tier='ultra' AND julianday(t.subscription_ends_at)>julianday('now')) THEN 2147483647
    WHEN t.plan_tier='pro' AND julianday(t.subscription_ends_at)>julianday('now') THEN 2 ELSE 1 END
);
CREATE TRIGGER appointment_plan_insert BEFORE INSERT ON appointments WHEN NEW.status!='cancelado' AND NEW.professional_id IS NOT NULL BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM plan_bookable_professionals WHERE id=NEW.professional_id AND tenant_id=NEW.tenant_id)
    THEN RAISE(ABORT,'PROFESSIONAL_PLAN_LIMIT') END;
END;
CREATE TRIGGER appointment_plan_move BEFORE UPDATE OF scheduled_at,professional_id,duration ON appointments
WHEN NEW.status!='cancelado' AND NEW.professional_id IS NOT NULL AND (NEW.scheduled_at!=OLD.scheduled_at OR NEW.professional_id IS NOT OLD.professional_id OR NEW.duration IS NOT OLD.duration) BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM plan_bookable_professionals WHERE id=NEW.professional_id AND tenant_id=NEW.tenant_id)
    THEN RAISE(ABORT,'PROFESSIONAL_PLAN_LIMIT') END;
END;
