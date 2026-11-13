CREATE TABLE plan_offers (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  responses INTEGER,
  transcription INTEGER,
  images INTEGER,
  professionals INTEGER,
  voice INTEGER,
  monthly INTEGER NOT NULL,
  yearly INTEGER NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  UNIQUE(plan_id,version)
);
CREATE UNIQUE INDEX plan_offer_published ON plan_offers(plan_id) WHERE published=1;
INSERT INTO plan_offers VALUES
 ('free-v1','free',1,'Free',50,300,15,1,0,0,0,1),
 ('pro-v1','pro',1,'Pro',1000,3600,200,2,900,12900,118800,1),
 ('ultra-v1','ultra',1,'Ultra',NULL,NULL,NULL,NULL,3600,24900,238800,1);

CREATE TABLE plan_offer_prices (
  environment TEXT NOT NULL,
  price_id TEXT NOT NULL,
  offer_id TEXT NOT NULL REFERENCES plan_offers(id),
  cycle TEXT NOT NULL CHECK(cycle IN ('monthly','yearly')),
  PRIMARY KEY(environment,price_id)
);
CREATE UNIQUE INDEX plan_offer_cycle_price ON plan_offer_prices(environment,offer_id,cycle);
ALTER TABLE tenants ADD COLUMN plan_offer_id TEXT REFERENCES plan_offers(id);
ALTER TABLE tenants ADD COLUMN quota_anchor_at TEXT;
ALTER TABLE tenants ADD COLUMN quota_bridge_at TEXT;
ALTER TABLE tenants ADD COLUMN paid_transaction_id TEXT;
ALTER TABLE tenants ADD COLUMN billing_next_at TEXT;
ALTER TABLE tenants ADD COLUMN billing_recheck_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN paid_access_revoked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE checkout_intents ADD COLUMN offer_id TEXT REFERENCES plan_offers(id);
ALTER TABLE checkout_intents ADD COLUMN price_id TEXT;
ALTER TABLE checkout_intents ADD COLUMN expected_amount INTEGER;
ALTER TABLE plan_changes ADD COLUMN offer_id TEXT REFERENCES plan_offers(id);
ALTER TABLE plan_changes ADD COLUMN expected_amount INTEGER;
ALTER TABLE plan_changes ADD COLUMN undo_requested INTEGER NOT NULL DEFAULT 0;
UPDATE tenants SET plan_offer_id=plan_tier||'-v1' WHERE plan_tier IS NOT NULL;
UPDATE tenants SET quota_anchor_at=COALESCE(subscription_starts_at,created_at),
 quota_bridge_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE paddle_subscription_id IS NOT NULL AND subscription_ends_at IS NOT NULL;
UPDATE tenants SET quota_anchor_at=strftime('%Y-%m-%dT%H:%M:%fZ',quota_anchor_at) WHERE quota_anchor_at IS NOT NULL;

ALTER TABLE plan_usage ADD COLUMN reserved_at TEXT;
ALTER TABLE plan_usage ADD COLUMN carry_month TEXT;
ALTER TABLE plan_usage ADD COLUMN base_month TEXT;
ALTER TABLE plan_usage ADD COLUMN grace_from TEXT;
ALTER TABLE plan_usage ADD COLUMN grace_limit INTEGER;
DROP TRIGGER plan_usage_limit;
CREATE TRIGGER plan_usage_limit BEFORE INSERT ON plan_usage BEGIN
  SELECT CASE WHEN NEW.limit_value IS NOT NULL AND NEW.amount + COALESCE((
    SELECT SUM(amount) FROM plan_usage WHERE tenant_id=NEW.tenant_id AND metric=NEW.metric
      AND (month IN (COALESCE(NEW.base_month,NEW.month),NEW.carry_month)
        OR (length(month)=7 AND reserved_at>=COALESCE(NEW.base_month,NEW.month))) AND status!='released'
      AND (NEW.grace_from IS NULL OR reserved_at IS NULL OR reserved_at < NEW.grace_from)
  ),0) + COALESCE((
    SELECT SUM(amount) FROM plan_usage WHERE tenant_id=NEW.tenant_id AND metric=NEW.metric
      AND reserved_at>=NEW.grace_from AND status!='released'
  ),0)>NEW.limit_value THEN RAISE(ABORT,'PLAN_LIMIT') END;
  SELECT CASE WHEN NEW.grace_limit IS NOT NULL AND NEW.amount + COALESCE((
    SELECT SUM(amount) FROM plan_usage WHERE tenant_id=NEW.tenant_id AND metric=NEW.metric
      AND reserved_at>=NEW.grace_from AND status!='released'
  ),0)>NEW.grace_limit THEN RAISE(ABORT,'PLAN_LIMIT') END;
END;
CREATE INDEX plan_usage_reserved_at ON plan_usage(tenant_id,metric,reserved_at);

CREATE TABLE billing_payments (
  transaction_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  subscription_id TEXT NOT NULL,
  offer_id TEXT NOT NULL REFERENCES plan_offers(id),
  price_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  amount INTEGER,
  UNIQUE(subscription_id,starts_at)
);
CREATE TABLE billing_adjustments (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  action TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
CREATE INDEX billing_adjustments_transaction ON billing_adjustments(transaction_id);
CREATE TABLE billing_reviews (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE TABLE plan_offer_migrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  subscription_id TEXT NOT NULL,
  source_offer_id TEXT NOT NULL REFERENCES plan_offers(id),
  target_offer_id TEXT NOT NULL REFERENCES plan_offers(id),
  cycle TEXT NOT NULL CHECK(cycle IN ('monthly','yearly')),
  effective_at TEXT NOT NULL,
  accept_by TEXT NOT NULL,
  email_to TEXT NOT NULL,
  notice_started_at TEXT,
  notice_sent_at TEXT,
  notice_id TEXT,
  notice_delivered_at TEXT,
  accepted_at TEXT,
  accepted_by INTEGER,
  status TEXT NOT NULL DEFAULT 'notice_pending' CHECK(status IN ('notice_pending','offered','accepted','completed','canceled','deferred','review'))
);
CREATE UNIQUE INDEX plan_offer_migration_open ON plan_offer_migrations(tenant_id)
 WHERE status IN ('notice_pending','offered','accepted','review','deferred');

ALTER TABLE professionals ADD COLUMN plan_priority INTEGER;
CREATE VIEW billing_entitlements AS
SELECT id AS tenant_id, CASE
  WHEN paid_access_revoked=0 AND COALESCE(plan_offer_id,plan_tier||'-v1') IS NOT NULL AND
    julianday(subscription_ends_at)>julianday('now') THEN COALESCE(plan_offer_id,plan_tier||'-v1')
  WHEN paid_access_revoked=0 AND auto_renew=1 AND paddle_subscription_id IS NOT NULL
    AND renewal_canceled_at IS NULL AND billing_status IN ('active','past_due')
    AND julianday(subscription_ends_at,'+7 days')>julianday('now') THEN COALESCE(plan_offer_id,plan_tier||'-v1','free-v1')
  WHEN (commercial_status IS NULL OR commercial_status='legacy') AND plan_tier IS NULL THEN 'ultra-v1'
  ELSE COALESCE((SELECT id FROM plan_offers WHERE plan_id='free' AND published=1),'free-v1') END AS offer_id
FROM tenants;

DROP TRIGGER professional_plan_insert;
DROP TRIGGER professional_plan_activate;
DROP VIEW plan_bookable_professionals;
CREATE VIEW plan_bookable_professionals AS
SELECT p.* FROM professionals p JOIN billing_entitlements e ON e.tenant_id=p.tenant_id
JOIN plan_offers o ON o.id=e.offer_id
WHERE p.active=1 AND (o.professionals IS NULL OR (
  SELECT COUNT(*) FROM professionals other WHERE other.tenant_id=p.tenant_id AND other.active=1
    AND (COALESCE(other.plan_priority,2147483647),other.id)<(COALESCE(p.plan_priority,2147483647),p.id)
)<o.professionals);
CREATE TRIGGER professional_plan_insert BEFORE INSERT ON professionals WHEN NEW.active=1 BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM professionals WHERE tenant_id=NEW.tenant_id AND active=1) >= (
    SELECT professionals FROM billing_entitlements e JOIN plan_offers o ON o.id=e.offer_id WHERE e.tenant_id=NEW.tenant_id
  ) THEN RAISE(ABORT,'PROFESSIONAL_PLAN_LIMIT') END;
END;
CREATE TRIGGER professional_plan_activate BEFORE UPDATE OF active ON professionals WHEN NEW.active=1 AND OLD.active=0 BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM professionals WHERE tenant_id=NEW.tenant_id AND active=1) >= (
    SELECT professionals FROM billing_entitlements e JOIN plan_offers o ON o.id=e.offer_id WHERE e.tenant_id=NEW.tenant_id
  ) THEN RAISE(ABORT,'PROFESSIONAL_PLAN_LIMIT') END;
END;
