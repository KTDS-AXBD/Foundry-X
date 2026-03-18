-- 0009_planner_inbox_worktree.sql
-- Sprint 15: F70 PlannerAgent + F71 Agent Inbox + F72 Worktree

-- F70: 에이전트 계획
CREATE TABLE IF NOT EXISTS agent_plans (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  codebase_analysis TEXT NOT NULL DEFAULT '',
  proposed_steps TEXT NOT NULL DEFAULT '[]',
  estimated_files INTEGER DEFAULT 0,
  risks TEXT DEFAULT '[]',
  estimated_tokens INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'analyzing',
  human_feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  rejected_at TEXT
);

-- F71: 에이전트 메시지
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  acknowledged INTEGER NOT NULL DEFAULT 0,
  parent_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_to_agent
  ON agent_messages(to_agent_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON agent_messages(parent_message_id);

-- F72: 에이전트 worktree
CREATE TABLE IF NOT EXISTS agent_worktrees (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  worktree_path TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'master',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cleaned_at TEXT
);
