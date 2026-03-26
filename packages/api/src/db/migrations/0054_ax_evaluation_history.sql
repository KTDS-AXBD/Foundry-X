CREATE TABLE ax_evaluation_history (
  id          TEXT PRIMARY KEY,
  eval_id     TEXT NOT NULL REFERENCES ax_evaluations(id),
  actor_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT,
  reason      TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_eval_history ON ax_evaluation_history(eval_id);
