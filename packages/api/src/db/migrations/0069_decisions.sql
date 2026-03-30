-- F239: 의사결정 이력
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  decision TEXT NOT NULL
    CHECK(decision IN ('GO','HOLD','DROP')),
  stage TEXT NOT NULL,
  comment TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_decisions_item ON decisions(biz_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_org ON decisions(org_id, created_at DESC);
