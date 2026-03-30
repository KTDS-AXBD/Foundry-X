-- F227: Spec Library
CREATE TABLE IF NOT EXISTS spec_library (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('feature', 'api', 'component', 'integration', 'other')),
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'deprecated')),
  author TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_spec_library_org ON spec_library(org_id, category, status);
CREATE INDEX IF NOT EXISTS idx_spec_library_search ON spec_library(org_id, title);
