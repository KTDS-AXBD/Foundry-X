CREATE TABLE ax_kpis (
  id          TEXT PRIMARY KEY,
  eval_id     TEXT NOT NULL REFERENCES ax_evaluations(id),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK(category IN ('market', 'tech', 'revenue', 'risk', 'custom')),
  target      REAL NOT NULL,
  actual      REAL,
  unit        TEXT NOT NULL DEFAULT '%',
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_kpi_eval ON ax_kpis(eval_id);
