-- F529: Agent Streaming (L1) — agent_run_metrics 테이블 (Sprint 282)
CREATE TABLE IF NOT EXISTS agent_run_metrics (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL,
  agent_id          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'running',
  input_tokens      INTEGER DEFAULT 0,
  output_tokens     INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  rounds            INTEGER DEFAULT 0,
  stop_reason       TEXT,
  duration_ms       INTEGER,
  error_msg         TEXT,
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_arm_session ON agent_run_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_arm_agent   ON agent_run_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_arm_status  ON agent_run_metrics(status);
