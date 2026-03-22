-- F166: Data classification rules for PII masking & governance
CREATE TABLE IF NOT EXISTS data_classification_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_regex TEXT NOT NULL,
  classification TEXT NOT NULL CHECK(classification IN ('public','internal','confidential','restricted')),
  masking_strategy TEXT NOT NULL CHECK(masking_strategy IN ('redact','hash','partial','tokenize')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id),
  UNIQUE(tenant_id, pattern_name)
);
CREATE INDEX idx_classification_tenant ON data_classification_rules(tenant_id, is_active);
