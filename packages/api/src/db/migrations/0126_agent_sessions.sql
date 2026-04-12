-- Migration: 0126_agent_sessions.sql
-- Feature: F510 fx-multi-agent-session M4

CREATE TABLE IF NOT EXISTS agent_sessions (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'idle',
  profile       TEXT NOT NULL DEFAULT 'coder',
  worktree      TEXT,
  branch        TEXT,
  windows       INTEGER DEFAULT 1,
  last_activity TEXT,
  collected_at  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
