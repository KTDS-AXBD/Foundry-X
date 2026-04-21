-- 0039_biz_item_trend_reports.sql
-- Sprint 57: F190 시장/트렌드 데이터 자동 연동

CREATE TABLE IF NOT EXISTS biz_item_trend_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  market_summary TEXT,
  market_size_estimate TEXT,
  competitors TEXT,
  trends TEXT,
  keywords_used TEXT,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  analyzed_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trend_reports_biz_item ON biz_item_trend_reports(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_trend_reports_expires ON biz_item_trend_reports(expires_at);
