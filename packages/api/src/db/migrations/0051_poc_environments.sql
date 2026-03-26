-- Sprint 67: F209 PoC 환경 관리
CREATE TABLE IF NOT EXISTS poc_environments (
  id TEXT PRIMARY KEY,
  prototype_id TEXT NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'provisioning', 'ready', 'teardown', 'terminated', 'failed')),
  config TEXT DEFAULT '{}',
  provisioned_at TEXT,
  terminated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_poc_env_prototype ON poc_environments(prototype_id);
