-- Sprint 67: F209 기술 타당성 분석
CREATE TABLE IF NOT EXISTS tech_reviews (
  id TEXT PRIMARY KEY,
  prototype_id TEXT NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
  feasibility TEXT NOT NULL CHECK(feasibility IN ('high', 'medium', 'low')),
  stack_fit INTEGER NOT NULL DEFAULT 0,
  complexity TEXT NOT NULL CHECK(complexity IN ('low', 'medium', 'high')),
  risks TEXT DEFAULT '[]',
  recommendation TEXT NOT NULL CHECK(recommendation IN ('proceed', 'modify', 'reject')),
  estimated_effort TEXT,
  reviewed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tech_review_prototype ON tech_reviews(prototype_id);
