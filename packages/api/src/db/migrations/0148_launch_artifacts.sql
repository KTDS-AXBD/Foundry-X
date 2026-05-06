-- F616: Launch-X Solo (T4 두 번째)

-- Type 1: 정적 패키지 (zip + download URL)
CREATE TABLE launch_artifacts_type1 (
  release_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  download_url TEXT NOT NULL,
  manifest_path TEXT NOT NULL,
  zip_size INTEGER,
  sha256 TEXT NOT NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);
CREATE INDEX idx_launch_t1_org ON launch_artifacts_type1(org_id);

-- Type 2: 런타임 인스턴스 (invoke endpoint)
CREATE TABLE launch_runtimes_type2 (
  release_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  invoke_endpoint TEXT NOT NULL,
  runtime_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (status IN ('pending','active','retired'))
);
CREATE INDEX idx_launch_t2_org ON launch_runtimes_type2(org_id);

-- 공통: Decision Log (Type 1/2 공통 추적)
CREATE TABLE launch_decisions (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  launch_type INTEGER NOT NULL,
  manifest_json TEXT NOT NULL,
  audit_event_id INTEGER,
  decided_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (launch_type IN (1, 2))
);
CREATE INDEX idx_launch_decisions_release ON launch_decisions(release_id);
CREATE INDEX idx_launch_decisions_org ON launch_decisions(org_id, decided_at DESC);
