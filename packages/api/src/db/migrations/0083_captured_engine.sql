-- F277: CAPTURED 엔진 — 워크플로우 시퀀스 패턴 추출 + 메타 스킬 생성 + HITL

-- 1. captured_workflow_patterns — 크로스 도메인 워크플로우 시퀀스 패턴
CREATE TABLE IF NOT EXISTS captured_workflow_patterns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  methodology_id TEXT,
  pipeline_stage TEXT NOT NULL
    CHECK(pipeline_stage IN ('collection','discovery','shaping','validation','productization','gtm')),
  workflow_step_sequence TEXT NOT NULL,
  skill_sequence TEXT NOT NULL,
  success_rate REAL NOT NULL CHECK(success_rate >= 0 AND success_rate <= 1),
  sample_count INTEGER NOT NULL CHECK(sample_count >= 1),
  avg_cost_usd REAL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','consumed','expired')),
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE INDEX idx_cwp_tenant_stage ON captured_workflow_patterns(tenant_id, pipeline_stage, status);
CREATE INDEX idx_cwp_methodology ON captured_workflow_patterns(methodology_id);
CREATE INDEX idx_cwp_confidence ON captured_workflow_patterns(confidence DESC);

-- 2. captured_candidates — 워크플로우 패턴에서 생성된 메타 스킬 후보
CREATE TABLE IF NOT EXISTS captured_candidates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK(category IN ('general','bd-process','analysis','generation','validation','integration')),
  prompt_template TEXT NOT NULL,
  source_workflow_steps TEXT NOT NULL,
  source_skills TEXT NOT NULL,
  similarity_score REAL DEFAULT 0,
  safety_grade TEXT DEFAULT 'pending'
    CHECK(safety_grade IN ('A','B','C','D','F','pending')),
  safety_score INTEGER DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(review_status IN ('pending','approved','rejected','revision_requested')),
  registered_skill_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE INDEX idx_cc_tenant_status ON captured_candidates(tenant_id, review_status);
CREATE INDEX idx_cc_pattern ON captured_candidates(pattern_id);

-- 3. captured_reviews — HITL 리뷰 이력
CREATE TABLE IF NOT EXISTS captured_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK(action IN ('approved','rejected','revision_requested')),
  comment TEXT,
  modified_prompt TEXT,
  reviewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cr_candidate ON captured_reviews(candidate_id);
CREATE INDEX idx_cr_tenant ON captured_reviews(tenant_id, created_at);
