-- Gate-X 커스텀 검증 룰 엔진 (Sprint 193, F409)
-- 사용자 정의 루브릭 + 검증 기준 관리

CREATE TABLE IF NOT EXISTS custom_validation_rules (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  weight      REAL NOT NULL DEFAULT 0.2 CHECK(weight >= 0 AND weight <= 1),
  threshold   REAL NOT NULL DEFAULT 60 CHECK(threshold >= 0 AND threshold <= 100),
  conditions  TEXT NOT NULL DEFAULT '[]',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_custom_rules_org_active
  ON custom_validation_rules(org_id, is_active);
