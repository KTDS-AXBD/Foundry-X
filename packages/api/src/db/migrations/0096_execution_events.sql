-- F334: Execution Events — Phase 14 Foundation v2 (Sprint 149)

CREATE TABLE IF NOT EXISTS execution_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ee_task ON execution_events(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ee_tenant_source ON execution_events(tenant_id, source, created_at DESC);
