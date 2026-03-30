-- F232: 파이프라인 단계 추적
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'REGISTERED'
    CHECK(stage IN ('REGISTERED','DISCOVERY','FORMALIZATION','REVIEW','DECISION','OFFERING','MVP')),
  entered_at TEXT NOT NULL DEFAULT (datetime('now')),
  exited_at TEXT,
  entered_by TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_item ON pipeline_stages(biz_item_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(org_id, stage);
