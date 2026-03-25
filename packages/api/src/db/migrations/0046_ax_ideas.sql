CREATE TABLE ax_ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT CHECK(length(description) <= 200),
  tags        TEXT,
  git_ref     TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  org_id      TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
              CHECK(sync_status IN ('synced', 'pending', 'failed')),
  is_deleted  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ax_ideas_author   ON ax_ideas(author_id);
CREATE INDEX idx_ax_ideas_org      ON ax_ideas(org_id);
CREATE INDEX idx_ax_ideas_tags     ON ax_ideas(tags);
CREATE INDEX idx_ax_ideas_updated  ON ax_ideas(updated_at DESC);
