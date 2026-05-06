-- F628: BeSir 7-타입 Entity 모델 (T1 토대)
-- 옵션 A dual-track: besir_type 컬럼 추가, 기존 entity_type freeform 유지
-- SQLite ADD COLUMN은 CHECK 제약 불가 → BEFORE INSERT/UPDATE trigger로 강제

ALTER TABLE service_entities ADD COLUMN besir_type TEXT;

CREATE TRIGGER service_entities_besir_type_check_insert
BEFORE INSERT ON service_entities
WHEN NEW.besir_type IS NOT NULL
  AND NEW.besir_type NOT IN ('fact','dimension','workflow','event','actor','policy','support')
BEGIN
  SELECT RAISE(ABORT, 'besir_type must be one of: fact, dimension, workflow, event, actor, policy, support');
END;

CREATE TRIGGER service_entities_besir_type_check_update
BEFORE UPDATE ON service_entities
WHEN NEW.besir_type IS NOT NULL
  AND NEW.besir_type NOT IN ('fact','dimension','workflow','event','actor','policy','support')
BEGIN
  SELECT RAISE(ABORT, 'besir_type must be one of: fact, dimension, workflow, event, actor, policy, support');
END;

CREATE INDEX idx_service_entities_besir_type
  ON service_entities(besir_type)
  WHERE besir_type IS NOT NULL;
