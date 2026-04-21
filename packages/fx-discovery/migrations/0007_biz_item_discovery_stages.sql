-- Sprint 94: F263 biz-item별 발굴 프로세스 단계 진행 추적
CREATE TABLE IF NOT EXISTS biz_item_discovery_stages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('2-0','2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_bids_biz_item ON biz_item_discovery_stages(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_bids_org ON biz_item_discovery_stages(org_id);
