import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

const TABLES = `
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  biz_item_id TEXT,
  artifact_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_by TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  changelog TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, skill_id, version)
);

CREATE TABLE IF NOT EXISTS skill_lineage (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  parent_skill_id TEXT NOT NULL,
  child_skill_id TEXT NOT NULL,
  derivation_type TEXT NOT NULL DEFAULT 'manual',
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function seedExecutions(db: any) {
  (db as any).exec(`
    INSERT INTO skill_executions (id, tenant_id, skill_id, version, model, status, input_tokens, output_tokens, cost_usd, duration_ms, executed_by)
      VALUES ('se1', 'org_test', 'cost-model', 1, 'claude-haiku-4-5', 'completed', 500, 1500, 0.0064, 3200, 'test-user');
    INSERT INTO skill_executions (id, tenant_id, skill_id, version, model, status, input_tokens, output_tokens, cost_usd, duration_ms, executed_by)
      VALUES ('se2', 'org_test', 'cost-model', 1, 'claude-haiku-4-5', 'failed', 200, 0, 0, 500, 'test-user');
    INSERT INTO skill_executions (id, tenant_id, skill_id, version, model, status, input_tokens, output_tokens, cost_usd, duration_ms, executed_by)
      VALUES ('se3', 'org_test', 'feasibility', 1, 'claude-haiku-4-5', 'completed', 800, 2000, 0.0086, 4500, 'test-user');
    INSERT INTO skill_versions (id, tenant_id, skill_id, version, prompt_hash, model, max_tokens, changelog, created_by)
      VALUES ('sv1', 'org_test', 'cost-model', 1, 'abc123', 'claude-haiku-4-5', 4096, 'Initial', 'test-user');
    INSERT INTO skill_lineage (id, tenant_id, parent_skill_id, child_skill_id, derivation_type, created_by)
      VALUES ('sl1', 'org_test', 'cost-model', 'cost-model-v2', 'derived', 'test-user');
    INSERT INTO skill_audit_log (id, tenant_id, entity_type, entity_id, action, actor_id, details)
      VALUES ('sal1', 'org_test', 'execution', 'se1', 'executed', 'test-user', '{"skillId":"cost-model"}');
  `);
}

describe("Skill Metrics Routes (F274)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(TABLES);
    seedExecutions(env.DB);
    headers = await createAuthHeaders();
  });

  describe("GET /api/skills/metrics", () => {
    it("returns 200 with skill metrics summary", async () => {
      const res = await app.request("/api/skills/metrics", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.skills).toBeInstanceOf(Array);
      expect(data.total).toBe(2);
      expect(data.period.days).toBe(30);

      const costModel = data.skills.find((s: any) => s.skillId === "cost-model");
      expect(costModel.totalExecutions).toBe(2);
      expect(costModel.successCount).toBe(1);
      expect(costModel.failedCount).toBe(1);
    });

    it("accepts days query param", async () => {
      const res = await app.request("/api/skills/metrics?days=7", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.period.days).toBe(7);
    });

    it("rejects invalid days", async () => {
      const res = await app.request("/api/skills/metrics?days=0", { headers }, env);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/skills/:skillId/metrics", () => {
    it("returns 200 with detail metrics", async () => {
      const res = await app.request("/api/skills/cost-model/metrics", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.skillId).toBe("cost-model");
      expect(data.totalExecutions).toBe(2);
      expect(data.recentExecutions).toBeInstanceOf(Array);
      expect(data.versions).toBeInstanceOf(Array);
      expect(data.costTrend).toBeInstanceOf(Array);
    });
  });

  describe("GET /api/skills/:skillId/versions", () => {
    it("returns 200 with versions list", async () => {
      const res = await app.request("/api/skills/cost-model/versions", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.versions.length).toBe(1);
      expect(data.versions[0].promptHash).toBe("abc123");
    });
  });

  describe("GET /api/skills/:skillId/lineage", () => {
    it("returns 200 with lineage tree", async () => {
      const res = await app.request("/api/skills/cost-model/lineage", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.skillId).toBe("cost-model");
      expect(data.children.length).toBe(1);
      expect(data.children[0].skillId).toBe("cost-model-v2");
    });
  });

  describe("GET /api/skills/audit-log", () => {
    it("returns 200 with audit entries", async () => {
      const res = await app.request("/api/skills/audit-log", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.entries).toBeInstanceOf(Array);
      expect(data.entries.length).toBeGreaterThanOrEqual(1);
    });

    it("filters by entityType", async () => {
      const res = await app.request("/api/skills/audit-log?entityType=execution", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.entries.every((e: any) => e.entityType === "execution")).toBe(true);
    });

    it("accepts limit and offset", async () => {
      const res = await app.request("/api/skills/audit-log?limit=1&offset=0", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.entries.length).toBeLessThanOrEqual(1);
    });
  });
});
