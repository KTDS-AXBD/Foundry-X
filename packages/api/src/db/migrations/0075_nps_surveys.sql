CREATE TABLE nps_surveys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  dismissed_at TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
CREATE INDEX idx_nps_surveys_user ON nps_surveys(org_id, user_id, triggered_at DESC);
