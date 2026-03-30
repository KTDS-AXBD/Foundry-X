-- F238: MVP 상태 추적 + 이력
CREATE TABLE IF NOT EXISTS mvp_tracking (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_dev'
    CHECK(status IN ('in_dev','testing','released')),
  repo_url TEXT,
  deploy_url TEXT,
  tech_stack TEXT,
  assigned_to TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE TABLE IF NOT EXISTS mvp_status_history (
  id TEXT PRIMARY KEY,
  mvp_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (mvp_id) REFERENCES mvp_tracking(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mvp_tracking_biz_item ON mvp_tracking(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_mvp_tracking_org ON mvp_tracking(org_id, status);
CREATE INDEX IF NOT EXISTS idx_mvp_status_history_mvp ON mvp_status_history(mvp_id, created_at DESC);
