-- Sprint 176: F387 — 5차원 품질 스코어 저장 테이블
-- prototype_jobs 1:N prototype_quality (라운드별 점수)

CREATE TABLE IF NOT EXISTS prototype_quality (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 0,
  total_score REAL NOT NULL,
  build_score REAL NOT NULL,
  ui_score REAL NOT NULL,
  functional_score REAL NOT NULL,
  prd_score REAL NOT NULL,
  code_score REAL NOT NULL,
  generation_mode TEXT NOT NULL DEFAULT 'api',
  cost_usd REAL NOT NULL DEFAULT 0,
  feedback TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pq_job_id ON prototype_quality(job_id);
CREATE INDEX IF NOT EXISTS idx_pq_total_score ON prototype_quality(total_score);
