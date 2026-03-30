-- F226: Party Mode (다중 에이전트 세션)
CREATE TABLE IF NOT EXISTS party_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'free-form' CHECK(mode IN ('free-form', 'round-robin', 'moderated')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'concluded', 'cancelled')),
  max_participants INTEGER NOT NULL DEFAULT 10,
  created_by TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  concluded_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_party_sessions_org ON party_sessions(org_id, status);

CREATE TABLE IF NOT EXISTS party_participants (
  session_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (session_id, agent_role),
  FOREIGN KEY (session_id) REFERENCES party_sessions(id)
);

CREATE TABLE IF NOT EXISTS party_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'opinion' CHECK(message_type IN ('opinion', 'question', 'answer', 'summary')),
  reply_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES party_sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_party_messages_session ON party_messages(session_id, created_at);
