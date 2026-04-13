-- F530: Meta Layer (L4) — agent_improvement_proposals 테이블 (Sprint 283)
CREATE TABLE IF NOT EXISTS agent_improvement_proposals (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  agent_id         TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('prompt', 'tool', 'model', 'graph')),
  title            TEXT NOT NULL,
  reasoning        TEXT NOT NULL,
  yaml_diff        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aip_session ON agent_improvement_proposals(session_id);
CREATE INDEX IF NOT EXISTS idx_aip_agent   ON agent_improvement_proposals(agent_id);
CREATE INDEX IF NOT EXISTS idx_aip_status  ON agent_improvement_proposals(status);
