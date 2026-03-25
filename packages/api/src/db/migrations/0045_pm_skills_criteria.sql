-- Sprint 60: pm-skills 검증 기준 테이블 (F194)

CREATE TABLE IF NOT EXISTS pm_skills_criteria (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  criterion_id INTEGER NOT NULL,
  skill TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  evidence TEXT,
  output_type TEXT,
  score INTEGER,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, criterion_id)
);

CREATE INDEX idx_pm_skills_criteria_biz_item ON pm_skills_criteria(biz_item_id);
CREATE INDEX idx_pm_skills_criteria_status ON pm_skills_criteria(status);
