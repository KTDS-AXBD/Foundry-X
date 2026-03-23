-- 0033_biz_items.sql
-- Sprint 51: biz_items + biz_item_classifications (F175)

CREATE TABLE IF NOT EXISTS biz_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'field',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX idx_biz_items_org ON biz_items(org_id);
CREATE INDEX idx_biz_items_status ON biz_items(status);

CREATE TABLE IF NOT EXISTS biz_item_classifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.0,
  turn_1_answer TEXT,
  turn_2_answer TEXT,
  turn_3_answer TEXT,
  analysis_weights TEXT NOT NULL DEFAULT '{}',
  classified_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);
