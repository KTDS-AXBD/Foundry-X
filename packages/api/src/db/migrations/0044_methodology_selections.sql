-- Sprint 59 F191: 방법론 레지스트리 + 선택 이력

CREATE TABLE IF NOT EXISTS methodology_modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_active INTEGER NOT NULL DEFAULT 1,
  config_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS methodology_selections (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  methodology_id TEXT NOT NULL,
  match_score REAL,
  selected_by TEXT NOT NULL DEFAULT 'auto',
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, methodology_id)
);

CREATE INDEX IF NOT EXISTS idx_methodology_selections_biz_item
  ON methodology_selections(biz_item_id);

-- BDP 시드 데이터
INSERT OR IGNORE INTO methodology_modules (id, name, description, version)
VALUES ('bdp', 'BDP (Business Development Process)', 'AX 사업개발 6단계 프로세스: 수집→발굴→형상화→검증및공유→제품화→GTM', '1.0.0');
