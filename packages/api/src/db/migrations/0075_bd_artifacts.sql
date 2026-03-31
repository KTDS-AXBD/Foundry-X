-- Sprint 90: F260+F261 BD 스킬 실행 산출물 저장 + 버전 관리
CREATE TABLE IF NOT EXISTS bd_artifacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  input_text TEXT NOT NULL,
  output_text TEXT,
  model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20250714',
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bd_artifacts_org ON bd_artifacts(org_id);
CREATE INDEX IF NOT EXISTS idx_bd_artifacts_biz_item ON bd_artifacts(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_bd_artifacts_skill ON bd_artifacts(skill_id, biz_item_id);
CREATE INDEX IF NOT EXISTS idx_bd_artifacts_stage ON bd_artifacts(stage_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
