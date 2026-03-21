-- 0017_sso_and_entities.sql
-- Sprint 26: F108 SSO + F111 Cross-service Entity Registry

-- F108: Org별 서비스 접근 권한
CREATE TABLE IF NOT EXISTS org_services (
  org_id      TEXT NOT NULL,
  service_id  TEXT NOT NULL CHECK(service_id IN ('foundry-x', 'discovery-x', 'ai-foundry')),
  enabled     INTEGER NOT NULL DEFAULT 1,
  config      TEXT,  -- JSON: 서비스별 추가 설정 (endpoint URL 등)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, service_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- F111: 크로스 서비스 엔티티 레지스트리
CREATE TABLE IF NOT EXISTS service_entities (
  id          TEXT PRIMARY KEY,
  service_id  TEXT NOT NULL CHECK(service_id IN ('foundry-x', 'discovery-x', 'ai-foundry')),
  entity_type TEXT NOT NULL,  -- 'experiment', 'skill', 'agent_task', 'discovery', 'document'
  external_id TEXT NOT NULL,  -- 원본 서비스의 PK
  title       TEXT NOT NULL,
  status      TEXT,
  metadata    TEXT,  -- JSON
  org_id      TEXT NOT NULL,
  synced_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX idx_se_service ON service_entities(service_id, entity_type);
CREATE INDEX idx_se_org ON service_entities(org_id);

-- F111: 엔티티 간 관계 (Discovery 실험 → AI Foundry 스킬 → FX 에이전트 태스크)
CREATE TABLE IF NOT EXISTS entity_links (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES service_entities(id),
  target_id   TEXT NOT NULL REFERENCES service_entities(id),
  link_type   TEXT NOT NULL,  -- 'derived_from', 'triggers', 'produces', 'references'
  metadata    TEXT,  -- JSON
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_el_source ON entity_links(source_id);
CREATE INDEX idx_el_target ON entity_links(target_id);
