-- F360: O-G-D Generic Interface (Sprint 163)
-- 도메인 레지스트리 + 실행 이력 + 라운드별 결과

CREATE TABLE IF NOT EXISTS ogd_domains (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  adapter_type TEXT NOT NULL DEFAULT 'builtin',
  default_rubric TEXT,
  default_max_rounds INTEGER NOT NULL DEFAULT 3,
  default_min_score REAL NOT NULL DEFAULT 0.85,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, domain)
);

CREATE TABLE IF NOT EXISTS ogd_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_summary TEXT,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  best_score REAL,
  converged INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ogd_run_rounds (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES ogd_runs(id),
  round_number INTEGER NOT NULL,
  generator_output TEXT,
  quality_score REAL,
  feedback TEXT,
  passed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
