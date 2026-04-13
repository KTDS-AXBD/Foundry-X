-- Migration 0129: F517 spec_traceability 테이블
-- 메타데이터 트레이서빌리티 — REQ↔F-item↔Sprint 연결 (Sprint 274)

CREATE TABLE IF NOT EXISTS spec_traceability (
  id        TEXT PRIMARY KEY,
  req_code  TEXT,
  sprint    TEXT,
  title     TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'backlog',
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_spec_trace_req    ON spec_traceability(req_code);
CREATE INDEX IF NOT EXISTS idx_spec_trace_sprint ON spec_traceability(sprint);
