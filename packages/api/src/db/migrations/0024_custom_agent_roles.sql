-- F146: 에이전트 역할 커스터마이징
CREATE TABLE IF NOT EXISTS custom_agent_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  preferred_model TEXT,
  preferred_runner_type TEXT DEFAULT 'openrouter',
  task_type TEXT NOT NULL DEFAULT 'code-review',
  org_id TEXT NOT NULL DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_org ON custom_agent_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_task ON custom_agent_roles(task_type);
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON custom_agent_roles(name);
