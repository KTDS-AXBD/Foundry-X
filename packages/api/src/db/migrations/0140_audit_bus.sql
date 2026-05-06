-- F606: Audit Log Bus — append-only audit_events + trace_links
-- Sprint 351, FX-REQ-670

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  tenant_id TEXT,
  actor TEXT,
  payload TEXT NOT NULL,
  hmac_signature TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_audit_events_trace ON audit_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type_ts ON audit_events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant ON audit_events(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS audit_events_no_update BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(FAIL, 'audit_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS audit_events_no_delete BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(FAIL, 'audit_events is append-only');
END;

CREATE TABLE IF NOT EXISTS trace_links (
  parent_trace_id TEXT NOT NULL,
  child_trace_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  PRIMARY KEY (parent_trace_id, child_trace_id)
);
