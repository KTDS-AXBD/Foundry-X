-- F136: 태스크별 모델 라우팅 규칙 테이블
CREATE TABLE IF NOT EXISTS model_routing_rules (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  model_id TEXT NOT NULL,
  runner_type TEXT NOT NULL DEFAULT 'openrouter',
  priority INTEGER NOT NULL DEFAULT 1,
  max_cost_per_call REAL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_type, model_id)
);

-- 기본 시드: 비용/품질 최적화 기반 배정
INSERT INTO model_routing_rules (id, task_type, model_id, runner_type, priority) VALUES
  ('mrr_01', 'code-review',       'anthropic/claude-sonnet-4',    'openrouter', 1),
  ('mrr_02', 'code-generation',   'anthropic/claude-sonnet-4',    'openrouter', 1),
  ('mrr_03', 'spec-analysis',     'anthropic/claude-opus-4',      'openrouter', 1),
  ('mrr_04', 'test-generation',   'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_05', 'policy-evaluation', 'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_06', 'skill-query',       'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_07', 'ontology-lookup',   'anthropic/claude-haiku-4-5',   'openrouter', 1);
