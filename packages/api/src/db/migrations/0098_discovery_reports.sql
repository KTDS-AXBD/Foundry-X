-- Sprint 154: F342 발굴 완료 리포트 — 9탭 데이터 + 종합 판정 + 공유 토큰
-- (0100과 통합: item_id 컬럼 + shared_token + verdict enum 대문자)
CREATE TABLE IF NOT EXISTS ax_discovery_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  report_json TEXT NOT NULL DEFAULT '{}',
  overall_verdict TEXT DEFAULT NULL
    CHECK(overall_verdict IN ('Go', 'Conditional', 'NoGo')),
  team_decision TEXT DEFAULT NULL
    CHECK(team_decision IN ('Go', 'Hold', 'Drop')),
  shared_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_adr_item ON ax_discovery_reports(item_id);
CREATE INDEX IF NOT EXISTS idx_adr_org ON ax_discovery_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_adr_shared ON ax_discovery_reports(shared_token);
