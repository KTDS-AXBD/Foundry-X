-- Migration: 0004_agent_orchestration
-- Created: 2026-03-18
-- Description: Agent orchestration — agents registry, capabilities, constraints, tasks (F50)

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_capabilities (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tools TEXT NOT NULL DEFAULT '[]',
  allowed_paths TEXT NOT NULL DEFAULT '[]',
  max_concurrency INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_capabilities_agent ON agent_capabilities(agent_id);

CREATE TABLE IF NOT EXISTS agent_constraints (
  id TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK(tier IN ('always', 'ask', 'never')),
  action TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  enforcement_mode TEXT NOT NULL DEFAULT 'block' CHECK(enforcement_mode IN ('block', 'warn', 'log'))
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  agent_session_id TEXT NOT NULL REFERENCES agent_sessions(id),
  branch TEXT NOT NULL,
  pr_number INTEGER,
  pr_status TEXT NOT NULL DEFAULT 'draft' CHECK(pr_status IN ('draft', 'open', 'merged', 'closed')),
  sdd_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_session ON agent_tasks(agent_session_id);

-- Seed default constraints (11)
-- always tier (enforcement_mode='log')
INSERT OR IGNORE INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES
  ('constraint-01', 'always', 'read-specs', 'Agent must read specs before starting work', 'log'),
  ('constraint-02', 'always', 'run-test', 'Agent must run tests after code changes', 'log'),
  ('constraint-03', 'always', 'run-lint', 'Agent must run linter before committing', 'log'),
  ('constraint-04', 'always', 'create-branch', 'Agent must create a feature branch for work', 'log');

-- ask tier (enforcement_mode='block')
INSERT OR IGNORE INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES
  ('constraint-05', 'ask', 'add-dependency', 'Adding new dependencies requires human approval', 'block'),
  ('constraint-06', 'ask', 'schema-change', 'Database schema changes require human approval', 'block'),
  ('constraint-07', 'ask', 'external-api-call', 'External API calls require human approval', 'block'),
  ('constraint-08', 'ask', 'delete-test', 'Deleting existing tests requires human approval', 'block');

-- never tier (enforcement_mode='block')
INSERT OR IGNORE INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES
  ('constraint-09', 'never', 'push-to-main', 'Pushing directly to main is forbidden', 'block'),
  ('constraint-10', 'never', 'no-verify', 'Skipping git hooks is forbidden', 'block'),
  ('constraint-11', 'never', 'commit-secret', 'Committing secrets/credentials is forbidden', 'block');
