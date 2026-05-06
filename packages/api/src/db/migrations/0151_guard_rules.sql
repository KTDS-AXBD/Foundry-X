-- F617: Guard-X Integration (T5) — RuleEngine tables

CREATE TABLE guard_rules (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  rule_yaml TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1.0',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (active IN (0, 1))
);

CREATE INDEX idx_guard_rules_active ON guard_rules(active);

CREATE TABLE guard_rule_violations (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  check_id TEXT,
  violation_message TEXT NOT NULL,
  severity TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (severity IN ('info', 'warning', 'critical')),
  FOREIGN KEY (rule_id) REFERENCES guard_rules(id)
);

CREATE INDEX idx_guard_rule_violations_rule ON guard_rule_violations(rule_id);
CREATE INDEX idx_guard_rule_violations_severity ON guard_rule_violations(severity, created_at);

CREATE TRIGGER guard_rule_violations_no_update
BEFORE UPDATE ON guard_rule_violations
BEGIN SELECT RAISE(FAIL, 'guard_rule_violations is append-only'); END;
