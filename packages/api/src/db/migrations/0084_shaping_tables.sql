-- F287: BD 형상화 Phase F — shaping 이력 + 리뷰 + Six Hats 4테이블

-- 1. shaping_runs — 형상화 실행 이력
CREATE TABLE IF NOT EXISTS shaping_runs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  discovery_prd_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK(status IN ('running','completed','failed','escalated')),
  mode TEXT NOT NULL DEFAULT 'hitl'
    CHECK(mode IN ('hitl','auto')),
  current_phase TEXT NOT NULL DEFAULT 'A'
    CHECK(current_phase IN ('A','B','C','D','E','F')),
  total_iterations INTEGER NOT NULL DEFAULT 0,
  max_iterations INTEGER NOT NULL DEFAULT 3,
  quality_score REAL,
  token_cost INTEGER NOT NULL DEFAULT 0,
  token_limit INTEGER NOT NULL DEFAULT 500000,
  git_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX idx_shaping_runs_tenant_status ON shaping_runs(tenant_id, status);
CREATE INDEX idx_shaping_runs_prd ON shaping_runs(discovery_prd_id);

-- 2. shaping_phase_logs — Phase별 실행 로그
CREATE TABLE IF NOT EXISTS shaping_phase_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK(phase IN ('A','B','C','D','E','F')),
  round INTEGER NOT NULL DEFAULT 0,
  input_snapshot TEXT,
  output_snapshot TEXT,
  verdict TEXT CHECK(verdict IN ('PASS','MINOR_FIX','MAJOR_ISSUE','ESCALATED')),
  quality_score REAL,
  findings TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_shaping_phase_logs_run ON shaping_phase_logs(run_id, phase);

-- 3. shaping_expert_reviews — 전문가 리뷰 결과
CREATE TABLE IF NOT EXISTS shaping_expert_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT NOT NULL,
  expert_role TEXT NOT NULL CHECK(expert_role IN ('TA','AA','CA','DA','QA')),
  review_body TEXT NOT NULL,
  findings TEXT,
  quality_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_shaping_expert_reviews_run ON shaping_expert_reviews(run_id);

-- 4. shaping_six_hats — Six Hats 토론 기록
CREATE TABLE IF NOT EXISTS shaping_six_hats (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT NOT NULL,
  hat_color TEXT NOT NULL CHECK(hat_color IN ('white','red','black','yellow','green','blue')),
  round INTEGER NOT NULL,
  opinion TEXT NOT NULL,
  verdict TEXT CHECK(verdict IN ('accept','concern','reject')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_shaping_six_hats_run ON shaping_six_hats(run_id, round);
