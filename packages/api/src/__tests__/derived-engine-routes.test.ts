import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

const DERIVED_TABLES = `
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  version INTEGER DEFAULT 1, biz_item_id TEXT, artifact_id TEXT,
  model TEXT NOT NULL, status TEXT DEFAULT 'completed',
  input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0, duration_ms INTEGER DEFAULT 0,
  error_message TEXT, executed_by TEXT NOT NULL,
  executed_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS derived_patterns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pipeline_stage TEXT NOT NULL,
  discovery_stage TEXT,
  pattern_type TEXT NOT NULL DEFAULT 'single',
  skill_ids TEXT NOT NULL,
  success_rate REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  avg_cost_usd REAL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  confidence REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);
CREATE TABLE IF NOT EXISTS derived_candidates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  prompt_template TEXT NOT NULL,
  source_skills TEXT NOT NULL,
  similarity_score REAL DEFAULT 0,
  safety_grade TEXT DEFAULT 'pending',
  safety_score INTEGER DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  registered_skill_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT
);
CREATE TABLE IF NOT EXISTS derived_reviews (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  comment TEXT,
  modified_prompt TEXT,
  reviewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

function seedData() {
  const db = env.DB as any;
  // Seed executions
  for (let i = 0; i < 10; i++) {
    db.prepare(
      `INSERT INTO skill_executions (id, tenant_id, skill_id, biz_item_id, model, status, cost_usd, duration_ms, executed_by)
       VALUES (?, ?, 'skill-route', 'discovery', 'gpt-4', 'completed', 0.05, 1000, 'actor')`,
    ).bind(`se_r_${i}`, TENANT).run();
  }

  // Seed a pattern
  db.prepare(
    `INSERT INTO derived_patterns (id, tenant_id, pipeline_stage, pattern_type, skill_ids, success_rate, sample_count, confidence, status)
     VALUES ('pat_route', ?, 'discovery', 'single', '["skill-route"]', 0.9, 10, 0.8, 'active')`,
  ).bind(TENANT).run();

  // Seed skill_registry
  db.prepare(
    `INSERT INTO skill_registry (id, tenant_id, skill_id, name, category, prompt_template, created_by)
     VALUES ('sr_route', ?, 'skill-route', 'Route Skill', 'analysis', 'Test prompt', 'actor')`,
  ).bind(TENANT).run();

  // Seed a candidate
  db.prepare(
    `INSERT INTO derived_candidates (id, tenant_id, pattern_id, name, category, prompt_template, source_skills, review_status)
     VALUES ('cand_route', ?, 'pat_route', 'Route Candidate', 'analysis', 'Test prompt', '[{"skillId":"skill-route","contribution":1}]', 'pending')`,
  ).bind(TENANT).run();
}

describe("derived-engine routes (F276)", () => {
  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(DERIVED_TABLES);
    headers = await createAuthHeaders();
  });

  it("POST /skills/derived/extract — 201", async () => {
    // Seed executions
    const db = env.DB as any;
    for (let i = 0; i < 10; i++) {
      db.prepare(
        `INSERT INTO skill_executions (id, tenant_id, skill_id, biz_item_id, model, status, executed_by)
         VALUES (?, ?, 'skill-ext', 'discovery', 'gpt-4', 'completed', 'actor')`,
      ).bind(`se_ext_${i}`, TENANT).run();
    }

    const res = await makeRequest("/skills/derived/extract", "POST", {
      minSampleCount: 5, minSuccessRate: 0.7,
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.count).toBeGreaterThanOrEqual(1);
  });

  it("POST /skills/derived/extract — 400 invalid input", async () => {
    const res = await makeRequest("/skills/derived/extract", "POST", {
      minSampleCount: -1,
    });
    expect(res.status).toBe(400);
  });

  it("GET /skills/derived/patterns — 200", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/patterns");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.patterns).toBeDefined();
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /skills/derived/patterns/:patternId — 200", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/patterns/pat_route");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe("pat_route");
  });

  it("GET /skills/derived/patterns/:patternId — 404", async () => {
    const res = await makeRequest("/skills/derived/patterns/no_such");
    expect(res.status).toBe(404);
  });

  it("POST /skills/derived/generate — 201", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/generate", "POST", {
      patternId: "pat_route",
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.patternId).toBe("pat_route");
    expect(data.reviewStatus).toBe("pending");
  });

  it("POST /skills/derived/generate — 400 missing patternId", async () => {
    const res = await makeRequest("/skills/derived/generate", "POST", {});
    expect(res.status).toBe(400);
  });

  it("GET /skills/derived/candidates — 200", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/candidates");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.candidates).toBeDefined();
  });

  it("GET /skills/derived/candidates/:candidateId — 200", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/candidates/cand_route");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe("cand_route");
  });

  it("GET /skills/derived/candidates/:candidateId — 404", async () => {
    const res = await makeRequest("/skills/derived/candidates/no_such");
    expect(res.status).toBe(404);
  });

  it("POST /skills/derived/candidates/:candidateId/review — 201 approve", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/candidates/cand_route/review", "POST", {
      action: "approved",
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.action).toBe("approved");
  });

  it("POST /skills/derived/candidates/:candidateId/review — 201 reject", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/candidates/cand_route/review", "POST", {
      action: "rejected", comment: "Not needed",
    });
    expect(res.status).toBe(201);
  });

  it("POST /skills/derived/candidates/:candidateId/review — 400 invalid action", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/candidates/cand_route/review", "POST", {
      action: "invalid_action",
    });
    expect(res.status).toBe(400);
  });

  it("GET /skills/derived/stats — 200", async () => {
    seedData();
    const res = await makeRequest("/skills/derived/stats");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.totalPatterns).toBeGreaterThanOrEqual(1);
    expect(data.totalCandidates).toBeGreaterThanOrEqual(1);
  });
});
