-- 고아 biz_items 파이프라인 백필
-- F494/#247 후속: biz-items 생성 경로 일부가 pipeline_stages 시드를 누락한 이력 복구.
-- biz_items.status 기반으로 currentStage 추정 후 단일 활성 행 삽입.

INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, entered_by)
SELECT
  lower(hex(randomblob(16))),
  bi.id,
  bi.org_id,
  CASE
    WHEN bi.status IN ('shaping','done') THEN 'FORMALIZATION'
    WHEN bi.status IN ('evaluated','analyzed') THEN 'DISCOVERY'
    ELSE 'REGISTERED'
  END,
  COALESCE(bi.created_at, datetime('now')),
  'backfill-0125'
FROM biz_items bi
LEFT JOIN pipeline_stages ps ON ps.biz_item_id = bi.id
WHERE ps.id IS NULL;
