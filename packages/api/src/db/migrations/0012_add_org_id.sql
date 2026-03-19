-- Migration: 0012_add_org_id
-- Created: 2026-03-19
-- Description: Add org_id to projects, agents, mcp_servers + GitHub sync columns

-- 1. Default organization for existing data
INSERT OR IGNORE INTO organizations (id, name, slug, plan)
VALUES ('org_default', 'Default Organization', 'default', 'free');

-- 2. projects.org_id
ALTER TABLE projects ADD COLUMN org_id TEXT DEFAULT '';
UPDATE projects SET org_id = 'org_default' WHERE org_id = '';
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);

-- 3. agents.org_id
ALTER TABLE agents ADD COLUMN org_id TEXT DEFAULT '';
UPDATE agents SET org_id = 'org_default' WHERE org_id = '';
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id);

-- 4. mcp_servers.org_id
ALTER TABLE mcp_servers ADD COLUMN org_id TEXT DEFAULT '';
UPDATE mcp_servers SET org_id = 'org_default' WHERE org_id = '';
CREATE INDEX IF NOT EXISTS idx_mcpservers_org ON mcp_servers(org_id);

-- 5. GitHub sync columns (for F84)
ALTER TABLE agent_tasks ADD COLUMN github_issue_number INTEGER DEFAULT NULL;
ALTER TABLE agent_prs ADD COLUMN github_pr_number INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_github ON agent_tasks(github_issue_number);
CREATE INDEX IF NOT EXISTS idx_prs_github ON agent_prs(github_pr_number);

-- 6. Existing users -> org_default members
INSERT OR IGNORE INTO org_members (org_id, user_id, role)
SELECT 'org_default', id, 'owner' FROM users;
