-- Sprint 137: Marker.io feedback automation queue (F319)
CREATE TABLE IF NOT EXISTS feedback_queue (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  github_issue_number INTEGER NOT NULL,
  github_issue_url TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  labels TEXT NOT NULL DEFAULT '[]',
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','processing','done','failed','skipped')),
  agent_pr_url TEXT,
  agent_log TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_queue_status ON feedback_queue(status);
CREATE INDEX IF NOT EXISTS idx_feedback_queue_org ON feedback_queue(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_queue_issue ON feedback_queue(org_id, github_issue_number);
