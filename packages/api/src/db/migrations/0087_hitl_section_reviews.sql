-- Sprint 118: F292+F297 — BDP + Prototype 섹션별 HITL 리뷰

-- F292: BDP 섹션 리뷰
CREATE TABLE IF NOT EXISTS bdp_section_reviews (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  bdp_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_bdp_section_reviews_bdp ON bdp_section_reviews(bdp_id);

-- F297: Prototype 섹션 리뷰
CREATE TABLE IF NOT EXISTS prototype_section_reviews (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  prototype_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  comment TEXT,
  framework TEXT NOT NULL DEFAULT 'react',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_proto_section_reviews_proto ON prototype_section_reviews(prototype_id);
