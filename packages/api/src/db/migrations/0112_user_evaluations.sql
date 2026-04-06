-- Sprint 178: F391 — 사용자 수동 평가 테이블
-- prototype_jobs 1:N user_evaluations (BD팀/고객/경영진 수동 5차원 평가)

CREATE TABLE IF NOT EXISTS user_evaluations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_id TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  evaluator_role TEXT NOT NULL DEFAULT 'bd_team',
  build_score INTEGER NOT NULL CHECK(build_score BETWEEN 1 AND 5),
  ui_score INTEGER NOT NULL CHECK(ui_score BETWEEN 1 AND 5),
  functional_score INTEGER NOT NULL CHECK(functional_score BETWEEN 1 AND 5),
  prd_score INTEGER NOT NULL CHECK(prd_score BETWEEN 1 AND 5),
  code_score INTEGER NOT NULL CHECK(code_score BETWEEN 1 AND 5),
  overall_score INTEGER NOT NULL CHECK(overall_score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ue_job_id ON user_evaluations(job_id);
CREATE INDEX IF NOT EXISTS idx_ue_org_id ON user_evaluations(org_id);
