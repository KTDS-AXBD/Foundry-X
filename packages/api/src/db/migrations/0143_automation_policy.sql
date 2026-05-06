-- F631: 분析X 자동화O 정책 코드 (whitelist + default-deny)

CREATE TABLE automation_policies (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  metadata TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (action_type IN ('read_only','data_query','state_change','external_api_call','destructive_op')),
  CHECK (allowed IN (0, 1)),
  UNIQUE (org_id, action_type)
);

CREATE INDEX idx_automation_policies_org ON automation_policies(org_id);

CREATE TABLE policy_violations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempted_by TEXT,
  reason TEXT NOT NULL,
  trace_id TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX idx_policy_violations_org_created ON policy_violations(org_id, created_at DESC);

CREATE TRIGGER policy_violations_no_update BEFORE UPDATE ON policy_violations
BEGIN SELECT RAISE(FAIL, 'policy_violations is append-only'); END;
