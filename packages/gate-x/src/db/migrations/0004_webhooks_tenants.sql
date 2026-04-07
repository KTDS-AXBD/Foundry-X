-- Gate-X 외부 웹훅 연동 + 멀티테넌시 격리 (Sprint 194, F410)

-- 웹훅 구독 테이블
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  url         TEXT NOT NULL,
  events      TEXT NOT NULL DEFAULT '["evaluation.completed"]',
  secret      TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_webhooks_org_active
  ON webhook_subscriptions(org_id, is_active);

-- 테넌트 관리 테이블
CREATE TABLE IF NOT EXISTS tenants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'free',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- 테넌트 멤버 테이블
CREATE TABLE IF NOT EXISTS tenant_members (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  is_active   INTEGER NOT NULL DEFAULT 1,
  invited_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_members_uniq
  ON tenant_members(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant
  ON tenant_members(tenant_id, is_active);
