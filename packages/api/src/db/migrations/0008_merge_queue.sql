-- Sprint 14: Merge Queue + Parallel Executions
-- F68: 멀티 에이전트 동시 PR 충돌 해결

CREATE TABLE merge_queue (
  id TEXT PRIMARY KEY,
  pr_record_id TEXT NOT NULL REFERENCES agent_prs(id),
  pr_number INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL,
  modified_files TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'queued',
  conflicts_with TEXT DEFAULT '[]',
  rebase_attempted INTEGER DEFAULT 0,
  rebase_succeeded INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  merged_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_merge_queue_status ON merge_queue(status);
CREATE INDEX idx_merge_queue_position ON merge_queue(position);
CREATE INDEX idx_merge_queue_pr ON merge_queue(pr_number);

CREATE TABLE parallel_executions (
  id TEXT PRIMARY KEY,
  task_ids TEXT NOT NULL DEFAULT '[]',
  agent_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'running',
  total_tasks INTEGER NOT NULL,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX idx_parallel_status ON parallel_executions(status);
