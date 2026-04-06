-- F373: Offering Validations (Sprint 168)
-- 교차검증 결과 저장 (O-G-D + Six Hats + Expert)

CREATE TABLE IF NOT EXISTS offering_validations (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'full' CHECK(mode IN ('full','quick')),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK(status IN ('running','passed','failed','error')),
  ogd_run_id TEXT,
  gan_score REAL,
  gan_feedback TEXT,
  sixhats_summary TEXT,
  expert_summary TEXT,
  overall_score REAL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_validations_offering
  ON offering_validations(offering_id, created_at DESC);
