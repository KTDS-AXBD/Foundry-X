-- F202: InsightAgent — Market keyword summary job queue
CREATE TABLE ax_insight_jobs (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  keywords    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  result      TEXT,
  error       TEXT,
  created_at  INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX idx_insight_jobs_org ON ax_insight_jobs(org_id);
CREATE INDEX idx_insight_jobs_user ON ax_insight_jobs(user_id, status);
