-- F312+F313: Discovery Pipeline 오케스트레이션 + 상태 머신

-- 1. discovery_pipeline_runs — 발굴→형상화 통합 파이프라인 실행
CREATE TABLE IF NOT EXISTS discovery_pipeline_runs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK(status IN ('idle','discovery_running','discovery_complete','shaping_queued','shaping_running','shaping_complete','paused','failed','aborted')),
  current_step TEXT,
  discovery_start_at TEXT,
  discovery_end_at TEXT,
  shaping_run_id TEXT,
  trigger_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK(trigger_mode IN ('manual','auto')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dpr_tenant_status ON discovery_pipeline_runs(tenant_id, status);
CREATE INDEX idx_dpr_biz_item ON discovery_pipeline_runs(biz_item_id);

-- 2. pipeline_events — 이벤트 로그 (상태 전이 추적)
CREATE TABLE IF NOT EXISTS pipeline_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pipeline_run_id TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK(event_type IN ('START','STEP_COMPLETE','STEP_FAILED','RETRY','SKIP','ABORT','PAUSE','RESUME','TRIGGER_SHAPING','SHAPING_PHASE_COMPLETE','COMPLETE')),
  from_status TEXT,
  to_status TEXT,
  step_id TEXT,
  payload TEXT,
  error_code TEXT,
  error_message TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pe_run ON pipeline_events(pipeline_run_id, created_at);
CREATE INDEX idx_pe_type ON pipeline_events(event_type);
