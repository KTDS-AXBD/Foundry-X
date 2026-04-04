-- F315: 상태 모니터링 + 알림 + 권한 제어

-- 1. pipeline_permissions — 파이프라인별 승인 가능 역할/사용자
CREATE TABLE IF NOT EXISTS pipeline_permissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pipeline_run_id TEXT NOT NULL,
  user_id TEXT,
  min_role TEXT NOT NULL DEFAULT 'member'
    CHECK(min_role IN ('viewer', 'member', 'admin', 'owner')),
  can_approve INTEGER NOT NULL DEFAULT 1,
  can_abort INTEGER NOT NULL DEFAULT 0,
  granted_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pp_run ON pipeline_permissions(pipeline_run_id);
CREATE INDEX idx_pp_user ON pipeline_permissions(user_id);

-- 2. pipeline_checkpoints 확장 — 승인자 역할 기록
ALTER TABLE pipeline_checkpoints ADD COLUMN approver_role TEXT;
