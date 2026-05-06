-- F632: CQ 5축 + 80-20-80 검수 룰 (BeSir 02 v0.3 §4.6)

CREATE TABLE IF NOT EXISTS cq_questions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  answer_locked_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  author TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_cq_questions_org ON cq_questions(org_id);

CREATE TABLE IF NOT EXISTS cq_evaluations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  axis_scores TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  handoff_decision TEXT NOT NULL,
  trace_id TEXT,
  llm_call_meta TEXT,
  evaluated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (handoff_decision IN ('handoff','human_review')),
  CHECK (total_score BETWEEN 0 AND 100),
  FOREIGN KEY (question_id) REFERENCES cq_questions(id)
);

CREATE INDEX IF NOT EXISTS idx_cq_evaluations_question ON cq_evaluations(question_id);
CREATE INDEX IF NOT EXISTS idx_cq_evaluations_org_score ON cq_evaluations(org_id, total_score DESC);

CREATE TABLE IF NOT EXISTS cq_review_cycles (
  id TEXT PRIMARY KEY,
  cq_evaluation_id TEXT,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  content TEXT NOT NULL,
  reviewer TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  duration_ms INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  completed_at INTEGER,

  CHECK (stage IN ('ai_initial_80','self_eval','human_intensive_20','ai_refinement_80')),
  CHECK (status IN ('pending','in_progress','completed'))
);

CREATE INDEX IF NOT EXISTS idx_review_cycles_eval ON cq_review_cycles(cq_evaluation_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_stage ON cq_review_cycles(org_id, stage, status);
