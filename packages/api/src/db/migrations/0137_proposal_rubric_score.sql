-- F542 M4: agent_improvement_proposals에 rubric_score 컬럼 추가 (Sprint 290)
ALTER TABLE agent_improvement_proposals
  ADD COLUMN rubric_score INTEGER;
