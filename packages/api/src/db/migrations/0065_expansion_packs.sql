-- F228: Expansion Packs
CREATE TABLE IF NOT EXISTS expansion_packs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT 'custom' CHECK(domain IN ('security', 'data', 'devops', 'testing', 'custom')),
  version TEXT NOT NULL DEFAULT '1.0.0',
  manifest TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  author TEXT NOT NULL,
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expansion_packs_status ON expansion_packs(status, domain);

CREATE TABLE IF NOT EXISTS pack_installations (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  installed_by TEXT NOT NULL,
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  config TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (pack_id) REFERENCES expansion_packs(id),
  UNIQUE(pack_id, org_id)
);
CREATE INDEX IF NOT EXISTS idx_pack_installations_org ON pack_installations(org_id);
