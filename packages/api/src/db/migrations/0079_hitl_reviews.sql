-- Sprint 96: F266 HITL 인터랙션 패널 — 리뷰 이력 테이블
CREATE TABLE IF NOT EXISTS hitl_artifact_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('approved', 'modified', 'regenerated', 'rejected')),
  reason TEXT,
  modified_content TEXT,
  previous_version TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_hitl_artifact ON hitl_artifact_reviews(artifact_id, created_at);
