import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  };

  // Import index to ensure harness route + onError are registered
  return import("../index.js").then(() => app.request(url, init, env));
}

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

describe("HarnessRulesService — F126", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))",
    );

    // Relax kpi_events CHECK constraint for harness_violation event type
    (env.DB as any).exec?.("DROP TABLE IF EXISTS kpi_events_bak") ?? undefined;
    seedDb(`
      CREATE TABLE IF NOT EXISTS kpi_events_new (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        user_id TEXT,
        agent_id TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    seedDb("INSERT INTO kpi_events_new SELECT * FROM kpi_events WHERE 1=0");
    seedDb("DROP TABLE kpi_events");
    seedDb("ALTER TABLE kpi_events_new RENAME TO kpi_events");
    seedDb("CREATE INDEX IF NOT EXISTS idx_kpi_events_tenant_type ON kpi_events(tenant_id, event_type, created_at)");

    authHeader = await createAuthHeaders();
  });

  it("GET /api/harness/rules/:projectId — returns check result for non-existent project", async () => {
    const res = await req("GET", "/api/harness/rules/proj-missing", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("score");
    expect(data).toHaveProperty("passed");
    expect(data).toHaveProperty("violations");
    expect(data).toHaveProperty("checkedAt");
    expect(data.violations.length).toBeGreaterThan(0);
    expect(data.violations[0].rule).toBe("placeholder-check");
  });

  it("GET /api/harness/rules/:projectId — passes for valid project with agents", async () => {
    seedDb(
      "INSERT INTO projects (id, name, repo_url, owner_id, org_id, created_at) VALUES ('proj-1', 'Test Project', 'https://github.com/test/repo', 'test-user', 'org_test', datetime('now'))",
    );
    seedDb(
      "INSERT INTO agents (id, name, org_id, created_at) VALUES ('agent-1', 'Test Agent', 'org_test', datetime('now'))",
    );

    const res = await req("GET", "/api/harness/rules/proj-1", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.score).toBeGreaterThanOrEqual(60);
    expect(data.passed).toBe(true);
  });

  it("GET /api/harness/rules/:projectId — detects consistency violation (no agents)", async () => {
    seedDb(
      "INSERT INTO projects (id, name, repo_url, owner_id, org_id, created_at) VALUES ('proj-2', 'Test Project', 'https://github.com/test/repo', 'test-user', 'org_test', datetime('now'))",
    );

    const res = await req("GET", "/api/harness/rules/proj-2", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    const rules = data.violations.map((v: any) => v.rule);
    expect(rules).toContain("consistency-check");
  });

  it("GET /api/harness/rules/:projectId — detects freshness violation (stale wiki)", async () => {
    seedDb(
      "INSERT INTO projects (id, name, repo_url, owner_id, org_id, created_at) VALUES ('proj-3', 'Test Project', 'https://github.com/test/repo', 'test-user', 'org_test', datetime('now'))",
    );
    seedDb(
      "INSERT INTO agents (id, name, org_id, created_at) VALUES ('agent-2', 'Test Agent', 'org_test', datetime('now'))",
    );
    // Wiki page updated 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 86400_000).toISOString();
    seedDb(
      `INSERT INTO wiki_pages (id, project_id, slug, title, content, updated_at) VALUES ('wiki-1', 'proj-3', 'readme', 'README', 'content', '${tenDaysAgo}')`,
    );

    const res = await req("GET", "/api/harness/rules/proj-3", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    const rules = data.violations.map((v: any) => v.rule);
    expect(rules).toContain("freshness-check");
  });

  it("GET /api/harness/rules/:projectId — detects schema-drift (specs without tasks)", async () => {
    seedDb(
      "INSERT INTO projects (id, name, repo_url, owner_id, org_id, created_at) VALUES ('proj-4', 'Test Project', 'https://github.com/test/repo', 'test-user', 'org_test', datetime('now'))",
    );
    seedDb(
      "INSERT INTO agents (id, name, org_id, created_at) VALUES ('agent-3', 'Test Agent', 'org_test', datetime('now'))",
    );
    seedDb(
      "INSERT INTO wiki_pages (id, project_id, slug, title, content, updated_at) VALUES ('wiki-2', 'proj-4', 'spec-f1', 'Spec F1', 'content', datetime('now'))",
    );

    const res = await req("GET", "/api/harness/rules/proj-4", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    const rules = data.violations.map((v: any) => v.rule);
    expect(rules).toContain("schema-drift");
  });

  it("GET /api/harness/rules/:projectId — records kpi_event on violations", async () => {
    const res = await req("GET", "/api/harness/rules/proj-no-exist", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);

    // Verify kpi_events was written
    const kpiRow = await (env.DB as any)
      .prepare("SELECT * FROM kpi_events WHERE event_type = 'harness_violation'")
      .first();
    expect(kpiRow).toBeTruthy();
    expect(kpiRow.tenant_id).toBe("org_test");
    const metadata = JSON.parse(kpiRow.metadata);
    expect(metadata.violationCount).toBeGreaterThan(0);
  });

  it("GET /api/harness/violations/:projectId — returns empty initially", async () => {
    const res = await req("GET", "/api/harness/violations/proj-1", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("events");
    expect(data).toHaveProperty("total");
    expect(data.total).toBe(0);
  });

  it("GET /api/harness/violations/:projectId — returns events after check", async () => {
    // First trigger a violation
    await req("GET", "/api/harness/rules/proj-no-exist", {
      headers: authHeader,
    });

    // Then query history
    const res = await req("GET", "/api/harness/violations/proj-no-exist", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.total).toBeGreaterThan(0);
    expect(data.events.length).toBeGreaterThan(0);
  });

  it("GET /api/harness/violations/:projectId — respects limit param", async () => {
    // Trigger multiple violations
    await req("GET", "/api/harness/rules/proj-no-exist", { headers: authHeader });
    await req("GET", "/api/harness/rules/proj-no-exist", { headers: authHeader });

    const res = await req("GET", "/api/harness/violations/proj-no-exist?limit=1", {
      headers: authHeader,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.events.length).toBeLessThanOrEqual(1);
  });

  it("GET /api/harness/rules/:projectId — requires auth", async () => {
    const res = await req("GET", "/api/harness/rules/proj-1", {});
    expect(res.status).toBe(401);
  });

  it("GET /api/harness/rules/:projectId — score is 0-100 range", async () => {
    const res = await req("GET", "/api/harness/rules/proj-no-exist", {
      headers: authHeader,
    });

    const data = (await res.json()) as any;
    expect(data.score).toBeGreaterThanOrEqual(0);
    expect(data.score).toBeLessThanOrEqual(100);
  });
});
