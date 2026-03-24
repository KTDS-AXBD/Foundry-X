-- 0035_biz_starting_points.sql
-- Sprint 52: 5시작점 분류 결과 저장 (F182)

CREATE TABLE IF NOT EXISTS biz_item_starting_points (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL UNIQUE,
  starting_point TEXT NOT NULL CHECK (starting_point IN ('idea', 'market', 'problem', 'tech', 'service')),
  confidence REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  reasoning TEXT,
  needs_confirmation INTEGER NOT NULL DEFAULT 0,
  confirmed_by TEXT,
  confirmed_at TEXT,
  classified_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_biz_starting_points_item ON biz_item_starting_points(biz_item_id);
