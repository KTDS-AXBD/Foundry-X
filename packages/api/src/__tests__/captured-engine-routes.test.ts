import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

const CAPTURED_TABLES = `
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL,
  description TEXT, definition TEXT NOT NULL, template_id TEXT,
  enabled INTEGER DEFAULT 1, created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS workflow_executions (
  id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, org_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending', current_step TEXT, context TEXT,
  result TEXT, error TEXT, started_at TEXT, completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  version INTEGER DEFAULT 1, biz_item_id TEXT, artifact_id TEXT,
  model TEXT NOT NULL, status TEXT DEFAULT 'completed',
  input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0, duration_ms INTEGER DEFAULT 0,
  error_message TEXT, executed_by TEXT NOT NULL,
  executed_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS captured_workflow_patterns (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, methodology_id TEXT,
  pipeline_stage TEXT NOT NULL, workflow_step_sequence TEXT NOT NULL,
  skill_sequence TEXT NOT NULL, success_rate REAL NOT NULL,
  sample_count INTEGER NOT NULL, avg_cost_usd REAL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0, confidence REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT
);
CREATE TABLE IF NOT EXISTS captured_candidates (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, pattern_id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT,
  category TEXT NOT NULL DEFAULT 'general', prompt_template TEXT NOT NULL,
  source_workflow_steps TEXT NOT NULL, source_skills TEXT NOT NULL,
  similarity_score REAL DEFAULT 0, safety_grade TEXT DEFAULT 'pending',
  safety_score INTEGER DEFAULT 0, review_status TEXT NOT NULL DEFAULT 'pending',
  registered_skill_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT, reviewed_by TEXT
);
CREATE TABLE IF NOT EXISTS captured_reviews (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, candidate_id TEXT NOT NULL,
  action TEXT NOT NULL, comment TEXT, modified_prompt TEXT,
  reviewer_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS skill_registry (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT, category TEXT DEFAULT 'general',
  tags TEXT, status TEXT DEFAULT 'active',
  safety_grade TEXT DEFAULT 'pending', safety_score INTEGER DEFAULT 0,
  safety_checked_at TEXT, source_type TEXT DEFAULT 'marketplace',
  source_ref TEXT, prompt_template TEXT, model_preference TEXT,
  max_tokens INTEGER DEFAULT 4096, token_cost_avg REAL DEFAULT 0,
  success_rate REAL DEFAULT 0, total_executions INTEGER DEFAULT 0,
  current_version INTEGER DEFAULT 1, created_by TEXT NOT NULL,
  updated_by TEXT, created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), deleted_at TEXT,
  UNIQUE(tenant_id, skill_id)
);
CREATE TABLE IF NOT EXISTS skill_search_index (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  token TEXT NOT NULL, weight REAL DEFAULT 1.0, field TEXT DEFAULT 'name',
  UNIQUE(tenant_id, skill_id, token, field)
);
CREATE TABLE IF NOT EXISTS skill_lineage (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL,
  parent_skill_id TEXT NOT NULL, child_skill_id TEXT NOT NULL,
  derivation_type TEXT DEFAULT 'manual', description TEXT,
  created_by TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS skill_audit_log (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  action TEXT NOT NULL, actor_id TEXT NOT NULL,
  details TEXT, created_at TEXT DEFAULT (datetime('now'))
);
`;

const TENANT = "org_test";
let env: ReturnType<typeof createTestEnv>;
let headers: Record<string, string>;

async function makeRequest(path: string, method = "GET", body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: { ...headers, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  return app.request(`/api${path}`, opts, env);
}

function seedPattern(db: any) {
  db.prepare(
    `INSERT INTO captured_workflow_patterns
      (id, tenant_id, pipeline_stage, workflow_step_sequence, skill_sequence,
       success_rate, sample_count, confidence, status)
     VALUES ('cpat_1', ?, 'discovery',
       '[{"stepId":"s1","stepName":"시장조사","action":"analyze"},{"stepId":"s2","stepName":"경쟁분석","action":"compare"}]',
       '["market-research","competitor-analysis"]',
       0.9, 10, 0.8, 'active')`,
  ).bind(TENANT).run();

  db.prepare(
    `INSERT INTO skill_registry (id, tenant_id, skill_id, name, category, prompt_template, created_by)
     VALUES ('sr_cap', ?, 'market-research', 'Market Research', 'analysis', 'Market analysis prompt', 'actor')`,
  ).bind(TENANT).run();
}

function seedCandidate(db: any) {
  seedPattern(db);
  db.prepare(
    `INSERT INTO captured_candidates
      (id, tenant_id, pattern_id, name, category, prompt_template, source_workflow_steps, source_skills, review_status)
     VALUES ('ccand_1', ?, 'cpat_1', 'Captured Meta Skill', 'analysis', 'Test prompt',
       '[{"stepId":"s1","stepName":"시장조사"}]',
       '[{"skillId":"market-research","contribution":1}]',
       'pending')`,
  ).bind(TENANT).run();
}

describe("captured-engine routes (F277)", () => {
  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(CAPTURED_TABLES);
    headers = await createAuthHeaders();
  });

  // ─── Extract ───

  it("POST /skills/captured/extract — 201 empty (no workflows)", async () => {
    const res = await makeRequest("/skills/captured/extract", "POST", {
      minSampleCount: 3, minSuccessRate: 0.7,
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.count).toBe(0);
    expect(data.patterns).toEqual([]);
  });

  it("POST /skills/captured/extract — 400 invalid input", async () => {
    const res = await makeRequest("/skills/captured/extract", "POST", {
      minSampleCount: -1,
    });
    expect(res.status).toBe(400);
  });

  // ─── Patterns ───

  it("GET /skills/captured/patterns — 200", async () => {
    seedPattern(env.DB as any);
    const res = await makeRequest("/skills/captured/patterns");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.patterns).toBeDefined();
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /skills/captured/patterns/:patternId — 200", async () => {
    seedPattern(env.DB as any);
    const res = await makeRequest("/skills/captured/patterns/cpat_1");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe("cpat_1");
    expect(data.candidateCount).toBeDefined();
  });

  it("GET /skills/captured/patterns/:patternId — 404", async () => {
    const res = await makeRequest("/skills/captured/patterns/no_such");
    expect(res.status).toBe(404);
  });

  // ─── Generate ───

  it("POST /skills/captured/generate — 201", async () => {
    seedPattern(env.DB as any);
    const res = await makeRequest("/skills/captured/generate", "POST", {
      patternId: "cpat_1",
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.patternId).toBe("cpat_1");
    expect(data.reviewStatus).toBe("pending");
    expect(data.sourceWorkflowSteps).toBeDefined();
  });

  it("POST /skills/captured/generate — 400 missing patternId", async () => {
    const res = await makeRequest("/skills/captured/generate", "POST", {});
    expect(res.status).toBe(400);
  });

  // ─── Candidates ───

  it("GET /skills/captured/candidates — 200", async () => {
    seedCandidate(env.DB as any);
    const res = await makeRequest("/skills/captured/candidates");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.candidates).toBeDefined();
  });

  it("GET /skills/captured/candidates/:candidateId — 200", async () => {
    seedCandidate(env.DB as any);
    const res = await makeRequest("/skills/captured/candidates/ccand_1");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe("ccand_1");
  });

  it("GET /skills/captured/candidates/:candidateId — 404", async () => {
    const res = await makeRequest("/skills/captured/candidates/no_such");
    expect(res.status).toBe(404);
  });

  // ─── Review ───

  it("POST /skills/captured/candidates/:candidateId/review — 201 approve", async () => {
    seedCandidate(env.DB as any);
    const res = await makeRequest("/skills/captured/candidates/ccand_1/review", "POST", {
      action: "approved",
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.action).toBe("approved");
  });

  it("POST /skills/captured/candidates/:candidateId/review — 201 reject", async () => {
    seedCandidate(env.DB as any);
    const res = await makeRequest("/skills/captured/candidates/ccand_1/review", "POST", {
      action: "rejected", comment: "Not needed",
    });
    expect(res.status).toBe(201);
  });

  it("POST /skills/captured/candidates/:candidateId/review — 400 invalid action", async () => {
    seedCandidate(env.DB as any);
    const res = await makeRequest("/skills/captured/candidates/ccand_1/review", "POST", {
      action: "invalid_action",
    });
    expect(res.status).toBe(400);
  });

  // ─── Stats ───

  it("GET /skills/captured/stats — 200", async () => {
    seedCandidate(env.DB as any);
    const res = await makeRequest("/skills/captured/stats");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.totalPatterns).toBeGreaterThanOrEqual(1);
    expect(data.totalCandidates).toBeGreaterThanOrEqual(1);
  });
});
