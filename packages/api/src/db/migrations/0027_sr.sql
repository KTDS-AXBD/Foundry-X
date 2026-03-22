-- 0027_sr.sql — SR 요청 관리 (F116 KT DS SR 시나리오 구체화)

CREATE TABLE sr_requests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sr_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  confidence REAL DEFAULT 0,
  matched_keywords TEXT,
  requester_id TEXT,
  workflow_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE sr_workflow_runs (
  id TEXT PRIMARY KEY,
  sr_id TEXT NOT NULL,
  workflow_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  steps_completed INTEGER DEFAULT 0,
  steps_total INTEGER DEFAULT 0,
  result_summary TEXT,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (sr_id) REFERENCES sr_requests(id)
);

CREATE INDEX idx_sr_requests_org ON sr_requests(org_id);
CREATE INDEX idx_sr_requests_status ON sr_requests(status);
CREATE INDEX idx_sr_requests_type ON sr_requests(sr_type);
CREATE INDEX idx_sr_workflow_runs_sr ON sr_workflow_runs(sr_id);
