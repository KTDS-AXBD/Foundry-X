-- F298: PoC 전용 프로젝트 관리
CREATE TABLE IF NOT EXISTS poc_projects (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK(status IN ('planning','in_progress','completed','cancelled')),
  framework TEXT,
  start_date TEXT,
  end_date TEXT,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_poc_projects_org ON poc_projects(org_id, status);

-- F298: PoC 성과 지표 (KPI)
CREATE TABLE IF NOT EXISTS poc_kpis (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  poc_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  target_value REAL,
  actual_value REAL,
  unit TEXT NOT NULL DEFAULT 'count',
  measured_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (poc_id) REFERENCES poc_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poc_kpis_poc ON poc_kpis(poc_id);
