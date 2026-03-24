-- 0038_prd_reviews.sql
-- Sprint 55: 다중 AI 검토 파이프라인 (F186)

CREATE TABLE IF NOT EXISTS prd_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prd_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  verdict TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  feedback TEXT,
  raw_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  org_id TEXT NOT NULL,
  FOREIGN KEY (prd_id) REFERENCES biz_generated_prds(id) ON DELETE CASCADE,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_prd_reviews_prd ON prd_reviews(prd_id);

CREATE TABLE IF NOT EXISTS prd_review_scorecards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prd_id TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  verdict TEXT NOT NULL,
  provider_count INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (prd_id) REFERENCES biz_generated_prds(id) ON DELETE CASCADE
);

CREATE INDEX idx_prd_scorecards_prd ON prd_review_scorecards(prd_id);
