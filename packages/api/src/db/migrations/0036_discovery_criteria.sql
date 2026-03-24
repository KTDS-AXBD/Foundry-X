-- 0036_discovery_criteria.sql
-- Sprint 53: Discovery 9기준 체크리스트 상태 저장 (F183)

CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'needs_revision')),
  evidence TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id, criterion_id)
);

CREATE INDEX idx_discovery_criteria_item ON biz_discovery_criteria(biz_item_id);
