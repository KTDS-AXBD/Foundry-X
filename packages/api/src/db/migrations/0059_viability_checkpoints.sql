-- 0059_viability_checkpoints.sql
-- Sprint 69: 단계별 사업성 체크포인트 (F213)
-- 2-1~2-7 각 단계 완료 시 Go/Pivot/Drop 판단 기록

CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('2-1','2-2','2-3','2-4','2-5','2-6','2-7')),
  decision TEXT NOT NULL CHECK (decision IN ('go','pivot','drop')),
  question TEXT NOT NULL,
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
  UNIQUE(biz_item_id, stage)
);

CREATE INDEX idx_viability_cp_item ON ax_viability_checkpoints(biz_item_id);
CREATE INDEX idx_viability_cp_org ON ax_viability_checkpoints(org_id);
