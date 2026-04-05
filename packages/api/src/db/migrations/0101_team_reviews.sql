-- Sprint 154: F342 팀 검토 기록 — Go/Hold/Drop 투표 + 코멘트
CREATE TABLE IF NOT EXISTS ax_team_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL CHECK(decision IN ('Go', 'Hold', 'Drop')),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_atr_item ON ax_team_reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_atr_org ON ax_team_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_atr_reviewer ON ax_team_reviews(reviewer_id);
