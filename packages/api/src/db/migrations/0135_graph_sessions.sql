-- F535: Sprint 288 — graph_sessions 테이블 (Graph 실행 정식 API)
CREATE TABLE IF NOT EXISTS graph_sessions (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  discovery_type TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_msg TEXT,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_graph_sessions_biz_item ON graph_sessions(biz_item_id, started_at DESC);
