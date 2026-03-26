-- 0060_commit_gates.sql
-- Sprint 69: 2-5 Commit Gate (F213)
-- 핵심 아이템 선정 후 4개 질문 심화 논의 + 최종 판정

CREATE TABLE IF NOT EXISTS ax_commit_gates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  question_1_answer TEXT,
  question_2_answer TEXT,
  question_3_answer TEXT,
  question_4_answer TEXT,
  final_decision TEXT NOT NULL CHECK (final_decision IN ('commit','explore_alternatives','drop')),
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id)
);
