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

describe("Skill Registry — offering-pptx (F367)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  const offeringPptxSkill = {
    skillId: "offering-pptx",
    name: "Offering PPTX",
    description:
      "AX BD팀 사업기획서(PPTX) 생성 — 18섹션 표준 슬라이드, 디자인 토큰 기반",
    category: "generation",
    tags: ["offering", "pptx", "shape", "business-proposal"],
    sourceType: "derived",
    sourceRef: "docs/specs/axbd/shape/offering-pptx/SKILL.md",
    modelPreference: "opus",
    maxTokens: 8192,
  };

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(METRIC_TABLES);
    (env.DB as any).exec(REGISTRY_TABLES);
    headers = await createAuthHeaders();
  });

  it("registers offering-pptx skill with source_type=derived", async () => {
    const res = await app.request(
      "/api/skills/registry",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(offeringPptxSkill),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.skillId).toBe("offering-pptx");
    expect(data.id).toBeDefined();
  });

  it("retrieves registered offering-pptx skill by id", async () => {
    // Register first
    await app.request(
      "/api/skills/registry",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(offeringPptxSkill),
      },
      env,
    );

    // Retrieve
    const res = await app.request(
      `/api/skills/registry/offering-pptx`,
      { method: "GET", headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.skillId).toBe("offering-pptx");
    expect(data.sourceType).toBe("derived");
    expect(data.sourceRef).toBe(
      "docs/specs/axbd/shape/offering-pptx/SKILL.md",
    );
  });

  it("filters skills by category=generation includes offering-pptx", async () => {
    // Register offering-pptx
    await app.request(
      "/api/skills/registry",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(offeringPptxSkill),
      },
      env,
    );

    // Register different category skill
    await app.request(
      "/api/skills/registry",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: "cost-model",
          name: "Cost Model",
          description: "AI cost model analysis",
          category: "analysis",
          tags: ["cost"],
          sourceType: "marketplace",
        }),
      },
      env,
    );

    // Filter by generation
    const res = await app.request(
      "/api/skills/registry?category=generation",
      { method: "GET", headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    const skills = data.skills || data;
    const ids = (Array.isArray(skills) ? skills : []).map(
      (s: any) => s.skillId,
    );
    expect(ids).toContain("offering-pptx");
    expect(ids).not.toContain("cost-model");
  });

  it("finds offering-pptx via search", async () => {
    // Register
    await app.request(
      "/api/skills/registry",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(offeringPptxSkill),
      },
      env,
    );

    // Search
    const res = await app.request(
      "/api/skills/search?q=pptx",
      { method: "GET", headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    const results = data.results || data;
    const ids = (Array.isArray(results) ? results : []).map(
      (s: any) => s.skillId,
    );
    expect(ids).toContain("offering-pptx");
  });
});
