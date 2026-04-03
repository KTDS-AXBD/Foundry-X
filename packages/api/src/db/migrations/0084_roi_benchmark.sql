-- Sprint 107: F278 BD ROI 벤치마크 — Cold Start vs Warm Run + 신호등 달러 환산

-- 1) roi_benchmarks: 스킬별 Cold/Warm 비교 스냅샷
CREATE TABLE IF NOT EXISTS roi_benchmarks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  cold_threshold INTEGER NOT NULL DEFAULT 3,
  cold_executions INTEGER NOT NULL DEFAULT 0,
  warm_executions INTEGER NOT NULL DEFAULT 0,
  cold_avg_cost_usd REAL NOT NULL DEFAULT 0,
  warm_avg_cost_usd REAL NOT NULL DEFAULT 0,
  cold_avg_duration_ms REAL NOT NULL DEFAULT 0,
  warm_avg_duration_ms REAL NOT NULL DEFAULT 0,
  cold_avg_tokens REAL NOT NULL DEFAULT 0,
  warm_avg_tokens REAL NOT NULL DEFAULT 0,
  cold_success_rate REAL NOT NULL DEFAULT 0
    CHECK(cold_success_rate >= 0 AND cold_success_rate <= 1),
  warm_success_rate REAL NOT NULL DEFAULT 0
    CHECK(warm_success_rate >= 0 AND warm_success_rate <= 1),
  cost_savings_pct REAL,
  duration_savings_pct REAL,
  token_savings_pct REAL,
  pipeline_stage TEXT
    CHECK(pipeline_stage IS NULL OR pipeline_stage IN (
      'collection', 'discovery', 'shaping', 'validation', 'productization', 'gtm'
    )),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rb_tenant_skill ON roi_benchmarks(tenant_id, skill_id, created_at);
CREATE INDEX idx_rb_tenant_stage ON roi_benchmarks(tenant_id, pipeline_stage);
CREATE INDEX idx_rb_created ON roi_benchmarks(created_at);

-- 2) roi_signal_valuations: 사업성 신호등 달러 환산 설정
CREATE TABLE IF NOT EXISTS roi_signal_valuations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK(signal_type IN ('go', 'pivot', 'drop')),
  value_usd REAL NOT NULL DEFAULT 0 CHECK(value_usd >= 0),
  description TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, signal_type)
);

CREATE INDEX idx_rsv_tenant ON roi_signal_valuations(tenant_id);
