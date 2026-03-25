CREATE TABLE IF NOT EXISTS ax_bmc_versions (
  id         TEXT PRIMARY KEY,
  bmc_id     TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  author_id  TEXT NOT NULL,
  message    TEXT DEFAULT '',
  snapshot   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(bmc_id, commit_sha)
);
CREATE INDEX idx_bmc_versions_bmc_id ON ax_bmc_versions(bmc_id);
