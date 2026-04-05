-- Sprint 155 F344: 페르소나 가중치/맥락 설정
CREATE TABLE IF NOT EXISTS ax_persona_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  item_id TEXT NOT NULL REFERENCES ax_discovery_items(id),
  org_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  weights TEXT NOT NULL DEFAULT '{}',
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)
);
CREATE INDEX IF NOT EXISTS idx_persona_configs_item ON ax_persona_configs(item_id);
