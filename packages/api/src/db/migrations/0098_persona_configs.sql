-- Sprint 154: F342 페르소나 설정 — 8인 AI 페르소나별 가중치/맥락
CREATE TABLE IF NOT EXISTS ax_persona_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  persona_role TEXT NOT NULL DEFAULT '',
  weights TEXT NOT NULL DEFAULT '{}',
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_apc_item ON ax_persona_configs(item_id);
CREATE INDEX IF NOT EXISTS idx_apc_org ON ax_persona_configs(org_id);
