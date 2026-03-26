CREATE TABLE ax_evaluations (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  idea_id     TEXT,
  bmc_id      TEXT,
  title       TEXT NOT NULL,
  description TEXT,
  owner_id    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK(status IN ('draft', 'active', 'go', 'kill', 'hold')),
  decision_reason TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_eval_org ON ax_evaluations(org_id);
CREATE INDEX idx_eval_status ON ax_evaluations(org_id, status);
CREATE INDEX idx_eval_idea ON ax_evaluations(idea_id);
