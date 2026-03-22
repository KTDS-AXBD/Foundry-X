-- 0031_sr_classification_feedback.sql — F167 ML 하이브리드 SR 분류기 피드백
CREATE TABLE sr_classification_feedback (
  id TEXT PRIMARY KEY,
  sr_id TEXT NOT NULL,
  original_type TEXT NOT NULL,
  corrected_type TEXT NOT NULL,
  corrected_by TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sr_id) REFERENCES sr_requests(id)
);

CREATE INDEX idx_sr_feedback_sr_id ON sr_classification_feedback(sr_id);
CREATE INDEX idx_sr_feedback_types ON sr_classification_feedback(original_type, corrected_type);
