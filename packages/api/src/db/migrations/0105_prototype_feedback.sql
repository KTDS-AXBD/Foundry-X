-- F356: Prototype user feedback (Sprint 160)
CREATE TABLE IF NOT EXISTS prototype_feedback (
  id          TEXT PRIMARY KEY,
  job_id      TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  author_id   TEXT,
  category    TEXT NOT NULL CHECK(category IN ('layout','content','functionality','ux','other')),
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied','dismissed')),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_proto_feedback_job ON prototype_feedback(job_id);
CREATE INDEX idx_proto_feedback_org ON prototype_feedback(org_id);
