-- F236: Offering Pack 번들 + 항목
CREATE TABLE IF NOT EXISTS offering_packs (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','review','approved','shared')),
  created_by TEXT NOT NULL,
  share_token TEXT UNIQUE,
  share_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE TABLE IF NOT EXISTS offering_pack_items (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  item_type TEXT NOT NULL
    CHECK(item_type IN ('proposal','demo_link','tech_review','pricing','prototype','bmc','custom')),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pack_id) REFERENCES offering_packs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_offering_packs_biz_item ON offering_packs(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_offering_packs_org ON offering_packs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_offering_pack_items_pack ON offering_pack_items(pack_id, sort_order);
