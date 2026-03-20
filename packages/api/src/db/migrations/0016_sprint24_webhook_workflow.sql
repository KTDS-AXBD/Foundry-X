-- 0016_sprint24_webhook_workflow.sql
-- Sprint 24: WebhookRegistry (F99) + Workflow Engine (F101)

-- F99: WebhookRegistry
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL,
  event_types TEXT NOT NULL,
  target_url TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  secret TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  config TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  org_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- F101: Workflow Engine
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,
  template_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  org_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  current_step TEXT,
  context TEXT,
  result TEXT,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(org_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
