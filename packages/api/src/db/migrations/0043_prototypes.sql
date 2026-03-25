-- Sprint 58: F181 Prototype 자동 생성
CREATE TABLE IF NOT EXISTS prototypes (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version INTEGER NOT NULL DEFAULT 1,
  format TEXT NOT NULL DEFAULT 'html',
  content TEXT NOT NULL,
  template_used TEXT,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  generated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, version)
);

CREATE INDEX idx_prototypes_biz_item ON prototypes(biz_item_id);
