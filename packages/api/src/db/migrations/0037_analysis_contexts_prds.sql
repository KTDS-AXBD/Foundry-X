-- 0037_analysis_contexts_prds.sql
-- Sprint 53: 분석 컨텍스트 + PRD 저장 (F184, F185)

CREATE TABLE IF NOT EXISTS biz_analysis_contexts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  pm_skill TEXT NOT NULL,
  input_summary TEXT,
  output_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_analysis_contexts_item ON biz_analysis_contexts(biz_item_id);
CREATE INDEX idx_analysis_contexts_step ON biz_analysis_contexts(biz_item_id, step_order);

CREATE TABLE IF NOT EXISTS biz_generated_prds (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  criteria_snapshot TEXT,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_generated_prds_item ON biz_generated_prds(biz_item_id);
