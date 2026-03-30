-- Sprint 80: F235 ORB/PRB 게이트 패키지
CREATE TABLE IF NOT EXISTS gate_packages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  gate_type TEXT NOT NULL,
  items TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  download_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
