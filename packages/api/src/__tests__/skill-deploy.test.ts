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
  skill_md_content TEXT,
  skill_md_generated_at TEXT,
  UNIQUE(tenant_id, skill_id)
);
CREATE TABLE IF NOT EXISTS skill_search_index (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  token TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1.0,
  field TEXT NOT NULL DEFAULT 'name',
  UNIQUE(tenant_id, skill_id, token, field)
);
`;

function seedSkill(env: ReturnType<typeof createTestEnv>) {
  (env.DB as any).exec(`
    INSERT INTO skill_registry (id, tenant_id, skill_id, name, description, category, tags, source_type, prompt_template, created_by)
    VALUES ('sr_1', 'org_test', 'derived_abc', 'Cost Analysis', 'Analyzes costs', 'analysis', '["cost","finance"]', 'derived', 'Analyze cost for {{target}}', 'test-user')
  `);
}

describe("POST /api/skills/registry/:skillId/deploy (F306)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(TABLES);
    seedSkill(env);
    headers = await createAuthHeaders();
  });

  it("preview 모드 — SKILL.md 텍스트 반환", async () => {
    const res = await app.request(
      "/api/skills/registry/derived_abc/deploy",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ format: "preview" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.skillId).toBe("derived_abc");
    expect(data.skillMd).toContain('name: "Cost Analysis"');
    expect(data.skillMd).toContain("## Steps");
    expect(data.skillMd).toContain("Analyze cost for {{target}}");
    expect(data.fileName).toBe("derived_abc/SKILL.md");
    expect(data.generatedAt).toBeDefined();
  });

  it("download 모드 — text/markdown Content-Type", async () => {
    const res = await app.request(
      "/api/skills/registry/derived_abc/deploy",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ format: "download" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/markdown");
    expect(res.headers.get("Content-Disposition")).toContain("SKILL.md");
    const text = await res.text();
    expect(text).toContain("# Cost Analysis");
  });

  it("존재하지 않는 skillId — 404", async () => {
    const res = await app.request(
      "/api/skills/registry/nonexistent/deploy",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("비admin — 403", async () => {
    // member user 등록 (org_members에 member role)
    (env.DB as any).exec(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')"
    );
    const memberHeaders = await createAuthHeaders({ sub: "member-user", orgRole: "member" });
    const res = await app.request(
      "/api/skills/registry/derived_abc/deploy",
      {
        method: "POST",
        headers: { ...memberHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("D1에 skill_md_content 캐시 저장", async () => {
    await app.request(
      "/api/skills/registry/derived_abc/deploy",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );

    const row = await env.DB.prepare(
      "SELECT skill_md_content, skill_md_generated_at FROM skill_registry WHERE skill_id = ?"
    ).bind("derived_abc").first<{ skill_md_content: string; skill_md_generated_at: string }>();

    expect(row?.skill_md_content).toContain("Cost Analysis");
    expect(row?.skill_md_generated_at).toBeDefined();
  });
});
