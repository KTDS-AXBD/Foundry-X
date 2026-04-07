-- Gate-X 독립 서비스 초기 스키마 (Sprint 189, F402)
-- gate-x-db 전용 테이블 10개

-- 1. biz_items (최소 참조용 — Decision/Validation이 참조)
CREATE TABLE IF NOT EXISTS biz_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. pipeline_stages (단계 추적 + validation_tier 포함)
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  entered_by TEXT NOT NULL,
  entered_at TEXT NOT NULL DEFAULT (datetime('now')),
  exited_at TEXT,
  reason TEXT,
  validation_tier TEXT DEFAULT 'none'
);
CREATE INDEX IF NOT EXISTS idx_pipeline_active ON pipeline_stages(biz_item_id, exited_at);

-- 3. ax_evaluations (평가 핵심)
CREATE TABLE IF NOT EXISTS ax_evaluations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  idea_id TEXT,
  bmc_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  decision_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ax_evaluations_org ON ax_evaluations(org_id, status);

-- 4. ax_evaluation_kpis (KPI — portal KpiService 대체)
CREATE TABLE IF NOT EXISTS ax_evaluation_kpis (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL REFERENCES ax_evaluations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  target REAL NOT NULL DEFAULT 0,
  actual REAL,
  unit TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. ax_evaluation_history (평가 이력)
CREATE TABLE IF NOT EXISTS ax_evaluation_history (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL REFERENCES ax_evaluations(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. decisions (Go/Hold/Drop 의사결정)
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('GO','HOLD','DROP')),
  stage TEXT NOT NULL,
  comment TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_decisions_org ON decisions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_item ON decisions(biz_item_id);

-- 7. gate_packages (ORB/PRB 패키지)
CREATE TABLE IF NOT EXISTS gate_packages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  gate_type TEXT NOT NULL CHECK(gate_type IN ('orb','prb')),
  items TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  download_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. evaluation_reports (평가 결과서)
CREATE TABLE IF NOT EXISTS evaluation_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  skill_scores TEXT NOT NULL DEFAULT '{}',
  traffic_light TEXT NOT NULL DEFAULT 'red',
  traffic_light_history TEXT NOT NULL DEFAULT '[]',
  recommendation TEXT,
  generated_by TEXT NOT NULL DEFAULT 'system',
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eval_reports_org ON evaluation_reports(org_id, biz_item_id);

-- 9. expert_meetings (전문가 미팅)
CREATE TABLE IF NOT EXISTS expert_meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'interview',
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  attendees TEXT NOT NULL DEFAULT '[]',
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. validation_history (검증 이력)
CREATE TABLE IF NOT EXISTS validation_history (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  decision TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. ax_team_reviews (팀 리뷰)
CREATE TABLE IF NOT EXISTS ax_team_reviews (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('Go','Hold','Drop')),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, biz_item_id, reviewer_id)
);

-- 12. domain_events (D1EventBus 이벤트 저장소)
CREATE TABLE IF NOT EXISTS domain_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'gate-x',
  processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed ON domain_events(processed, created_at);
