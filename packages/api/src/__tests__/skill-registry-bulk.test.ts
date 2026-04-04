import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

const TABLES = `
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

CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY, tenant_id TEXT, skill_id TEXT, version INTEGER DEFAULT 1,
  biz_item_id TEXT, artifact_id TEXT, model TEXT NOT NULL, status TEXT DEFAULT 'completed',
  input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0,
  duration_ms INTEGER DEFAULT 0, error_message TEXT, executed_by TEXT NOT NULL,
  executed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY, tenant_id TEXT, skill_id TEXT, version INTEGER,
  prompt_hash TEXT NOT NULL, model TEXT NOT NULL, max_tokens INTEGER DEFAULT 4096,
  changelog TEXT, created_by TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(tenant_id, skill_id, version)
);

CREATE TABLE IF NOT EXISTS skill_lineage (
  id TEXT PRIMARY KEY, tenant_id TEXT, parent_skill_id TEXT NOT NULL,
  child_skill_id TEXT NOT NULL, derivation_type TEXT DEFAULT 'manual',
  description TEXT, created_by TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_audit_log (
  id TEXT PRIMARY KEY, tenant_id TEXT, entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL, action TEXT NOT NULL, actor_id TEXT NOT NULL,
  details TEXT, created_at TEXT DEFAULT (datetime('now'))
);
`;

describe("Skill Registry Bulk (F304)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(TABLES);
    headers = await createAuthHeaders();
  });

  describe("POST /api/skills/registry/bulk", () => {
    it("creates multiple skills in one request", async () => {
      const res = await app.request(
        "/api/skills/registry/bulk",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skills: [
              { skillId: "skill-1", name: "Skill One", category: "analysis", tags: ["test"] },
              { skillId: "skill-2", name: "Skill Two", category: "general" },
              { skillId: "skill-3", name: "Skill Three", category: "bd-process", tags: ["2-1"] },
            ],
          }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.created).toBe(3);
      expect(data.updated).toBe(0);
      expect(data.errors).toEqual([]);
      expect(data.total).toBe(3);
    });

    it("upserts existing skills (update, not duplicate)", async () => {
      // First: register one skill
      await app.request(
        "/api/skills/registry",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skillId: "existing-skill",
            name: "Original Name",
            category: "general",
          }),
        },
        env,
      );

      // Then: bulk with same skillId + new one
      const res = await app.request(
        "/api/skills/registry/bulk",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skills: [
              { skillId: "existing-skill", name: "Updated Name", category: "analysis" },
              { skillId: "new-skill", name: "New Skill", category: "general" },
            ],
          }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.created).toBe(1);
      expect(data.updated).toBe(1);

      // Verify the update actually happened
      const detailRes = await app.request(
        "/api/skills/registry/existing-skill",
        { headers },
        env,
      );
      expect(detailRes.status).toBe(200);
      const detail = (await detailRes.json()) as any;
      expect(detail.name).toBe("Updated Name");
      expect(detail.category).toBe("analysis");
    });

    it("returns 400 for empty skills array", async () => {
      const res = await app.request(
        "/api/skills/registry/bulk",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skills: [] }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing required fields in skill items", async () => {
      const res = await app.request(
        "/api/skills/registry/bulk",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            skills: [{ description: "no skillId or name" }],
          }),
        },
        env,
      );
      expect(res.status).toBe(400);
    });

    it("returns 403 for non-admin users", async () => {
      // Insert a member-role user into org_members
      (env.DB as any).exec("INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')");
      const memberHeaders = await createAuthHeaders({ sub: "member-user", orgRole: "member" });
      const res = await app.request(
        "/api/skills/registry/bulk",
        {
          method: "POST",
          headers: { ...memberHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            skills: [{ skillId: "s1", name: "Test" }],
          }),
        },
        env,
      );
      expect(res.status).toBe(403);
    });

    it("handles large batch (50+ items)", async () => {
      const skills = Array.from({ length: 60 }, (_, i) => ({
        skillId: `batch-skill-${i}`,
        name: `Batch Skill ${i}`,
        category: "general" as const,
        tags: [`tag-${i % 5}`],
      }));

      const res = await app.request(
        "/api/skills/registry/bulk",
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skills }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.created).toBe(60);
      expect(data.total).toBe(60);

      // Verify via list
      const listRes = await app.request(
        "/api/skills/registry?limit=100",
        { headers },
        env,
      );
      const listData = (await listRes.json()) as any;
      expect(listData.total).toBe(60);
    });
  });
});
