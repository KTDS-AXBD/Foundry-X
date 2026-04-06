-- Sprint 161: F358 guard_rail_proposals — Rule 초안 저장 (Phase 17)

CREATE TABLE IF NOT EXISTS guard_rail_proposals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL REFERENCES failure_patterns(id),
  rule_content TEXT NOT NULL,
  rule_filename TEXT NOT NULL,
  rationale TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grp_tenant ON guard_rail_proposals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_grp_pattern ON guard_rail_proposals(pattern_id);
