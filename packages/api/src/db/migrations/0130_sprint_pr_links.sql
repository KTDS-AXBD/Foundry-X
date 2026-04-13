-- Migration 0130: F517 sprint_pr_links 테이블
-- 메타데이터 트레이서빌리티 — Sprint↔PR↔Commit 연결 (Sprint 274)

CREATE TABLE IF NOT EXISTS sprint_pr_links (
  id          TEXT    PRIMARY KEY,
  sprint_num  TEXT    NOT NULL,
  pr_number   INTEGER NOT NULL,
  f_items     TEXT    NOT NULL DEFAULT '[]',
  branch      TEXT,
  pr_title    TEXT,
  pr_url      TEXT,
  pr_state    TEXT    NOT NULL DEFAULT 'open',
  commit_shas TEXT    NOT NULL DEFAULT '[]',
  synced_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_spr_links_sprint ON sprint_pr_links(sprint_num);
CREATE INDEX IF NOT EXISTS idx_spr_links_pr     ON sprint_pr_links(pr_number);
