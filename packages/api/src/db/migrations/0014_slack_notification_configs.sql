-- 0014_slack_notification_configs.sql
-- Sprint 22: F94 Slack 고도화 — 카테고리별 알림 채널 설정

CREATE TABLE IF NOT EXISTS slack_notification_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('agent', 'pr', 'plan', 'queue', 'message')),
  webhook_url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, category)
);

CREATE INDEX IF NOT EXISTS idx_slack_config_org ON slack_notification_configs(org_id);
