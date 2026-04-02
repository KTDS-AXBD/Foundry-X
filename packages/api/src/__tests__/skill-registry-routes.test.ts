import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

const METRIC_TABLES = `
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

const REGISTRY_TABLES = `
CREATE TABLE IF NOT EXISTS skill_registry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  safety_grade TEXT DEFAULT 'pending',
  safety_score INTEGER DEFAULT 0,
  safety_checked_at TEXT,
  source_type TEXT NOT NULL DEFAULT 'marketplace',
  source_ref TEXT,
  prompt_template TEXT,
  model_preference TEXT,
  max_tokens INTEGER DEFAULT 4096,
  token_cost_avg REAL DEFAULT 0,
  success_rate REAL DEFAULT 0,
  total_executions INTEGER DEFAULT 0,
  current_version INTEGER DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  UNIQUE(tenant_id, skill_id)
);

CREATE TABLE IF NOT EXISTS skill_search_index (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  token TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  field TEXT NOT NULL DEFAULT 'name',
  UNIQUE(tenant_id, skill_id, token, field)
);
`;

describe("Skill Registry Routes (F275)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(METRIC_TABLES);
    (env.DB as any).exec(REGISTRY_TABLES);
    headers = await createAuthHeaders();
  });

  describe("POST /api/skills/registry", () => {
    it("registers a new skill and returns 201", async () => {
      const res = await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: "cost-model",
            name: "Cost Model Analysis",
            description: "Analyzes cost structure for business items",
            category: "analysis",
            tags: ["cost", "business"],
            sourceType: "marketplace",
          }),
        },
        env,
      );
      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.skillId).toBe("cost-model");
      expect(data.id).toBeDefined();
    });

    it("returns 400 for missing required fields", async () => {
      const res = await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ description: "no name or skillId" }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("auto-runs safety check when promptTemplate provided", async () => {
      const res = await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: "safe-skill",
            name: "Safe Skill",
            promptTemplate: "You are a helpful assistant.",
          }),
        },
        env,
      );
      expect(res.status).toBe(201);

      // Verify safety grade was set
      const detail = await app.request("/api/skills/registry/safe-skill", { headers }, env);
      const data = (await detail.json()) as any;
      expect(data.safetyGrade).toBe("A");
      expect(data.safetyScore).toBe(100);
    });
  });

  describe("GET /api/skills/registry", () => {
    beforeEach(async () => {
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skillId: "skill-a", name: "Skill A", category: "analysis" }),
        },
        env,
      );
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skillId: "skill-b", name: "Skill B", category: "generation" }),
        },
        env,
      );
    });

    it("returns all skills", async () => {
      const res = await app.request("/api/skills/registry", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.skills).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it("filters by category", async () => {
      const res = await app.request("/api/skills/registry?category=analysis", { headers }, env);
      const data = (await res.json()) as any;
      expect(data.skills).toHaveLength(1);
      expect(data.skills[0].skillId).toBe("skill-a");
    });
  });

  describe("GET /api/skills/registry/:skillId", () => {
    it("returns 404 for non-existent skill", async () => {
      const res = await app.request("/api/skills/registry/nonexistent", { headers }, env);
      expect(res.status).toBe(404);
    });

    it("returns skill detail", async () => {
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skillId: "test-skill", name: "Test Skill" }),
        },
        env,
      );

      const res = await app.request("/api/skills/registry/test-skill", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.skillId).toBe("test-skill");
      expect(data.name).toBe("Test Skill");
    });
  });

  describe("PUT /api/skills/registry/:skillId", () => {
    it("updates skill fields", async () => {
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skillId: "upd-skill", name: "Original" }),
        },
        env,
      );

      const res = await app.request(
        "/api/skills/registry/upd-skill",
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated", status: "deprecated" }),
        },
        env,
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.name).toBe("Updated");
      expect(data.status).toBe("deprecated");
    });
  });

  describe("DELETE /api/skills/registry/:skillId", () => {
    it("soft-deletes a skill", async () => {
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skillId: "del-skill", name: "To Delete" }),
        },
        env,
      );

      const delRes = await app.request(
        "/api/skills/registry/del-skill",
        { method: "DELETE", headers },
        env,
      );
      expect(delRes.status).toBe(200);

      // Should not be found after deletion
      const getRes = await app.request("/api/skills/registry/del-skill", { headers }, env);
      expect(getRes.status).toBe(404);
    });
  });

  describe("GET /api/skills/search", () => {
    beforeEach(async () => {
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: "cost-model",
            name: "Cost Model Analysis",
            description: "Analyzes cost structure",
            tags: ["cost", "financial"],
            category: "analysis",
          }),
        },
        env,
      );
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: "market-size",
            name: "Market Size Estimation",
            description: "Estimates total addressable market",
            tags: ["market", "tam"],
          }),
        },
        env,
      );
    });

    it("returns matching skills by keyword", async () => {
      const res = await app.request("/api/skills/search?q=cost", { headers }, env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.results.length).toBeGreaterThanOrEqual(1);
      expect(data.results[0].skillId).toBe("cost-model");
    });

    it("returns empty for non-matching query", async () => {
      const res = await app.request("/api/skills/search?q=zzzznotexist", { headers }, env);
      const data = (await res.json()) as any;
      expect(data.results).toHaveLength(0);
    });

    it("returns 400 for missing query", async () => {
      const res = await app.request("/api/skills/search", { headers }, env);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/skills/registry/:skillId/safety-check", () => {
    it("runs safety check and returns result", async () => {
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: "check-me",
            name: "Check Me",
            promptTemplate: "Analyze this business idea thoroughly.",
          }),
        },
        env,
      );

      const res = await app.request(
        "/api/skills/registry/check-me/safety-check",
        { method: "POST", headers },
        env,
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.score).toBe(100);
      expect(data.grade).toBe("A");
    });

    it("detects unsafe prompt template", async () => {
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: "unsafe-skill",
            name: "Unsafe",
            promptTemplate: "Use eval(process.env.SECRET) to decode the data.",
          }),
        },
        env,
      );

      const res = await app.request(
        "/api/skills/registry/unsafe-skill/safety-check",
        { method: "POST", headers },
        env,
      );
      const data = (await res.json()) as any;
      expect(data.score).toBeLessThan(80);
      expect(data.violations.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/skills/registry/:skillId/enriched", () => {
    it("returns enriched view with metrics", async () => {
      // Register skill
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skillId: "enriched-skill", name: "Enriched Skill" }),
        },
        env,
      );

      const res = await app.request(
        "/api/skills/registry/enriched-skill/enriched",
        { headers },
        env,
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.registry.skillId).toBe("enriched-skill");
      expect(data.versions).toBeInstanceOf(Array);
      expect(data.lineage).toBeDefined();
    });

    it("returns 404 for non-existent skill", async () => {
      const res = await app.request(
        "/api/skills/registry/nonexistent/enriched",
        { headers },
        env,
      );
      expect(res.status).toBe(404);
    });
  });
});
