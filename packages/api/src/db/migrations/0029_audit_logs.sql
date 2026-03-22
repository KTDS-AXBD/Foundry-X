-- F165: 감사 로그 (AuditLog) 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  agent_id TEXT,
  model_id TEXT,
  prompt_hash TEXT,
  input_classification TEXT DEFAULT 'internal',
  output_type TEXT,
  approved_by TEXT,
  approved_at TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);
CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_agent ON audit_logs(agent_id);
