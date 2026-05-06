-- F629: 5-Asset Model — System Knowledge (5번째 자산, 암묵지 파일)
-- BeSir §0.1: 메타는 파일(Git), 인스턴스는 PG. 본 D1은 메타 카탈로그.

CREATE TABLE IF NOT EXISTS system_knowledge (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'system_knowledge',
  title TEXT NOT NULL,
  content_ref TEXT NOT NULL,
  content_type TEXT NOT NULL,
  metadata TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (asset_type = 'system_knowledge'),
  CHECK (content_type IN ('sop','transcript','knowledge_graph_input','domain_rule','tacit_knowledge'))
);

CREATE INDEX IF NOT EXISTS idx_system_knowledge_org_type ON system_knowledge(org_id, content_type);
CREATE INDEX IF NOT EXISTS idx_system_knowledge_created ON system_knowledge(created_at DESC);
