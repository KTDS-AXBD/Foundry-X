-- 0010_plan_execution.sql
-- Sprint 17 F82: PlannerAgent 실행 라이프사이클

ALTER TABLE agent_plans ADD COLUMN execution_status TEXT;
ALTER TABLE agent_plans ADD COLUMN execution_started_at TEXT;
ALTER TABLE agent_plans ADD COLUMN execution_completed_at TEXT;
ALTER TABLE agent_plans ADD COLUMN execution_result TEXT;
ALTER TABLE agent_plans ADD COLUMN execution_error TEXT;

CREATE INDEX IF NOT EXISTS idx_agent_plans_execution_status
  ON agent_plans(execution_status);
