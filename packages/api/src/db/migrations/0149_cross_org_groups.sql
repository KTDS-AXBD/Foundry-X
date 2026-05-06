-- F603: Cross-Org 4그룹 분류 + default-deny 골격 (T4)

CREATE TABLE cross_org_groups (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  asset_kind TEXT NOT NULL,
  org_id TEXT NOT NULL,
  group_type TEXT NOT NULL,
  commonality REAL,
  variance REAL,
  documentation_rate REAL,
  business_impact TEXT,
  assigned_by TEXT NOT NULL,
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (asset_kind IN ('policy','ontology','skill','system_knowledge')),
  CHECK (group_type IN ('common_standard','org_specific','tacit_knowledge','core_differentiator')),
  CHECK (assigned_by IN ('auto','sme','manual')),
  CHECK (business_impact IN ('low','medium','high') OR business_impact IS NULL),
  UNIQUE (asset_id, asset_kind)
);

CREATE INDEX idx_cross_org_groups_type ON cross_org_groups(org_id, group_type);
CREATE INDEX idx_cross_org_groups_core_diff ON cross_org_groups(group_type) WHERE group_type = 'core_differentiator';

CREATE TABLE cross_org_export_blocks (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  attempted_action TEXT,
  trace_id TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (reason IN ('export_blocked','license_blocked','marketplace_blocked','learning_opt_in_required'))
);

CREATE INDEX idx_export_blocks_org ON cross_org_export_blocks(org_id, created_at DESC);
CREATE INDEX idx_export_blocks_asset ON cross_org_export_blocks(asset_id);

-- append-only: 수정 금지
CREATE TRIGGER export_blocks_no_update BEFORE UPDATE ON cross_org_export_blocks
BEGIN SELECT RAISE(FAIL, 'cross_org_export_blocks is append-only'); END;
