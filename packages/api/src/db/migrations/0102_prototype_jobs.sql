-- Sprint 159: F353 Prototype Auto-Gen Job Queue
CREATE TABLE IF NOT EXISTS prototype_jobs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  prd_content TEXT NOT NULL,
  prd_title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued','building','deploying','live','failed','deploy_failed','dead_letter')),
  builder_type TEXT NOT NULL DEFAULT 'cli'
    CHECK(builder_type IN ('cli','api','ensemble')),
  pages_project TEXT,
  pages_url TEXT,
  build_log TEXT DEFAULT '',
  error_message TEXT,
  cost_input_tokens INTEGER DEFAULT 0,
  cost_output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  model_used TEXT DEFAULT 'haiku',
  fallback_used INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  started_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX idx_prototype_jobs_org ON prototype_jobs(org_id);
CREATE INDEX idx_prototype_jobs_status ON prototype_jobs(org_id, status);
