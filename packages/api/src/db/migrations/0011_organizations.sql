-- Migration: 0011_organizations
-- Created: 2026-03-19
-- Description: Multi-tenancy base — organizations + org_members

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro','enterprise')),
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member','viewer')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_orgmember_user ON org_members(user_id);
