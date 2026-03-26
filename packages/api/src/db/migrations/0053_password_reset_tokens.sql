-- Sprint 67: F210 비밀번호 재설정 토큰
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_prt_token ON password_reset_tokens(token);
CREATE INDEX idx_prt_user ON password_reset_tokens(user_id);
