-- Durable verified notifications. No payment access is granted at receipt time.
CREATE TABLE paddle_webhook_inbox (
 event_id TEXT PRIMARY KEY,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 environment TEXT NOT NULL CHECK(environment IN ('live','sandbox')),
 payload_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','rejected')),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,
 last_error_code TEXT,
 received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 completed_at TEXT
);
CREATE INDEX idx_paddle_inbox_due ON paddle_webhook_inbox(environment,status,next_attempt_at,lease_until);
