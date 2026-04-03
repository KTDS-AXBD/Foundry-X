-- Sprint 119: F293 Offering Brief
CREATE TABLE IF NOT EXISTS offering_briefs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  offering_pack_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  target_audience TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'initial'
    CHECK(meeting_type IN ('initial','followup','demo','closing')),
  generated_by TEXT NOT NULL DEFAULT 'ai',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (offering_pack_id) REFERENCES offering_packs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_offering_briefs_pack ON offering_briefs(offering_pack_id);
CREATE INDEX IF NOT EXISTS idx_offering_briefs_org ON offering_briefs(org_id);
