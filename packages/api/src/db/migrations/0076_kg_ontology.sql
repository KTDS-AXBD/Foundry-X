-- Sprint 92 (F255): KG Ontology tables for GIVC PoC
-- Property Graph pattern: nodes + edges + properties

-- KG 노드 (엔터티)
CREATE TABLE IF NOT EXISTS kg_nodes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kg_nodes_org ON kg_nodes(org_id);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON kg_nodes(org_id, type);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_name ON kg_nodes(org_id, name);

-- KG 엣지 (관계)
CREATE TABLE IF NOT EXISTS kg_edges (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL REFERENCES kg_nodes(id),
  target_node_id TEXT NOT NULL REFERENCES kg_nodes(id),
  relation_type TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  label TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kg_edges_org ON kg_edges(org_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON kg_edges(org_id, source_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON kg_edges(org_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_relation ON kg_edges(org_id, relation_type);

-- KG 속성 (EAV 패턴)
CREATE TABLE IF NOT EXISTS kg_properties (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kg_props_entity ON kg_properties(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_props_unique ON kg_properties(entity_type, entity_id, key);
