-- Sprint 220 F454: biz_generated_prds 컬럼 추가 (사업기획서 기반 PRD 지원)
ALTER TABLE biz_generated_prds ADD COLUMN source_type TEXT NOT NULL DEFAULT 'discovery';
ALTER TABLE biz_generated_prds ADD COLUMN bp_draft_id TEXT REFERENCES business_plan_drafts(id);
