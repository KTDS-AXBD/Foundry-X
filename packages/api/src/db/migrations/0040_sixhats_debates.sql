-- 0040_sixhats_debates.sql
-- Sprint 56: Six Hats 토론 시뮬레이션 (F188)

CREATE TABLE IF NOT EXISTS sixhats_debates (
  id TEXT PRIMARY KEY,
  prd_id TEXT NOT NULL REFERENCES biz_generated_prds(id),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  total_turns INTEGER NOT NULL DEFAULT 20,
  completed_turns INTEGER NOT NULL DEFAULT 0,
  key_issues TEXT,
  summary TEXT,
  model TEXT NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  org_id TEXT NOT NULL
);

CREATE INDEX idx_sixhats_debates_prd ON sixhats_debates(prd_id);
CREATE INDEX idx_sixhats_debates_org ON sixhats_debates(org_id);

CREATE TABLE IF NOT EXISTS sixhats_turns (
  id TEXT PRIMARY KEY,
  debate_id TEXT NOT NULL REFERENCES sixhats_debates(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL CHECK (turn_number BETWEEN 1 AND 20),
  hat TEXT NOT NULL CHECK (hat IN ('white', 'red', 'black', 'yellow', 'green', 'blue')),
  hat_label TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(debate_id, turn_number)
);

CREATE INDEX idx_sixhats_turns_debate ON sixhats_turns(debate_id);
