-- Sprint 161: F358 failure_patterns — 반복 실패 패턴 저장 (Phase 17)

CREATE TABLE IF NOT EXISTS failure_patterns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  sample_event_ids TEXT,
  sample_payloads TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fp_pattern ON failure_patterns(tenant_id, pattern_key);
CREATE INDEX IF NOT EXISTS idx_fp_status ON failure_patterns(tenant_id, status);
