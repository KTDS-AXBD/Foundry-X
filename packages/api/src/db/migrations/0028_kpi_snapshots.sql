-- ═══════════════════════════════════════════════════════
-- Migration 0028: KPI Daily Snapshots
-- Sprint 45: F160
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  k7_wau INTEGER NOT NULL DEFAULT 0,
  k8_agent_completion_rate REAL NOT NULL DEFAULT 0,
  k11_sdd_integrity_rate REAL NOT NULL DEFAULT 0,
  k1_cli_invocations INTEGER NOT NULL DEFAULT 0,
  total_page_views INTEGER NOT NULL DEFAULT 0,
  total_api_calls INTEGER NOT NULL DEFAULT 0,
  total_events INTEGER NOT NULL DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id),
  UNIQUE(tenant_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_tenant_date
  ON kpi_snapshots(tenant_id, snapshot_date DESC);
