-- F602: 4대 진단 PoC (Missing/Duplicate/Overspec/Inconsistency)

CREATE TABLE diagnostic_runs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  diagnostic_types TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  summary TEXT,
  trace_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  completed_at INTEGER,

  CHECK (status IN ('running','completed','failed'))
);

CREATE INDEX idx_diagnostic_runs_org ON diagnostic_runs(org_id);

CREATE TABLE diagnostic_findings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  diagnostic_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  entity_id TEXT,
  detail TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (diagnostic_type IN ('missing','duplicate','overspec','inconsistency')),
  CHECK (severity IN ('info','warning','critical')),
  FOREIGN KEY (run_id) REFERENCES diagnostic_runs(id)
);

CREATE INDEX idx_diagnostic_findings_run ON diagnostic_findings(run_id);
CREATE INDEX idx_diagnostic_findings_type ON diagnostic_findings(org_id, diagnostic_type);
