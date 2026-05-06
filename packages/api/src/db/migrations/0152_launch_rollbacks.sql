-- F618: Launch-X Integration — launch_rollbacks + skill_registry_entries

CREATE TABLE IF NOT EXISTS launch_rollbacks (
  rollback_id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  reason TEXT NOT NULL,
  requester TEXT NOT NULL,
  executed_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_launch_rollbacks_release ON launch_rollbacks(release_id, executed_at DESC);

CREATE TRIGGER IF NOT EXISTS launch_rollbacks_no_update BEFORE UPDATE ON launch_rollbacks
BEGIN
  SELECT RAISE(FAIL, 'launch_rollbacks is append-only');
END;

CREATE TABLE IF NOT EXISTS skill_registry_entries (
  skill_id TEXT PRIMARY KEY,
  skill_version TEXT NOT NULL,
  skill_meta TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  registered_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_skill_registry_active ON skill_registry_entries(active);
