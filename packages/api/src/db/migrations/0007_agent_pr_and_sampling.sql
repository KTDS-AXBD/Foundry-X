-- Sprint 13: agent_prs + mcp_sampling_log

-- 에이전트 PR 추적 테이블
CREATE TABLE IF NOT EXISTS agent_prs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id TEXT REFERENCES agent_tasks(id),
  repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT '',
  pr_number INTEGER,
  pr_url TEXT,
  status TEXT NOT NULL DEFAULT 'creating',
  review_agent_id TEXT,
  review_decision TEXT,
  sdd_score INTEGER,
  quality_score INTEGER,
  security_issues TEXT,
  merge_strategy TEXT DEFAULT 'squash',
  merged_at TEXT,
  commit_sha TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_prs_status ON agent_prs(status);
CREATE INDEX IF NOT EXISTS idx_agent_prs_agent ON agent_prs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_prs_merged_at ON agent_prs(merged_at);

-- MCP Sampling 이력 테이블
CREATE TABLE IF NOT EXISTS mcp_sampling_log (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES mcp_servers(id),
  model TEXT NOT NULL,
  max_tokens INTEGER NOT NULL,
  tokens_used INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sampling_log_server ON mcp_sampling_log(server_id);
CREATE INDEX IF NOT EXISTS idx_sampling_log_created ON mcp_sampling_log(created_at);
