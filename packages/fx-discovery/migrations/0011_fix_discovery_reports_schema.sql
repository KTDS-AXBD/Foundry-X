-- Sprint scratch-151633: ax_discovery_reports 스키마 drift 복구
--
-- 문제: 0098_discovery_reports.sql 이 CREATE TABLE IF NOT EXISTS 로 작성되어
--       이미 존재하던 이전 버전 테이블(biz_item_id / verdict 소문자 / shared_token 없음)을
--       만나 no-op 처리됨. 이후 서비스 코드(`item_id` 참조)와 스키마(`biz_item_id`)가
--       어긋나 `/api/ax-bd/discovery-report/:itemId` 500 + saveHtml/upsert 모두 실패.
--
-- 조치: 0 rows(모든 쓰기 실패 누적) 이므로 안전하게 DROP + CREATE.
--       0098 + 0122 의도된 최종 스키마로 재생성.

DROP TABLE IF EXISTS ax_discovery_reports;

CREATE TABLE ax_discovery_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  report_json TEXT NOT NULL DEFAULT '{}',
  report_html TEXT,
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
