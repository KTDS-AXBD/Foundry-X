import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  };
  if (opts?.body) init.body = JSON.stringify(opts.body);
  return app.request(url, init, env);
}

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

beforeEach(() => {
  env = createTestEnv();
  seedDb(
    "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))"
  );
  seedDb(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')"
  );
  // Seed a project
  seedDb(
    "INSERT OR IGNORE INTO projects (id, name, repo_url, owner_id, org_id, created_at) VALUES ('proj-1', 'Foundry-X', 'https://github.com/KTDS-AXBD/Foundry-X', 'test-user', 'org_test', datetime('now'))"
  );
});

describe("GET /api/orgs/:orgId/projects/overview", () => {
  it("returns overview with project list", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("GET", "/api/orgs/org_test/projects/overview", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.totalProjects).toBe(1);
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].name).toBe("Foundry-X");
    expect(data.agentActivity).toBeDefined();
    expect(data.agentActivity.last24h).toBeDefined();
  });

  it("returns empty overview for org with no projects", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    // Remove the seeded project
    seedDb("DELETE FROM projects WHERE org_id = 'org_test'");
    const res = await req("GET", "/api/orgs/org_test/projects/overview", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.totalProjects).toBe(0);
    expect(data.overallHealth).toBe(0);
  });
});

describe("GET /api/orgs/:orgId/projects/health", () => {
  it("returns health scores per project", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("GET", "/api/orgs/org_test/projects/health", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any[];
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Foundry-X");
    expect(data[0].grade).toBeDefined();
    expect(data[0].overallScore).toBeGreaterThan(0);
  });
});

describe("GET /api/orgs/:orgId/projects/activity", () => {
  it("returns activity summary", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("GET", "/api/orgs/org_test/projects/activity", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.last24h).toBeDefined();
    expect(data.last7d).toBeDefined();
    expect(data.last24h.tasksCompleted).toBeDefined();
  });
});
