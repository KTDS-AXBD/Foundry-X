-- Sprint 220 F455: PRD 인터뷰 세션 관리 (2차 PRD 보강)
CREATE TABLE IF NOT EXISTS prd_interviews (
  id             TEXT PRIMARY KEY,
  biz_item_id    TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  prd_id         TEXT NOT NULL REFERENCES biz_generated_prds(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'in_progress',
  question_count INTEGER NOT NULL DEFAULT 0,
  answered_count INTEGER NOT NULL DEFAULT 0,
  started_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at   INTEGER
);

CREATE TABLE IF NOT EXISTS prd_interview_qas (
  id                TEXT PRIMARY KEY,
  interview_id      TEXT NOT NULL REFERENCES prd_interviews(id) ON DELETE CASCADE,
  seq               INTEGER NOT NULL,
  question          TEXT NOT NULL,
  question_context  TEXT,
  answer            TEXT,
  answered_at       INTEGER,
  UNIQUE(interview_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_prd_interviews_biz_item ON prd_interviews(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_prd_interview_qas_interview ON prd_interview_qas(interview_id);
