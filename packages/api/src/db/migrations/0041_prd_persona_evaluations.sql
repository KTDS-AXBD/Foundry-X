-- 0039_prd_persona_evaluations.sql
-- Sprint 55: 멀티 페르소나 PRD 평가 결과 저장 (F187)

CREATE TABLE IF NOT EXISTS prd_persona_evaluations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prd_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  business_viability INTEGER NOT NULL,
  strategic_fit INTEGER NOT NULL,
  customer_value INTEGER NOT NULL,
  tech_market INTEGER NOT NULL,
  execution INTEGER NOT NULL,
  financial_feasibility INTEGER NOT NULL,
  competitive_diff INTEGER NOT NULL,
  scalability INTEGER NOT NULL,
  summary TEXT NOT NULL,
  concerns TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  org_id TEXT NOT NULL,
  FOREIGN KEY (prd_id) REFERENCES biz_generated_prds(id) ON DELETE CASCADE,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_prd_persona_evals_prd ON prd_persona_evaluations(prd_id);

CREATE TABLE IF NOT EXISTS prd_persona_verdicts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prd_id TEXT NOT NULL,
  verdict TEXT NOT NULL,
  avg_score REAL NOT NULL,
  total_concerns INTEGER NOT NULL,
  warnings TEXT NOT NULL,
  evaluation_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (prd_id) REFERENCES biz_generated_prds(id) ON DELETE CASCADE
);

CREATE INDEX idx_prd_persona_verdicts_prd ON prd_persona_verdicts(prd_id);
