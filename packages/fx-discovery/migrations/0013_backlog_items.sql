-- Migration 0128: F516 backlog_items 테이블
-- Backlog 인입 파이프라인 + 실시간 동기화 (Sprint 273)

CREATE TABLE IF NOT EXISTS backlog_items (
  id                  TEXT    PRIMARY KEY,
  org_id              TEXT    NOT NULL,
  title               TEXT    NOT NULL,
  description         TEXT,
  track               TEXT    NOT NULL DEFAULT 'F',
  priority            TEXT    NOT NULL DEFAULT 'P2',
  source              TEXT    NOT NULL DEFAULT 'web',
  classify_method     TEXT    NOT NULL DEFAULT 'llm',
  status              TEXT    NOT NULL DEFAULT 'pending',
  idempotency_key     TEXT,
  github_issue_number INTEGER,
  spec_row_added      INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_backlog_items_org
  ON backlog_items(org_id);

CREATE INDEX IF NOT EXISTS idx_backlog_items_status
  ON backlog_items(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_items_idempotency
  ON backlog_items(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
