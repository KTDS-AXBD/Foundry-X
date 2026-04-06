-- F355: O-G-D quality rounds tracking (Sprint 160)
CREATE TABLE IF NOT EXISTS ogd_rounds (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
  org_id        TEXT NOT NULL,
  round_number  INTEGER NOT NULL,
  quality_score REAL,
  feedback      TEXT,
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd      REAL DEFAULT 0.0,
  model_used    TEXT DEFAULT 'haiku',
  passed        INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(job_id, round_number)
);
CREATE INDEX idx_ogd_rounds_job ON ogd_rounds(job_id);
CREATE INDEX idx_ogd_rounds_org ON ogd_rounds(org_id);
