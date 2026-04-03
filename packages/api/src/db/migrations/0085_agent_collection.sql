-- Sprint 115 F291: Discovery-X Agent 자동 수집 — 스케줄 + 실행 이력
CREATE TABLE IF NOT EXISTS agent_collection_schedules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '["market","news","tech"]',
  keywords TEXT NOT NULL DEFAULT '[]',
  interval_hours INTEGER NOT NULL DEFAULT 6,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS agent_collection_runs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  schedule_id TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  items_found INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
