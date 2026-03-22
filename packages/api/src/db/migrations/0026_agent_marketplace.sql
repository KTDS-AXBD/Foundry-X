-- F152: Agent Marketplace
CREATE TABLE IF NOT EXISTS agent_marketplace_items (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL,
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  preferred_model TEXT,
  preferred_runner_type TEXT DEFAULT 'openrouter',
  task_type TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  publisher_org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  avg_rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON agent_marketplace_items(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON agent_marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_publisher ON agent_marketplace_items(publisher_org_id);

CREATE TABLE IF NOT EXISTS agent_marketplace_ratings (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT,
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  review_text TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(item_id) REFERENCES agent_marketplace_items(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_rating_user ON agent_marketplace_ratings(item_id, user_id);

CREATE TABLE IF NOT EXISTS agent_marketplace_installs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  installed_role_id TEXT,
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(item_id) REFERENCES agent_marketplace_items(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_install_org ON agent_marketplace_installs(item_id, org_id);
