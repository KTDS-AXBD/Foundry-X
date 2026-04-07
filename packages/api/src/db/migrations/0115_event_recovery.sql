-- F406: 이벤트 유실 복구 메커니즘 — domain_events 컬럼 확장 (Sprint 191)

ALTER TABLE domain_events ADD COLUMN retry_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE domain_events ADD COLUMN last_error    TEXT;
ALTER TABLE domain_events ADD COLUMN next_retry_at TEXT;

-- dead_letter 상태를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_domain_events_failed_retry
  ON domain_events (status, retry_count, next_retry_at)
  WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_domain_events_dlq
  ON domain_events (status, created_at)
  WHERE status = 'dead_letter';
