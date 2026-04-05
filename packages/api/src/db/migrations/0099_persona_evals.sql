-- Sprint 154: F342 페르소나 평가 결과 — 페르소나별 7축 점수 + 판정
CREATE TABLE IF NOT EXISTS ax_persona_evals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,
  scores TEXT NOT NULL DEFAULT '{}',
  verdict TEXT NOT NULL DEFAULT 'Conditional'
    CHECK(verdict IN ('Go', 'Conditional', 'NoGo')),
  summary TEXT NOT NULL DEFAULT '',
  concern TEXT,
  condition TEXT,
  eval_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250514',
  eval_duration_ms INTEGER,
  eval_cost_usd REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_ape_item ON ax_persona_evals(item_id);
CREATE INDEX IF NOT EXISTS idx_ape_org ON ax_persona_evals(org_id);
CREATE INDEX IF NOT EXISTS idx_ape_verdict ON ax_persona_evals(verdict);
