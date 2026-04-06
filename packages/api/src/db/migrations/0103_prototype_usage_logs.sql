-- Sprint 159: F354 Prototype Usage & Cost Tracking
CREATE TABLE IF NOT EXISTS prototype_usage_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  builder_type TEXT NOT NULL CHECK(builder_type IN ('cli','api','ensemble')),
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  duration_ms INTEGER DEFAULT 0,
  fallback_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_proto_usage_org ON prototype_usage_logs(org_id);
CREATE INDEX idx_proto_usage_job ON prototype_usage_logs(job_id);
CREATE INDEX idx_proto_usage_created ON prototype_usage_logs(org_id, created_at);
