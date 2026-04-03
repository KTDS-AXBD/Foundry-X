-- Sprint 117: F296 — 통합 평가 결과서
CREATE TABLE IF NOT EXISTS evaluation_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  skill_scores TEXT NOT NULL DEFAULT '{}',
  traffic_light TEXT NOT NULL DEFAULT 'yellow' CHECK(traffic_light IN ('green','yellow','red')),
  traffic_light_history TEXT NOT NULL DEFAULT '[]',
  recommendation TEXT,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_eval_reports_org ON evaluation_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_eval_reports_biz_item ON evaluation_reports(biz_item_id);
