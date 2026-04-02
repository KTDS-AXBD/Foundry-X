-- Sprint 103: F274 스킬 실행 메트릭 수집 — 4테이블

-- 1) skill_executions: 스킬 실행 이력
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  biz_item_id TEXT,
  artifact_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK(status IN ('completed', 'failed', 'timeout', 'cancelled')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_by TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_se_tenant_skill ON skill_executions(tenant_id, skill_id, executed_at);
CREATE INDEX idx_se_skill_status ON skill_executions(skill_id, status);
CREATE INDEX idx_se_executed_at ON skill_executions(executed_at);

-- 2) skill_versions: 스킬 버전 메타데이터
CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  changelog TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, skill_id, version)
);

CREATE INDEX idx_sv_tenant_skill ON skill_versions(tenant_id, skill_id);

-- 3) skill_lineage: 스킬 파생 관계
CREATE TABLE IF NOT EXISTS skill_lineage (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  parent_skill_id TEXT NOT NULL,
  child_skill_id TEXT NOT NULL,
  derivation_type TEXT NOT NULL DEFAULT 'manual'
    CHECK(derivation_type IN ('manual', 'derived', 'captured', 'forked')),
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sl_parent ON skill_lineage(parent_skill_id);
CREATE INDEX idx_sl_child ON skill_lineage(child_skill_id);

-- 4) skill_audit_log: 감사 로그
CREATE TABLE IF NOT EXISTS skill_audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('execution', 'version', 'lineage', 'skill')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('created', 'updated', 'deleted', 'executed', 'versioned')),
  actor_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sal_tenant_type ON skill_audit_log(tenant_id, entity_type, created_at);
CREATE INDEX idx_sal_entity ON skill_audit_log(entity_id);
