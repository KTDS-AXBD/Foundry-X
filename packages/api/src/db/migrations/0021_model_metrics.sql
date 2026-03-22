CREATE TABLE model_execution_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success'
    CHECK(status IN ('success', 'partial', 'failed')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_mem_model ON model_execution_metrics(model);
CREATE INDEX idx_mem_project ON model_execution_metrics(project_id);
CREATE INDEX idx_mem_recorded ON model_execution_metrics(recorded_at);
CREATE INDEX idx_mem_agent_model ON model_execution_metrics(agent_name, model);
