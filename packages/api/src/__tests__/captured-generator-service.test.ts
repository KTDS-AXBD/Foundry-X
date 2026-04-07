import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { CapturedSkillGeneratorService } from "../core/agent/services/captured-skill-generator.js";

const CAPTURED_TABLES = `
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
`;

const TENANT = "org_test";

function seedPattern(db: D1Database) {
  (db as any).prepare(
    `INSERT INTO captured_workflow_patterns
      (id, tenant_id, pipeline_stage, workflow_step_sequence, skill_sequence,
       success_rate, sample_count, confidence, status)
     VALUES ('cpat_g1', ?, 'discovery',
       '[{"stepId":"s1","stepName":"시장조사","action":"analyze"},{"stepId":"s2","stepName":"경쟁분석","action":"compare"}]',
       '["market-research","competitor-analysis"]',
       0.9, 10, 0.8, 'active')`,
  ).bind(TENANT).run();

  // Source skills in registry
  (db as any).prepare(
    `INSERT INTO skill_registry (id, tenant_id, skill_id, name, category, prompt_template, created_by)
     VALUES ('sr_g1', ?, 'market-research', 'Market Research', 'analysis', '시장 규모, 트렌드 분석', 'actor')`,
  ).bind(TENANT).run();

  (db as any).prepare(
    `INSERT INTO skill_registry (id, tenant_id, skill_id, name, category, prompt_template, created_by)
     VALUES ('sr_g2', ?, 'competitor-analysis', 'Competitor Analysis', 'analysis', '경쟁사 강점/약점 분석', 'actor')`,
  ).bind(TENANT).run();
}

describe("CapturedSkillGeneratorService (F277)", () => {
  let db: D1Database;
  let svc: CapturedSkillGeneratorService;

  beforeEach(() => {
    const mockDb = createMockD1();
    mockDb.exec(CAPTURED_TABLES);
    db = mockDb as unknown as D1Database;
    svc = new CapturedSkillGeneratorService(db);
  });

  it("generates candidate from active pattern", async () => {
    seedPattern(db);

    const result = await svc.generate(TENANT, "cpat_g1");

    expect(result.patternId).toBe("cpat_g1");
    expect(result.reviewStatus).toBe("pending");
    expect(result.name).toContain("워크플로우 최적화");
    expect(result.sourceWorkflowSteps).toHaveLength(2);
    expect(result.sourceSkills).toHaveLength(2);
    expect(result.safetyGrade).toBeDefined();
    expect(result.promptTemplate).toContain("시장조사");
  });

  it("generates candidate with name override", async () => {
    seedPattern(db);

    const result = await svc.generate(TENANT, "cpat_g1", { nameOverride: "Custom Workflow Skill" });

    expect(result.name).toBe("Custom Workflow Skill");
  });

  it("generates candidate with category override", async () => {
    seedPattern(db);

    const result = await svc.generate(TENANT, "cpat_g1", { categoryOverride: "bd-process" });

    expect(result.category).toBe("bd-process");
  });

  it("determines category by majority from source skills", async () => {
    seedPattern(db);

    const result = await svc.generate(TENANT, "cpat_g1");

    // Both source skills are 'analysis'
    expect(result.category).toBe("analysis");
  });

  it("throws on non-existent pattern", async () => {
    await expect(svc.generate(TENANT, "no_such"))
      .rejects.toThrow("Pattern not found");
  });

  it("throws on non-active pattern", async () => {
    seedPattern(db);
    (db as any).prepare(
      "UPDATE captured_workflow_patterns SET status = 'consumed' WHERE id = 'cpat_g1'",
    ).bind().run();

    await expect(svc.generate(TENANT, "cpat_g1"))
      .rejects.toThrow("Pattern is not active");
  });

  it("performs similarity check against search index", async () => {
    seedPattern(db);

    // Add search index tokens
    (db as any).prepare(
      `INSERT INTO skill_search_index (id, tenant_id, skill_id, token, weight, field)
       VALUES ('si1', ?, 'existing-skill', '워크플로우', 1, 'name')`,
    ).bind(TENANT).run();

    const result = await svc.generate(TENANT, "cpat_g1");
    expect(result.similarityScore).toBeGreaterThanOrEqual(0);
    expect(result.similarityScore).toBeLessThanOrEqual(1);
  });

  it("generates safe prompt with grade A", async () => {
    seedPattern(db);

    const result = await svc.generate(TENANT, "cpat_g1");

    expect(result.safetyGrade).toBe("A");
    expect(result.safetyScore).toBe(100);
  });

  // ─── List + Detail ───

  it("lists candidates with filter", async () => {
    seedPattern(db);
    await svc.generate(TENANT, "cpat_g1");

    const result = await svc.listCandidates(TENANT, {
      reviewStatus: "pending",
      limit: 50, offset: 0,
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("getCandidateDetail — returns pattern and reviews", async () => {
    seedPattern(db);
    const candidate = await svc.generate(TENANT, "cpat_g1");

    const detail = await svc.getCandidateDetail(TENANT, candidate.id);
    expect(detail).not.toBeNull();
    expect(detail!.pattern).toBeDefined();
    expect(detail!.reviews).toEqual([]);
  });

  it("getCandidateById — returns null for non-existent", async () => {
    const result = await svc.getCandidateById(TENANT, "no_such");
    expect(result).toBeNull();
  });
});
