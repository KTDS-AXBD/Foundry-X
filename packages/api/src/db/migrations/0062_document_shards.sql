-- F223: 문서 Sharding
CREATE TABLE IF NOT EXISTS document_shards (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  document_title TEXT NOT NULL DEFAULT '',
  section_index INTEGER NOT NULL,
  heading TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]',
  agent_roles TEXT NOT NULL DEFAULT '[]',
  token_count INTEGER NOT NULL DEFAULT 0,
  org_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shards_doc ON document_shards(document_id);
CREATE INDEX IF NOT EXISTS idx_shards_org ON document_shards(org_id);
