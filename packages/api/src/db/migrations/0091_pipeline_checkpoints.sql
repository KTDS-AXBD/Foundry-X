-- F314: HITL 파이프라인 체크포인트

CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pipeline_run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  checkpoint_type TEXT NOT NULL DEFAULT 'viability'
    CHECK(checkpoint_type IN ('viability', 'commit_gate')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
  questions TEXT,
  response TEXT,
  decided_by TEXT,
  decided_at TEXT,
  deadline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pc_run ON pipeline_checkpoints(pipeline_run_id, step_id);
CREATE INDEX idx_pc_status ON pipeline_checkpoints(status);
