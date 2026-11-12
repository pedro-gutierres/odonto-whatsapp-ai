ALTER TABLE tenants ADD COLUMN paddle_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN paddle_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN billing_event_at TEXT;
ALTER TABLE tenants ADD COLUMN billing_status TEXT;
ALTER TABLE tenants ADD COLUMN renewal_canceled_at TEXT;
CREATE UNIQUE INDEX idx_paddle_subscription ON tenants(paddle_subscription_id) WHERE paddle_subscription_id IS NOT NULL;
ALTER TABLE users ADD COLUMN google_subject TEXT;
CREATE UNIQUE INDEX idx_google_subject ON users(google_subject) WHERE google_subject IS NOT NULL;
CREATE TABLE checkout_intents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_checkout_pending ON checkout_intents(tenant_id) WHERE status='pending';
CREATE TABLE billing_events (
  event_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  occurred_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
