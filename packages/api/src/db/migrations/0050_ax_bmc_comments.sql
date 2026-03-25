CREATE TABLE ax_bmc_comments (
  id         TEXT PRIMARY KEY,
  bmc_id     TEXT NOT NULL,
  block_type TEXT,
  author_id  TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_comments_bmc_id ON ax_bmc_comments(bmc_id);
CREATE INDEX idx_comments_block ON ax_bmc_comments(bmc_id, block_type);
