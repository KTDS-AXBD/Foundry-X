-- Migration 0019: Onboarding Feedback + Progress
-- Sprint 29: F121 + F122

CREATE TABLE IF NOT EXISTS onboarding_feedback (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nps_score INTEGER NOT NULL CHECK(nps_score >= 1 AND nps_score <= 10),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON onboarding_feedback(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES organizations(id),
  UNIQUE(tenant_id, user_id, step_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON onboarding_progress(tenant_id, user_id);
