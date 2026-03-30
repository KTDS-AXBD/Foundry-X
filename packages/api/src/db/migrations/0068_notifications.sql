-- F233: 인앱 알림
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK(type IN ('stage_change','review_request','decision_made','share_created','comment_added')),
  biz_item_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  actor_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id, created_at DESC);
