-- F317: 백업 메타데이터 테이블
CREATE TABLE IF NOT EXISTS backup_metadata (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'manual'
    CHECK(backup_type IN ('manual', 'auto', 'pre_deploy')),
  scope TEXT NOT NULL DEFAULT 'full'
    CHECK(scope IN ('full', 'item')),
  biz_item_id TEXT,
  tables_included TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_bm_tenant ON backup_metadata(tenant_id, created_at);
CREATE INDEX idx_bm_type ON backup_metadata(backup_type);
