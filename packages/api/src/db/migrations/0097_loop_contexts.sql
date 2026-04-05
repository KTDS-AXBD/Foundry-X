-- F335: Loop Contexts — Phase 14 Foundation v3 (Sprint 150)

CREATE TABLE IF NOT EXISTS loop_contexts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  entry_state TEXT NOT NULL,
  trigger_event_id TEXT,
  loop_mode TEXT NOT NULL,
  current_round INTEGER NOT NULL DEFAULT 0,
  max_rounds INTEGER NOT NULL DEFAULT 3,
  exit_target TEXT NOT NULL,
  convergence TEXT,
  history TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lc_task ON loop_contexts(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lc_tenant ON loop_contexts(tenant_id, status);
