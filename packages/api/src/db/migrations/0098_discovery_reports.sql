-- Sprint 156: F346 — 발굴 완료 리포트 테이블
CREATE TABLE IF NOT EXISTS ax_discovery_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  report_json TEXT NOT NULL DEFAULT '{}',
  overall_verdict TEXT CHECK (overall_verdict IN ('go','conditional','hold','drop')),
  team_decision TEXT CHECK (team_decision IN ('go','hold','drop')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id)
);

CREATE INDEX IF NOT EXISTS idx_adr_biz_item ON ax_discovery_reports(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_adr_org ON ax_discovery_reports(org_id);
