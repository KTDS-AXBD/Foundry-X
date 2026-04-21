-- 0034_biz_evaluations.sql
-- Sprint 51: biz_evaluations + biz_evaluation_scores (F178)

CREATE TABLE IF NOT EXISTS biz_evaluations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  verdict TEXT NOT NULL,
  avg_score REAL NOT NULL DEFAULT 0.0,
  total_concerns INTEGER NOT NULL DEFAULT 0,
  evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_biz_evaluations_item ON biz_evaluations(biz_item_id);

CREATE TABLE IF NOT EXISTS biz_evaluation_scores (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  evaluation_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  business_viability REAL NOT NULL DEFAULT 0,
  strategic_fit REAL NOT NULL DEFAULT 0,
  customer_value REAL NOT NULL DEFAULT 0,
  tech_market REAL NOT NULL DEFAULT 0,
  execution REAL NOT NULL DEFAULT 0,
  financial_feasibility REAL NOT NULL DEFAULT 0,
  competitive_diff REAL NOT NULL DEFAULT 0,
  scalability REAL NOT NULL DEFAULT 0,
  summary TEXT,
  concerns TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (evaluation_id) REFERENCES biz_evaluations(id) ON DELETE CASCADE
);

CREATE INDEX idx_biz_eval_scores_eval ON biz_evaluation_scores(evaluation_id);
