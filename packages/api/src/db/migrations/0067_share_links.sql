-- F233: 산출물 공유 링크
CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL DEFAULT 'view'
    CHECK(access_level IN ('view','comment','edit')),
  expires_at TEXT,
  created_by TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_item ON share_links(biz_item_id);
