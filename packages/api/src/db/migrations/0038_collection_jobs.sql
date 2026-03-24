-- 0038_collection_jobs.sql
-- Sprint 57: F179 수집 채널 통합

CREATE TABLE IF NOT EXISTS collection_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  keywords TEXT,
  items_found INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  items_duplicate INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_by TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_collection_jobs_org ON collection_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_channel ON collection_jobs(channel);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_status ON collection_jobs(status);
