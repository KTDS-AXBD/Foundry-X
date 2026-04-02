-- Sprint 104: F275 스킬 레지스트리 — 2테이블

-- 1) skill_registry: 스킬 메타데이터 + 안전성 + 메트릭 캐시
CREATE TABLE IF NOT EXISTS skill_registry (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK(category IN ('general', 'bd-process', 'analysis', 'generation', 'validation', 'integration')),
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'deprecated', 'draft', 'archived')),
  safety_grade TEXT DEFAULT 'pending'
    CHECK(safety_grade IN ('A', 'B', 'C', 'D', 'F', 'pending')),
  safety_score INTEGER DEFAULT 0,
  safety_checked_at TEXT,
  source_type TEXT NOT NULL DEFAULT 'marketplace'
    CHECK(source_type IN ('marketplace', 'custom', 'derived', 'captured')),
  source_ref TEXT,
  prompt_template TEXT,
  model_preference TEXT,
  max_tokens INTEGER DEFAULT 4096,
  token_cost_avg REAL DEFAULT 0,
  success_rate REAL DEFAULT 0,
  total_executions INTEGER DEFAULT 0,
  current_version INTEGER DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  UNIQUE(tenant_id, skill_id)
);

CREATE INDEX idx_sr_tenant_cat ON skill_registry(tenant_id, category, status);
CREATE INDEX idx_sr_tenant_safety ON skill_registry(tenant_id, safety_grade);
CREATE INDEX idx_sr_skill ON skill_registry(skill_id);

-- 2) skill_search_index: TF-IDF 기반 시맨틱 검색 인덱스
CREATE TABLE IF NOT EXISTS skill_search_index (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  token TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  field TEXT NOT NULL DEFAULT 'name'
    CHECK(field IN ('name', 'description', 'tags', 'category')),
  UNIQUE(tenant_id, skill_id, token, field)
);

CREATE INDEX idx_ssi_token ON skill_search_index(tenant_id, token);
