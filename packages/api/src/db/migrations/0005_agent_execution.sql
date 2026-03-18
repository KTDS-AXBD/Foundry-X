-- 0005_agent_execution.sql
-- Sprint 10: 에이전트 실행 확장 + Spec 충돌 이력

-- agent_tasks에 실행 관련 컬럼 추가
ALTER TABLE agent_tasks ADD COLUMN task_type TEXT;
ALTER TABLE agent_tasks ADD COLUMN result TEXT;
ALTER TABLE agent_tasks ADD COLUMN tokens_used INTEGER DEFAULT 0;
ALTER TABLE agent_tasks ADD COLUMN duration_ms INTEGER DEFAULT 0;
ALTER TABLE agent_tasks ADD COLUMN runner_type TEXT DEFAULT 'claude-api';

-- spec_conflicts 테이블 (F54: 충돌 이력)
CREATE TABLE IF NOT EXISTS spec_conflicts (
  id TEXT PRIMARY KEY,
  new_spec_title TEXT NOT NULL,
  existing_spec_id TEXT,
  conflict_type TEXT NOT NULL CHECK(conflict_type IN ('direct', 'dependency', 'priority', 'scope')),
  severity TEXT NOT NULL CHECK(severity IN ('critical', 'warning', 'info')),
  description TEXT NOT NULL,
  suggestion TEXT,
  resolution TEXT CHECK(resolution IN ('accept', 'reject', 'modify')),
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_spec_conflicts_new_title
  ON spec_conflicts(new_spec_title);
