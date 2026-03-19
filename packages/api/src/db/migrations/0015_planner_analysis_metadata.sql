-- PlannerAgent 분석 메타데이터 컬럼 추가 (F95 Sprint 22)
ALTER TABLE agent_plans ADD COLUMN analysis_mode TEXT DEFAULT 'mock';
ALTER TABLE agent_plans ADD COLUMN analysis_model TEXT;
ALTER TABLE agent_plans ADD COLUMN analysis_tokens_used INTEGER;
ALTER TABLE agent_plans ADD COLUMN analysis_duration_ms INTEGER;
ALTER TABLE agent_plans ADD COLUMN file_context_count INTEGER DEFAULT 0;
