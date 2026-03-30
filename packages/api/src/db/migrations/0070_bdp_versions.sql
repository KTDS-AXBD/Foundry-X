-- Sprint 80: F234 BDP 편집/버전관리
CREATE TABLE IF NOT EXISTS bdp_versions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version_num INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  is_final INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, version_num)
);
