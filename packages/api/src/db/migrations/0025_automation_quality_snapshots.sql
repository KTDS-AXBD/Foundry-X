-- F151: AutomationQualityReporter — 일일 품질 스냅샷 캐시 테이블
CREATE TABLE IF NOT EXISTS automation_quality_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL,
  task_type TEXT,
  total_executions INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 0,
  avg_duration_ms REAL NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  avg_cost_per_execution REAL NOT NULL DEFAULT 0,
  feedback_pending INTEGER NOT NULL DEFAULT 0,
  feedback_applied INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  top_failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_snapshot_date_type ON automation_quality_snapshots(snapshot_date, task_type);
