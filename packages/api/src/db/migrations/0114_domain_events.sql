-- F398: Domain Events Table — D1 기반 이벤트 버스 PoC (Sprint 185)

CREATE TABLE IF NOT EXISTS domain_events (
  id          TEXT    NOT NULL PRIMARY KEY,
  type        TEXT    NOT NULL,
  source      TEXT    NOT NULL,
  tenant_id   TEXT    NOT NULL,
  payload     TEXT    NOT NULL,
  metadata    TEXT,
  status      TEXT    NOT NULL DEFAULT 'pending',
  created_at  TEXT    NOT NULL,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_domain_events_status_created
  ON domain_events (status, created_at);

CREATE INDEX IF NOT EXISTS idx_domain_events_tenant
  ON domain_events (tenant_id, status);
