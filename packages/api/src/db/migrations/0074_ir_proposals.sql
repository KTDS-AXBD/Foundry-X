-- F240: IR Bottom-up 제안
CREATE TABLE IF NOT EXISTS ir_proposals (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK(category IN ('technology','market','process','partnership','other')),
  rationale TEXT,
  expected_impact TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK(status IN ('submitted','under_review','approved','rejected')),
  submitted_by TEXT NOT NULL,
  reviewed_by TEXT,
  review_comment TEXT,
  biz_item_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_ir_proposals_org ON ir_proposals(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ir_proposals_submitter ON ir_proposals(submitted_by, created_at DESC);
