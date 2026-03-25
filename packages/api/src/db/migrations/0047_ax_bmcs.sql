CREATE TABLE ax_bmcs (
  id          TEXT PRIMARY KEY,
  idea_id     TEXT,
  title       TEXT NOT NULL,
  git_ref     TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  org_id      TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
              CHECK(sync_status IN ('synced', 'pending', 'failed')),
  is_deleted  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ax_bmcs_idea_id   ON ax_bmcs(idea_id);
CREATE INDEX idx_ax_bmcs_author    ON ax_bmcs(author_id);
CREATE INDEX idx_ax_bmcs_org       ON ax_bmcs(org_id);

CREATE TABLE ax_bmc_blocks (
  bmc_id      TEXT NOT NULL REFERENCES ax_bmcs(id),
  block_type  TEXT NOT NULL CHECK(block_type IN (
                'customer_segments', 'value_propositions', 'channels',
                'customer_relationships', 'revenue_streams',
                'key_resources', 'key_activities', 'key_partnerships',
                'cost_structure'
              )),
  content     TEXT,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (bmc_id, block_type)
);

CREATE TABLE sync_failures (
  id            TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  git_ref       TEXT NOT NULL,
  payload       TEXT NOT NULL,
  error_msg     TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER,
  created_at    INTEGER NOT NULL
);
