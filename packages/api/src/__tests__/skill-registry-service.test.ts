import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { SkillRegistryService } from "../services/skill-registry.js";
import { SkillSearchService } from "../services/skill-search.js";

const ALL_TABLES = `
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  version INTEGER DEFAULT 1, biz_item_id TEXT, artifact_id TEXT,
  model TEXT NOT NULL, status TEXT DEFAULT 'completed',
  input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0, duration_ms INTEGER DEFAULT 0,
  error_message TEXT, executed_by TEXT NOT NULL,
  executed_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  version INTEGER NOT NULL, prompt_hash TEXT NOT NULL, model TEXT NOT NULL,
  max_tokens INTEGER DEFAULT 4096, changelog TEXT, created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')), UNIQUE(tenant_id, skill_id, version)
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
CREATE TABLE IF NOT EXISTS skill_registry (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT,
  category TEXT DEFAULT 'general', tags TEXT,
  status TEXT DEFAULT 'active',
  safety_grade TEXT DEFAULT 'pending', safety_score INTEGER DEFAULT 0,
  safety_checked_at TEXT,
  source_type TEXT DEFAULT 'marketplace', source_ref TEXT,
  prompt_template TEXT, model_preference TEXT,
  max_tokens INTEGER DEFAULT 4096,
  token_cost_avg REAL DEFAULT 0, success_rate REAL DEFAULT 0,
  total_executions INTEGER DEFAULT 0, current_version INTEGER DEFAULT 1,
  created_by TEXT NOT NULL, updated_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  UNIQUE(tenant_id, skill_id)
);
CREATE TABLE IF NOT EXISTS skill_search_index (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  token TEXT NOT NULL, weight REAL DEFAULT 1.0,
  field TEXT DEFAULT 'name',
  UNIQUE(tenant_id, skill_id, token, field)
);
`;

const TENANT = "org_test";

describe("SkillRegistryService (F275)", () => {
  let db: D1Database;
  let svc: SkillRegistryService;

  beforeEach(() => {
    const mockDb = createMockD1();
    mockDb.exec(ALL_TABLES);
    db = mockDb as unknown as D1Database;
    svc = new SkillRegistryService(db);
  });

  it("registers and retrieves a skill", async () => {
    const { id, skillId } = await svc.register(
      TENANT,
      { skillId: "cost-model", name: "Cost Model", category: "analysis", sourceType: "marketplace" },
      "actor1",
    );
    expect(id).toBeDefined();
    expect(skillId).toBe("cost-model");

    const entry = await svc.getById(TENANT, "cost-model");
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("Cost Model");
    expect(entry!.category).toBe("analysis");
  });

  it("lists skills with pagination", async () => {
    await svc.register(TENANT, { skillId: "s1", name: "S1", category: "general", sourceType: "marketplace" }, "a");
    await svc.register(TENANT, { skillId: "s2", name: "S2", category: "general", sourceType: "marketplace" }, "a");
    await svc.register(TENANT, { skillId: "s3", name: "S3", category: "general", sourceType: "marketplace" }, "a");

    const { skills, total } = await svc.list(TENANT, { limit: 2, offset: 0 });
    expect(skills).toHaveLength(2);
    expect(total).toBe(3);
  });

  it("filters by category", async () => {
    await svc.register(TENANT, { skillId: "s1", name: "S1", category: "analysis", sourceType: "marketplace" }, "a");
    await svc.register(TENANT, { skillId: "s2", name: "S2", category: "generation", sourceType: "marketplace" }, "a");

    const { skills } = await svc.list(TENANT, { category: "analysis", limit: 50, offset: 0 });
    expect(skills).toHaveLength(1);
    expect(skills[0]!.skillId).toBe("s1");
  });

  it("updates skill fields", async () => {
    await svc.register(TENANT, { skillId: "upd", name: "Original", category: "general", sourceType: "marketplace" }, "a");
    const updated = await svc.update(TENANT, "upd", { name: "Updated", status: "deprecated" }, "a");
    expect(updated.name).toBe("Updated");
    expect(updated.status).toBe("deprecated");
  });

  it("soft-deletes a skill", async () => {
    await svc.register(TENANT, { skillId: "del", name: "ToDelete", category: "general", sourceType: "marketplace" }, "a");
    await svc.softDelete(TENANT, "del", "a");
    const entry = await svc.getById(TENANT, "del");
    expect(entry).toBeNull();
  });

  it("auto-runs safety check on register with prompt", async () => {
    await svc.register(
      TENANT,
      { skillId: "safe", name: "Safe", category: "general", promptTemplate: "Analyze business.", sourceType: "marketplace" },
      "a",
    );
    const entry = await svc.getById(TENANT, "safe");
    expect(entry!.safetyGrade).toBe("A");
    expect(entry!.safetyScore).toBe(100);
  });

  it("detects unsafe prompt on register", async () => {
    await svc.register(
      TENANT,
      { skillId: "unsafe", name: "Unsafe", category: "general", promptTemplate: "Use eval(process.env.SECRET)", sourceType: "marketplace" },
      "a",
    );
    const entry = await svc.getById(TENANT, "unsafe");
    expect(entry!.safetyGrade).not.toBe("A");
    expect(entry!.safetyScore).toBeLessThan(80);
  });

  it("runs safety check explicitly", async () => {
    await svc.register(
      TENANT,
      { skillId: "chk", name: "Check", category: "general", promptTemplate: "Helpful assistant.", sourceType: "marketplace" },
      "a",
    );
    const result = await svc.runSafetyCheck(TENANT, "chk");
    expect(result.grade).toBe("A");
    expect(result.score).toBe(100);
  });

  it("getEnriched returns combined data", async () => {
    await svc.register(TENANT, { skillId: "enriched", name: "Enriched", category: "general", sourceType: "marketplace" }, "a");
    const enriched = await svc.getEnriched(TENANT, "enriched");
    expect(enriched).not.toBeNull();
    expect(enriched!.registry.skillId).toBe("enriched");
    expect(enriched!.versions).toBeInstanceOf(Array);
    expect(enriched!.lineage).toBeDefined();
  });
});

describe("SkillSearchService (F275)", () => {
  let db: D1Database;
  let searchSvc: SkillSearchService;
  let registrySvc: SkillRegistryService;

  beforeEach(() => {
    const mockDb = createMockD1();
    mockDb.exec(ALL_TABLES);
    db = mockDb as unknown as D1Database;
    searchSvc = new SkillSearchService(db);
    registrySvc = new SkillRegistryService(db);
  });

  it("builds index and finds by name token", async () => {
    await registrySvc.register(
      TENANT,
      { skillId: "cost-model", name: "Cost Model Analysis", category: "analysis", tags: ["cost"], sourceType: "marketplace" },
      "a",
    );

    const results = await searchSvc.search(TENANT, "cost");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.skillId).toBe("cost-model");
  });

  it("finds by description token", async () => {
    await registrySvc.register(
      TENANT,
      { skillId: "market", name: "Market Sizing", category: "general", description: "Estimates total addressable market", sourceType: "marketplace" },
      "a",
    );

    const results = await searchSvc.search(TENANT, "addressable");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty for non-matching query", async () => {
    const results = await searchSvc.search(TENANT, "zzzznotexist");
    expect(results).toHaveLength(0);
  });

  it("ranks name matches higher than description", async () => {
    await registrySvc.register(
      TENANT,
      { skillId: "s1", name: "Cost Analysis", category: "general", description: "General analysis tool", sourceType: "marketplace" },
      "a",
    );
    await registrySvc.register(
      TENANT,
      { skillId: "s2", name: "General Tool", category: "general", description: "Helps with cost estimation", sourceType: "marketplace" },
      "a",
    );

    const results = await searchSvc.search(TENANT, "cost");
    expect(results.length).toBe(2);
    // s1 should rank higher (name match = weight 3.0 vs description = 1.0)
    expect(results[0]!.skillId).toBe("s1");
  });
});
