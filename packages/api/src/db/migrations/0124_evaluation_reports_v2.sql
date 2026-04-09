-- F493: evaluation_reports v2 — report_data JSON blob 추가
ALTER TABLE evaluation_reports ADD COLUMN report_data TEXT;
-- nullable JSON blob. null이면 레거시 v1 (skill_scores 사용), 존재하면 v2 (report_data 사용)
CREATE INDEX IF NOT EXISTS idx_eval_reports_biz_item ON evaluation_reports(org_id, biz_item_id);
