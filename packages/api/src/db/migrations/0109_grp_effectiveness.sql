-- F361: guard_rail_proposals 확장 — Rule 효과 측정 컬럼 4개 (Sprint 164)
ALTER TABLE guard_rail_proposals ADD COLUMN effectiveness_score REAL;
ALTER TABLE guard_rail_proposals ADD COLUMN effectiveness_measured_at TEXT;
ALTER TABLE guard_rail_proposals ADD COLUMN pre_deploy_failures INTEGER;
ALTER TABLE guard_rail_proposals ADD COLUMN post_deploy_failures INTEGER;
