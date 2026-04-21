-- 0058_discovery_type_enum.sql
-- Sprint 69: biz_items에 discovery_type 컬럼 추가 (F213)
-- v8.2 5유형: I(아이디어), M(시장), P(고객문제), T(기술), S(기존서비스)

ALTER TABLE biz_items ADD COLUMN discovery_type TEXT
  CHECK (discovery_type IN ('I', 'M', 'P', 'T', 'S'));
