CREATE TABLE support_threads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_level INTEGER NOT NULL CHECK(access_level IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX support_active_thread ON support_threads(tenant_id,user_id,access_level) WHERE active=1;
CREATE INDEX support_threads_tenant_user ON support_threads(tenant_id,user_id);
CREATE INDEX support_thread_retention ON support_threads(updated_at);

CREATE TABLE support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX support_messages_thread ON support_messages(thread_id,id);
CREATE TRIGGER support_message_activity AFTER INSERT ON support_messages BEGIN
  UPDATE support_threads SET updated_at=NEW.created_at WHERE id=NEW.thread_id;
END;

CREATE TABLE support_chat_requests (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_level INTEGER NOT NULL CHECK(access_level IN (0,1)),
  request_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('support','simulation')),
  thread_id TEXT REFERENCES support_threads(id) ON DELETE CASCADE,
  payload_hash TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','completed','failed')),
  lease TEXT NOT NULL,
  lease_until INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  reply TEXT,
  PRIMARY KEY(tenant_id,user_id,access_level,request_id)
);
CREATE INDEX support_chat_requests_pending ON support_chat_requests(tenant_id,status,lease_until,user_id);
CREATE INDEX support_chat_requests_thread ON support_chat_requests(thread_id,updated_at);
CREATE INDEX support_chat_requests_cleanup ON support_chat_requests(updated_at);

CREATE TABLE support_chat_attempts (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  at INTEGER NOT NULL
);
CREATE INDEX support_chat_attempts_tenant ON support_chat_attempts(tenant_id,at,user_id);
CREATE INDEX support_chat_attempts_time ON support_chat_attempts(at);

CREATE TRIGGER support_chat_reserve BEFORE INSERT ON support_chat_requests BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users u JOIN tenants t ON t.id=u.tenant_id
    WHERE u.id=NEW.user_id AND t.id=NEW.tenant_id AND u.active=1 AND t.active=1
      AND u.role IN ('admin','staff') AND (u.role='admin')=NEW.access_level)
    THEN RAISE(ABORT,'SUPPORT_ACCESS_CHANGED') END;
  SELECT CASE WHEN NEW.kind='support' AND NOT EXISTS(SELECT 1 FROM support_threads th
    WHERE th.id=NEW.thread_id AND th.active=1
      AND th.tenant_id=NEW.tenant_id AND th.user_id=NEW.user_id AND th.access_level=NEW.access_level)
    THEN RAISE(ABORT,'SUPPORT_THREAD_CHANGED') END;
  SELECT CASE WHEN NEW.status='pending' AND EXISTS(SELECT 1 FROM support_chat_requests
    WHERE tenant_id=NEW.tenant_id AND user_id=NEW.user_id AND status='pending' AND lease_until>NEW.updated_at)
    THEN RAISE(ABORT,'SUPPORT_BUSY') END;
  SELECT CASE WHEN NEW.status='pending' AND (SELECT COUNT(*) FROM support_chat_requests
    WHERE tenant_id=NEW.tenant_id AND status='pending' AND lease_until>NEW.updated_at)>=4
    THEN RAISE(ABORT,'SUPPORT_BUSY') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM support_chat_attempts WHERE tenant_id=NEW.tenant_id AND at>NEW.updated_at-60000)>=40
    OR (SELECT COUNT(*) FROM support_chat_attempts WHERE tenant_id=NEW.tenant_id AND user_id=NEW.user_id AND at>NEW.updated_at-60000)>=12
    THEN RAISE(ABORT,'SUPPORT_RATE_LIMIT') END;
END;

CREATE TRIGGER support_chat_inserted AFTER INSERT ON support_chat_requests BEGIN
  INSERT INTO support_chat_attempts(tenant_id,user_id,at) VALUES(NEW.tenant_id,NEW.user_id,NEW.updated_at);
  INSERT INTO support_messages(thread_id,role,content,request_id)
    SELECT NEW.thread_id,'user',NEW.message,NEW.request_id WHERE NEW.kind='support';
  UPDATE support_chat_requests SET message=NULL WHERE rowid=NEW.rowid;
END;

CREATE TRIGGER support_chat_retry BEFORE UPDATE OF lease ON support_chat_requests WHEN NEW.status='pending' BEGIN
  SELECT CASE WHEN EXISTS(SELECT 1 FROM support_chat_requests
    WHERE tenant_id=NEW.tenant_id AND user_id=NEW.user_id AND status='pending' AND lease_until>NEW.updated_at)
    THEN RAISE(ABORT,'SUPPORT_BUSY') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM support_chat_requests
    WHERE tenant_id=NEW.tenant_id AND status='pending' AND lease_until>NEW.updated_at)>=4
    THEN RAISE(ABORT,'SUPPORT_BUSY') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM support_chat_attempts WHERE tenant_id=NEW.tenant_id AND at>NEW.updated_at-60000)>=40
    OR (SELECT COUNT(*) FROM support_chat_attempts WHERE tenant_id=NEW.tenant_id AND user_id=NEW.user_id AND at>NEW.updated_at-60000)>=12
    THEN RAISE(ABORT,'SUPPORT_RATE_LIMIT') END;
  INSERT INTO support_chat_attempts(tenant_id,user_id,at) VALUES(NEW.tenant_id,NEW.user_id,NEW.updated_at);
END;

CREATE TRIGGER support_chat_answered AFTER UPDATE OF status ON support_chat_requests
WHEN NEW.status='completed' AND OLD.status='pending' AND NEW.thread_id IS NOT NULL AND NEW.reply IS NOT NULL BEGIN
  INSERT INTO support_messages(thread_id,role,content,request_id)
    VALUES(NEW.thread_id,'assistant',NEW.reply,NEW.request_id);
END;
