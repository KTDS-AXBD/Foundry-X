import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DerivedSkillGeneratorService } from "../core/agent/services/derived-skill-generator.js";

const DERIVED_TABLES = `
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
`;

const TENANT = "org_test";

function seedPattern(db: D1Database, opts?: { status?: string }) {
  (db as unknown as { prepare: (q: string) => { bind: (...a: unknown[]) => { run: () => void } } })
    .prepare(
      `INSERT INTO derived_patterns (id, tenant_id, pipeline_stage, pattern_type, skill_ids, success_rate, sample_count, confidence, status)
       VALUES ('pat_1', ?, 'discovery', 'single', '["cost-model"]', 0.85, 10, 0.72, ?)`,
    )
    .bind(TENANT, opts?.status ?? "active")
    .run();
}

function seedSkillRegistry(db: D1Database) {
  (db as unknown as { prepare: (q: string) => { bind: (...a: unknown[]) => { run: () => void } } })
    .prepare(
      `INSERT INTO skill_registry (id, tenant_id, skill_id, name, description, category, prompt_template, created_by)
       VALUES ('sr_1', ?, 'cost-model', 'Cost Model Analysis', 'Analyze costs', 'analysis', 'Analyze the cost structure for the given business item.', 'actor')`,
    )
    .bind(TENANT)
    .run();
}

describe("DerivedSkillGeneratorService (F276)", () => {
  let db: D1Database;
  let svc: DerivedSkillGeneratorService;

  beforeEach(() => {
    const mockDb = createMockD1();
    mockDb.exec(DERIVED_TABLES);
    db = mockDb as unknown as D1Database;
    svc = new DerivedSkillGeneratorService(db);
  });

  it("generates a candidate from active pattern", async () => {
    seedPattern(db);
    seedSkillRegistry(db);

    const candidate = await svc.generate(TENANT, "pat_1");

    expect(candidate.id).toBeDefined();
    expect(candidate.patternId).toBe("pat_1");
    expect(candidate.reviewStatus).toBe("pending");
    expect(candidate.name).toContain("Cost Model Analysis");
    expect(candidate.sourceSkills).toHaveLength(1);
    expect(candidate.sourceSkills[0]!.skillId).toBe("cost-model");
    expect(candidate.safetyScore).toBeGreaterThanOrEqual(0);
  });

  it("throws for non-existent pattern", async () => {
    await expect(svc.generate(TENANT, "no_such_pattern")).rejects.toThrow("Pattern not found");
  });

  it("throws for consumed pattern", async () => {
    seedPattern(db, { status: "consumed" });

    await expect(svc.generate(TENANT, "pat_1")).rejects.toThrow("Pattern is not active");
  });

  it("applies name and category overrides", async () => {
    seedPattern(db);
    seedSkillRegistry(db);

    const candidate = await svc.generate(TENANT, "pat_1", {
      nameOverride: "Custom Derived Skill",
      categoryOverride: "generation",
    });

    expect(candidate.name).toBe("Custom Derived Skill");
    expect(candidate.category).toBe("generation");
  });

  it("lists candidates with filters", async () => {
    seedPattern(db);
    seedSkillRegistry(db);

    await svc.generate(TENANT, "pat_1");

    const { candidates, total } = await svc.listCandidates(TENANT, {
      reviewStatus: "pending", limit: 50, offset: 0,
    });

    expect(total).toBe(1);
    expect(candidates[0]!.reviewStatus).toBe("pending");
  });

  it("returns null for non-existent candidate", async () => {
    const result = await svc.getCandidateById(TENANT, "no_such");
    expect(result).toBeNull();
  });
});
