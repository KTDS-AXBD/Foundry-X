-- Sprint 95: Help Agent conversations (F264)
CREATE TABLE IF NOT EXISTS help_agent_conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  biz_item_id TEXT,
  discovery_stage TEXT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  is_local_response INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_help_agent_conv ON help_agent_conversations(conversation_id, created_at);
CREATE INDEX idx_help_agent_tenant ON help_agent_conversations(tenant_id, created_at);
