-- F533: MetaAgent 실전 검증 — proposal apply 반영 시각 추가 (Sprint 286)
ALTER TABLE agent_improvement_proposals ADD COLUMN applied_at TEXT;
