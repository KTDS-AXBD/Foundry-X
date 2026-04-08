-- Sprint 221 F456: PRD 확정 상태 관리 (3단계 버전 관리)
ALTER TABLE biz_generated_prds ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
-- status 값: 'draft' | 'reviewing' | 'confirmed'

CREATE INDEX IF NOT EXISTS idx_generated_prds_status
  ON biz_generated_prds(biz_item_id, status);
