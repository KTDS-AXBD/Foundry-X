-- Sprint 155 F345: 페르소나별 AI 평가 결과
CREATE TABLE IF NOT EXISTS ax_persona_evals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  item_id TEXT NOT NULL REFERENCES ax_discovery_items(id),
  org_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  scores TEXT NOT NULL DEFAULT '{}',
  verdict TEXT NOT NULL DEFAULT 'pending',
  summary TEXT,
  concerns TEXT,
  condition TEXT,
  eval_metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)
);
CREATE INDEX IF NOT EXISTS idx_persona_evals_item ON ax_persona_evals(item_id);
