-- ═══════════════════════════════════════════════════════
-- Migration 0018: KPI Events + Reconciliation Runs
-- Sprint 27: F100 + F99 + F101
-- ═══════════════════════════════════════════════════════

-- F100: KPI 이벤트 로깅
CREATE TABLE IF NOT EXISTS kpi_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('page_view', 'api_call', 'agent_task', 'cli_invoke', 'sdd_check')),
  user_id TEXT,
  agent_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_events_tenant_type
  ON kpi_events(tenant_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_kpi_events_created
  ON kpi_events(created_at);

-- F99: Reconciliation 실행 이력
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('cron', 'manual')),
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
  strategy TEXT NOT NULL DEFAULT 'git-wins' CHECK(strategy IN ('git-wins', 'db-wins', 'manual')),
  drift_count INTEGER NOT NULL DEFAULT 0,
  fixed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  report TEXT DEFAULT '{}',
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_tenant
  ON reconciliation_runs(tenant_id, started_at DESC);

-- F101: agent_tasks에 auto_fix 관련 컬럼 추가
ALTER TABLE agent_tasks ADD COLUMN hook_status TEXT DEFAULT NULL;
ALTER TABLE agent_tasks ADD COLUMN auto_fix_attempts INTEGER DEFAULT 0;
ALTER TABLE agent_tasks ADD COLUMN auto_fix_log TEXT DEFAULT NULL;
