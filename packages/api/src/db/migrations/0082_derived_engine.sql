-- F276: DERIVED 엔진 — 패턴 추출 + 스킬 후보 생성 + HITL 승인

-- 1. derived_patterns — BD 단계별 반복 성공 패턴 저장소
CREATE TABLE IF NOT EXISTS derived_patterns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  pipeline_stage TEXT NOT NULL
    CHECK(pipeline_stage IN ('collection', 'discovery', 'shaping', 'validation', 'productization', 'gtm')),
  discovery_stage TEXT
    CHECK(discovery_stage IS NULL OR discovery_stage IN (
      '2-0', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8', '2-9', '2-10'
    )),
  pattern_type TEXT NOT NULL DEFAULT 'single'
    CHECK(pattern_type IN ('single', 'chain')),
  skill_ids TEXT NOT NULL,
  success_rate REAL NOT NULL CHECK(success_rate >= 0 AND success_rate <= 1),
  sample_count INTEGER NOT NULL CHECK(sample_count >= 1),
  avg_cost_usd REAL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'consumed', 'expired')),
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE INDEX idx_dp_tenant_stage ON derived_patterns(tenant_id, pipeline_stage, status);
CREATE INDEX idx_dp_confidence ON derived_patterns(confidence DESC);
CREATE INDEX idx_dp_status ON derived_patterns(status, expires_at);

-- 2. derived_candidates — 패턴에서 생성된 스킬 후보
CREATE TABLE IF NOT EXISTS derived_candidates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK(category IN ('general', 'bd-process', 'analysis', 'generation', 'validation', 'integration')),
  prompt_template TEXT NOT NULL,
  source_skills TEXT NOT NULL,
  similarity_score REAL DEFAULT 0,
  safety_grade TEXT DEFAULT 'pending'
    CHECK(safety_grade IN ('A', 'B', 'C', 'D', 'F', 'pending')),
  safety_score INTEGER DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(review_status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  registered_skill_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE INDEX idx_dc_tenant_status ON derived_candidates(tenant_id, review_status);
CREATE INDEX idx_dc_pattern ON derived_candidates(pattern_id);

-- 3. derived_reviews — HITL 리뷰 이력 (감사 추적)
CREATE TABLE IF NOT EXISTS derived_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK(action IN ('approved', 'rejected', 'revision_requested')),
  comment TEXT,
  modified_prompt TEXT,
  reviewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dr_candidate ON derived_reviews(candidate_id);
CREATE INDEX idx_dr_tenant ON derived_reviews(tenant_id, created_at);
