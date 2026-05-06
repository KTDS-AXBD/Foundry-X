-- F615: Guard-X Solo (T4) — guard_decisions append-only

CREATE TABLE IF NOT EXISTS guard_decisions (
  id TEXT PRIMARY KEY,
  check_id TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL,
  tenant_id TEXT,
  action_type TEXT NOT NULL,
  policy_id TEXT,
  violation INTEGER NOT NULL DEFAULT 0,
  audit_event_id INTEGER,
  hmac_signature TEXT NOT NULL,
  actor TEXT,
  metadata TEXT,
  decided_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (violation IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_guard_decisions_org ON guard_decisions(org_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_guard_decisions_action ON guard_decisions(org_id, action_type, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_guard_decisions_violations ON guard_decisions(violation) WHERE violation = 1;

CREATE TRIGGER IF NOT EXISTS guard_decisions_no_update BEFORE UPDATE ON guard_decisions
BEGIN SELECT RAISE(FAIL, 'guard_decisions is append-only'); END;
