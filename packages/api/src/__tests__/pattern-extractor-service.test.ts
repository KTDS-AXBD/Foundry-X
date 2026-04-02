import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PatternExtractorService, wilsonScoreLowerBound } from "../services/pattern-extractor.js";

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
`;

const TENANT = "org_test";

function seedExecutions(db: D1Database, count: number, skillId: string, status = "completed", bizItemId = "discovery") {
  for (let i = 0; i < count; i++) {
    const id = `se_${skillId}_${status}_${i}`;
    const executedAt = new Date(Date.now() - i * 60000).toISOString();
    (db as unknown as { prepare: (q: string) => { bind: (...a: unknown[]) => { run: () => void } } })
      .prepare(
        `INSERT INTO skill_executions (id, tenant_id, skill_id, biz_item_id, model, status, cost_usd, duration_ms, executed_by, executed_at)
         VALUES (?, ?, ?, ?, 'gpt-4', ?, 0.05, 1000, 'actor', ?)`,
      )
      .bind(id, TENANT, skillId, bizItemId, status, executedAt)
      .run();
  }
}

describe("PatternExtractorService (F276)", () => {
  let db: D1Database;
  let svc: PatternExtractorService;

  beforeEach(() => {
    const mockDb = createMockD1();
    mockDb.exec(DERIVED_TABLES);
    db = mockDb as unknown as D1Database;
    svc = new PatternExtractorService(db);
  });

  it("extracts single skill pattern — 80% success rate, 10 samples", async () => {
    seedExecutions(db, 8, "skill-a", "completed");
    seedExecutions(db, 2, "skill-a", "failed");

    const result = await svc.extract(TENANT, {
      minSampleCount: 5, minSuccessRate: 0.7, includeChains: false,
    });

    expect(result.count).toBe(1);
    expect(result.patterns[0]!.patternType).toBe("single");
    expect(result.patterns[0]!.skillIds).toContain("skill-a");
    expect(result.patterns[0]!.successRate).toBe(0.8);
    expect(result.patterns[0]!.confidence).toBeGreaterThan(0);
  });

  it("filters out patterns below success rate threshold", async () => {
    seedExecutions(db, 5, "skill-low", "completed");
    seedExecutions(db, 5, "skill-low", "failed");

    const result = await svc.extract(TENANT, {
      minSampleCount: 5, minSuccessRate: 0.7, includeChains: false,
    });

    expect(result.count).toBe(0);
  });

  it("filters out patterns below sample count threshold", async () => {
    seedExecutions(db, 3, "skill-few", "completed");

    const result = await svc.extract(TENANT, {
      minSampleCount: 5, minSuccessRate: 0.7, includeChains: false,
    });

    expect(result.count).toBe(0);
  });

  it("filters by pipeline stage", async () => {
    seedExecutions(db, 10, "skill-disc", "completed", "discovery");
    seedExecutions(db, 10, "skill-shap", "completed", "shaping");

    const result = await svc.extract(TENANT, {
      pipelineStage: "discovery",
      minSampleCount: 5, minSuccessRate: 0.7, includeChains: false,
    });

    expect(result.count).toBe(1);
    expect(result.patterns[0]!.pipelineStage).toBe("discovery");
  });

  it("extracts chain patterns — 2 skills in sequence", async () => {
    // Seed sequential executions with same biz_item_id, 10min apart
    for (let i = 0; i < 5; i++) {
      const baseTime = new Date(2026, 0, 1, 10, 0, 0).getTime() + i * 3600000;
      const time1 = new Date(baseTime).toISOString().replace("T", " ").replace("Z", "").slice(0, 19);
      const time2 = new Date(baseTime + 600000).toISOString().replace("T", " ").replace("Z", "").slice(0, 19);

      await db.prepare(
        `INSERT INTO skill_executions (id, tenant_id, skill_id, biz_item_id, model, status, executed_by, executed_at)
         VALUES (?, ?, 'chain-a', ?, 'gpt-4', 'completed', 'actor', ?)`,
      ).bind(`cha_${i}`, TENANT, `biz_${i}`, time1).run();

      await db.prepare(
        `INSERT INTO skill_executions (id, tenant_id, skill_id, biz_item_id, model, status, executed_by, executed_at)
         VALUES (?, ?, 'chain-b', ?, 'gpt-4', 'completed', 'actor', ?)`,
      ).bind(`chb_${i}`, TENANT, `biz_${i}`, time2).run();
    }

    const result = await svc.extract(TENANT, {
      minSampleCount: 2, minSuccessRate: 0.5, includeChains: true,
    });

    const chainPatterns = result.patterns.filter((p) => p.patternType === "chain");
    expect(chainPatterns.length).toBeGreaterThanOrEqual(1);
    expect(chainPatterns[0]!.skillIds).toHaveLength(2);
  });

  it("returns empty result for no data", async () => {
    const result = await svc.extract(TENANT, {
      minSampleCount: 5, minSuccessRate: 0.7, includeChains: true,
    });

    expect(result.count).toBe(0);
    expect(result.patterns).toHaveLength(0);
  });

  it("lists patterns with pagination", async () => {
    seedExecutions(db, 10, "skill-x", "completed", "discovery");
    seedExecutions(db, 10, "skill-y", "completed", "shaping");
    await svc.extract(TENANT, { minSampleCount: 5, minSuccessRate: 0.7, includeChains: false });

    const result = await svc.getPatterns(TENANT, { limit: 1, offset: 0 });
    expect(result.patterns).toHaveLength(1);
    expect(result.total).toBe(2);
  });

  it("gets pattern detail with skills and sample executions", async () => {
    // Register a skill
    await db.prepare(
      `INSERT INTO skill_registry (id, tenant_id, skill_id, name, category, created_by)
       VALUES ('r1', ?, 'skill-detail', 'Detail Skill', 'analysis', 'actor')`,
    ).bind(TENANT).run();

    seedExecutions(db, 10, "skill-detail", "completed");
    const { patterns } = await svc.extract(TENANT, {
      minSampleCount: 5, minSuccessRate: 0.7, includeChains: false,
    });

    const detail = await svc.getPatternDetail(TENANT, patterns[0]!.id);
    expect(detail).not.toBeNull();
    expect(detail!.sampleExecutions.length).toBeGreaterThan(0);
  });
});

describe("wilsonScoreLowerBound", () => {
  it("returns 0 for n=0", () => {
    expect(wilsonScoreLowerBound(0.5, 0)).toBe(0);
  });

  it("returns positive value for valid inputs", () => {
    const score = wilsonScoreLowerBound(0.8, 10);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.8);
  });

  it("higher sample count gives higher confidence", () => {
    const low = wilsonScoreLowerBound(0.8, 5);
    const high = wilsonScoreLowerBound(0.8, 100);
    expect(high).toBeGreaterThan(low);
  });
});
