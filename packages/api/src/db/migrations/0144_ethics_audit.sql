-- F607: AI 투명성 + 윤리 임계 (T3 세 번째)
-- Sprint 359, FX-REQ-671

-- F606 audit_events 확장 (confidence + fp_flag)
ALTER TABLE audit_events ADD COLUMN confidence REAL;
ALTER TABLE audit_events ADD COLUMN fp_flag INTEGER DEFAULT 0;
CREATE INDEX idx_audit_events_low_confidence ON audit_events(confidence) WHERE confidence < 0.7;
CREATE INDEX idx_audit_events_fp ON audit_events(fp_flag) WHERE fp_flag = 1;

-- 윤리 위반 이력 (append-only)
CREATE TABLE ethics_violations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  threshold_value REAL NOT NULL,
  actual_value REAL NOT NULL,
  trace_id TEXT,
  escalated_to_human INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (violation_type IN ('confidence_threshold','fp_burst','manual_kill')),
  CHECK (escalated_to_human IN (0, 1))
);

CREATE INDEX idx_ethics_violations_org ON ethics_violations(org_id, created_at DESC);
CREATE INDEX idx_ethics_violations_agent ON ethics_violations(agent_id);

CREATE TRIGGER ethics_violations_no_update BEFORE UPDATE ON ethics_violations
BEGIN SELECT RAISE(FAIL, 'ethics_violations is append-only'); END;

-- Kill Switch 상태 (org+agent별 1 row, UPDATE 가능)
CREATE TABLE kill_switch_state (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  activated_at INTEGER,
  deactivated_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (active IN (0, 1)),
  UNIQUE (org_id, agent_id)
);

CREATE INDEX idx_kill_switch_active ON kill_switch_state(org_id, active) WHERE active = 1;
