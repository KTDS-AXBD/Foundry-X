-- 0032_feedback_context.sql
-- Add context fields to onboarding_feedback for in-app feedback widget (F174)
ALTER TABLE onboarding_feedback ADD COLUMN page_path TEXT DEFAULT NULL;
ALTER TABLE onboarding_feedback ADD COLUMN session_seconds INTEGER DEFAULT NULL;
ALTER TABLE onboarding_feedback ADD COLUMN feedback_type TEXT DEFAULT 'nps';
