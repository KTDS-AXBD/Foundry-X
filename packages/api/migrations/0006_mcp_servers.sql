CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  transport_type TEXT NOT NULL DEFAULT 'sse' CHECK (transport_type IN ('sse', 'http')),
  api_key_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  last_connected_at TEXT,
  error_message TEXT,
  tools_cache TEXT,
  tools_cached_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_mcp_servers_status ON mcp_servers(status);
