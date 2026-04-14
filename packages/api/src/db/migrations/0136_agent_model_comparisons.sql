-- F542 M3: A/B 모델 비교 결과 테이블 (Sprint 290)
CREATE TABLE IF NOT EXISTS agent_model_comparisons (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT '1.0',
  proposals_json TEXT NOT NULL DEFAULT '[]',
  proposal_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_model_comparisons_report
  ON agent_model_comparisons(report_id);

CREATE INDEX IF NOT EXISTS idx_model_comparisons_session
  ON agent_model_comparisons(session_id);
