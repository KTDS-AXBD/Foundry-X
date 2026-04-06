-- F369: Offering Pipeline Data Layer (Sprint 167)
-- offerings, offering_versions, offering_sections, offering_design_tokens

CREATE TABLE IF NOT EXISTS offerings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose IN ('report','proposal','review')),
  format TEXT NOT NULL CHECK(format IN ('html','pptx')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','generating','review','approved','shared')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);
CREATE INDEX IF NOT EXISTS idx_offerings_org_status ON offerings(org_id, status);
CREATE INDEX IF NOT EXISTS idx_offerings_biz_item ON offerings(biz_item_id);

CREATE TABLE IF NOT EXISTS offering_versions (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT,
  change_summary TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, version),
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_versions_offering ON offering_versions(offering_id, version);

CREATE TABLE IF NOT EXISTS offering_sections (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 1,
  is_included INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, section_key),
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_sections_offering ON offering_sections(offering_id, sort_order);

CREATE TABLE IF NOT EXISTS offering_design_tokens (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  token_key TEXT NOT NULL,
  token_value TEXT NOT NULL,
  token_category TEXT NOT NULL CHECK(token_category IN ('color','typography','layout','spacing')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, token_key),
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_design_tokens_offering ON offering_design_tokens(offering_id, token_category);
