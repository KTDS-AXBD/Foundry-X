-- F333: TaskState Machine — Phase 14 Foundation v1 (Sprint 148)

-- 현재 태스크 상태
CREATE TABLE IF NOT EXISTS task_states (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  current_state TEXT NOT NULL DEFAULT 'INTAKE',
  agent_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_states_task ON task_states(task_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_states_tenant ON task_states(tenant_id, current_state);

-- 전이 이력
CREATE TABLE IF NOT EXISTS task_state_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  trigger_source TEXT,
  trigger_event TEXT,
  guard_result TEXT,
  transitioned_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tsh_task ON task_state_history(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tsh_tenant ON task_state_history(tenant_id, created_at DESC);
