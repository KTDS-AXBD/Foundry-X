-- F441: 파일 업로드 인프라 (Sprint 213)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  biz_item_id TEXT,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  r2_key      TEXT NOT NULL UNIQUE,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_tenant    ON uploaded_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_biz_item  ON uploaded_files(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status    ON uploaded_files(status);
