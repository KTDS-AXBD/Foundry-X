-- Sprint 58 F180: 사업계획서 초안 자동 생성
CREATE TABLE IF NOT EXISTS business_plan_drafts (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  sections_snapshot TEXT,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  generated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, version)
);

CREATE INDEX idx_business_plan_drafts_biz_item ON business_plan_drafts(biz_item_id);
