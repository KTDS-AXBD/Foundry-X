-- Migration: 0013_org_invitations
-- Created: 2026-03-19
-- Description: F92 — 초대 테이블

CREATE TABLE IF NOT EXISTS org_invitations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member','viewer')),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  invited_by TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invitation_token ON org_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitation_org ON org_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON org_invitations(email);
