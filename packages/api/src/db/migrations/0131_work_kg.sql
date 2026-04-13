-- Migration 0131: F518 Work Lifecycle KG 테이블
-- Work Ontology 기반 연결 — 10노드타입/5엣지타입 그래프 (Sprint 275)

CREATE TABLE IF NOT EXISTS work_kg_nodes (
  id        TEXT PRIMARY KEY,              -- e.g. 'work:FITEM:F518', 'work:REQ:FX-REQ-546'
  node_type TEXT NOT NULL,                 -- IDEA|BACKLOG|REQ|F_ITEM|SPRINT|PHASE|PR|COMMIT|DEPLOY|CHANGELOG
  label     TEXT NOT NULL,                 -- Human-readable (e.g. "F518", "FX-REQ-546")
  metadata  TEXT NOT NULL DEFAULT '{}',   -- JSON: status, url, sprint, req_code, etc.
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wkg_nodes_type  ON work_kg_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_wkg_nodes_label ON work_kg_nodes(label);

CREATE TABLE IF NOT EXISTS work_kg_edges (
  id        TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES work_kg_nodes(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES work_kg_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL,                 -- derives_from|implements|belongs_to|contains|deploys_to
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wkg_edges_source ON work_kg_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_wkg_edges_target ON work_kg_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_wkg_edges_type   ON work_kg_edges(edge_type);
