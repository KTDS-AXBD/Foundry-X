-- F144: Fallback Chain + Gateway Feedback
-- 3 tables: fallback_events, prompt_sanitization_rules, agent_feedback

CREATE TABLE IF NOT EXISTS fallback_events (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  from_model TEXT NOT NULL,
  to_model TEXT NOT NULL,
  reason TEXT NOT NULL,
  latency_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fallback_events_task_type ON fallback_events(task_type);
CREATE INDEX IF NOT EXISTS idx_fallback_events_created_at ON fallback_events(created_at);

CREATE TABLE IF NOT EXISTS prompt_sanitization_rules (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  replacement TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('secret', 'url', 'pii', 'custom')),
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_feedback (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  failure_reason TEXT,
  human_feedback TEXT,
  prompt_hint TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'applied')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_execution ON agent_feedback(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_task_type ON agent_feedback(task_type, status);
