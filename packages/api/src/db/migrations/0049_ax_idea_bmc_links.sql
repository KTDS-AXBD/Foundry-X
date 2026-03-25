CREATE TABLE ax_idea_bmc_links (
  id         TEXT PRIMARY KEY,
  idea_id    TEXT NOT NULL,
  bmc_id     TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(idea_id, bmc_id)
);
CREATE INDEX idx_links_idea_id ON ax_idea_bmc_links(idea_id);
CREATE INDEX idx_links_bmc_id ON ax_idea_bmc_links(bmc_id);
