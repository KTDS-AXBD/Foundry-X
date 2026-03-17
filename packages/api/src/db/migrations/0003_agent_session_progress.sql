-- Sprint 8: agent_sessions.progress 컬럼 (SSE 진행도 추적)
ALTER TABLE agent_sessions ADD COLUMN progress REAL DEFAULT 0;
ALTER TABLE agent_sessions ADD COLUMN current_task TEXT;
