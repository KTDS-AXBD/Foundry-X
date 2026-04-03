-- Sprint 116: F294 2-tier 검증 + F295 미팅 관리

-- F294: pipeline_stages에 validation_tier 컬럼 추가
ALTER TABLE pipeline_stages ADD COLUMN validation_tier TEXT DEFAULT 'none';

-- F295: expert_meetings 테이블
CREATE TABLE IF NOT EXISTS expert_meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'interview',
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  attendees TEXT NOT NULL DEFAULT '[]',
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_expert_meetings_org ON expert_meetings(org_id, biz_item_id);
CREATE INDEX IF NOT EXISTS idx_expert_meetings_status ON expert_meetings(org_id, status);

-- F294: validation_history 테이블 (검증 이력 추적)
CREATE TABLE IF NOT EXISTS validation_history (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  decision TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_validation_history_item ON validation_history(biz_item_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_history_org ON validation_history(org_id, decided_at DESC);
