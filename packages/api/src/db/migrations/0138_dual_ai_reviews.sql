-- F552: Dual AI Review storage (Sprint 303)
-- Stores codex-review.json results from autopilot Phase 5c

CREATE TABLE IF NOT EXISTS dual_ai_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id INTEGER NOT NULL,
  claude_verdict TEXT,
  codex_verdict TEXT,
  codex_json TEXT NOT NULL,
  divergence_score REAL DEFAULT 0.0,
  decision TEXT,
  degraded INTEGER DEFAULT 0,
  degraded_reason TEXT,
  model TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dual_ai_reviews_sprint ON dual_ai_reviews(sprint_id);
