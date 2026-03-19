import { describe, it, expect, vi, beforeEach } from "vitest";
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

function seedDb(sql: string, ...params: unknown[]) {
  if (params.length) {
    (env.DB as any).prepare(sql).bind(...params).run();
  } else {
    (env.DB as any).prepare(sql).run();
  }
}

function execDb(sql: string) {
  (env.DB as any).exec(sql);
}

beforeEach(() => {
  env = createTestEnv();
  // Seed test user + org
  seedDb(
    "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))",
  );
  seedDb(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')",
  );
  // Create slack_notification_configs table (not in mock-d1 base schema yet)
  execDb(`
    CREATE TABLE IF NOT EXISTS slack_notification_configs (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('agent', 'pr', 'plan', 'queue', 'message')),
      webhook_url TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(org_id, category)
    )
  `);
});

describe("GET /api/orgs/:orgId/slack/configs", () => {
  it("returns empty list initially", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("GET", "/api/orgs/org_test/slack/configs", { headers });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.configs).toEqual([]);
  });
});

describe("PUT /api/orgs/:orgId/slack/configs/:category", () => {
  it("creates config for valid category", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "admin" });
    const res = await req("PUT", "/api/orgs/org_test/slack/configs/agent", {
      headers,
      body: {
        webhook_url: "https://hooks.slack.com/services/T00/B00/agent",
        enabled: true,
      },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.category).toBe("agent");
    expect(data.webhook_url).toBe("https://hooks.slack.com/services/T00/B00/agent");
    expect(data.enabled).toBe(true);
    expect(data.id).toBeTruthy();
  });

  it("updates existing config (upsert)", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    // Create first
    await req("PUT", "/api/orgs/org_test/slack/configs/pr", {
      headers,
      body: {
        webhook_url: "https://hooks.slack.com/services/T00/B00/pr-v1",
        enabled: true,
      },
    });
    // Update
    const res = await req("PUT", "/api/orgs/org_test/slack/configs/pr", {
      headers,
      body: {
        webhook_url: "https://hooks.slack.com/services/T00/B00/pr-v2",
        enabled: false,
      },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.webhook_url).toBe("https://hooks.slack.com/services/T00/B00/pr-v2");
    expect(data.enabled).toBe(false);
  });

  it("returns 400 for invalid category", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "admin" });
    const res = await req("PUT", "/api/orgs/org_test/slack/configs/invalid_cat", {
      headers,
      body: {
        webhook_url: "https://hooks.slack.com/services/T00/B00/xxx",
        enabled: true,
      },
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain("Invalid category");
  });

  it("returns 400 for invalid webhook_url", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "admin" });
    const res = await req("PUT", "/api/orgs/org_test/slack/configs/agent", {
      headers,
      body: {
        webhook_url: "https://example.com/not-slack",
        enabled: true,
      },
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain("hooks.slack.com");
  });
});

describe("DELETE /api/orgs/:orgId/slack/configs/:category", () => {
  it("deletes existing config", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    // Create first
    await req("PUT", "/api/orgs/org_test/slack/configs/plan", {
      headers,
      body: {
        webhook_url: "https://hooks.slack.com/services/T00/B00/plan",
        enabled: true,
      },
    });
    // Delete
    const res = await req("DELETE", "/api/orgs/org_test/slack/configs/plan", { headers });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.deleted).toBe(true);

    // Verify gone
    const listRes = await req("GET", "/api/orgs/org_test/slack/configs", { headers });
    const listData = (await listRes.json()) as any;
    expect(listData.configs).toEqual([]);
  });
});

describe("POST /api/orgs/:orgId/slack/test", () => {
  it("sends test message when webhook configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "admin" });
    // Set up a config first
    await req("PUT", "/api/orgs/org_test/slack/configs/agent", {
      headers,
      body: {
        webhook_url: "https://hooks.slack.com/services/T00/B00/test-agent",
        enabled: true,
      },
    });

    // Reset fetch mock after PUT might have triggered a fetch for app.request
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({ ok: true });

    const res = await req("POST", "/api/orgs/org_test/slack/test", {
      headers,
      body: { category: "agent" },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.sent).toBe(true);
  });
});

describe("Slack Config — Role Guard & Edge Cases", () => {
  it("member는 config 생성 불가 → 403", async () => {
    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('member-user', 'member@example.com', 'Member', 'member', datetime('now'), datetime('now'))",
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')",
    );
    const memberHeaders = await createAuthHeaders({ sub: "member-user", email: "member@example.com", orgId: "org_test", orgRole: "member" });

    const res = await req("PUT", "/api/orgs/org_test/slack/configs/agent", {
      headers: memberHeaders,
      body: {
        webhook_url: "https://hooks.slack.com/services/T00/B00/member-test",
        enabled: true,
      },
    });
    expect(res.status).toBe(403);
  });

  it("member는 config 삭제 불가 → 403", async () => {
    // Create a config as owner first
    const ownerHeaders = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    await req("PUT", "/api/orgs/org_test/slack/configs/agent", {
      headers: ownerHeaders,
      body: {
        webhook_url: "https://hooks.slack.com/services/T00/B00/del-test",
        enabled: true,
      },
    });

    seedDb(
      "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('member-user', 'member@example.com', 'Member', 'member', datetime('now'), datetime('now'))",
    );
    seedDb(
      "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')",
    );
    const memberHeaders = await createAuthHeaders({ sub: "member-user", email: "member@example.com", orgId: "org_test", orgRole: "member" });

    const res = await req("DELETE", "/api/orgs/org_test/slack/configs/agent", { headers: memberHeaders });
    expect(res.status).toBe(403);
  });

  it("5개 카테고리 전부 생성 후 list 검증", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "admin" });
    const categories = ["agent", "pr", "plan", "queue", "message"];

    for (const cat of categories) {
      const res = await req("PUT", `/api/orgs/org_test/slack/configs/${cat}`, {
        headers,
        body: {
          webhook_url: `https://hooks.slack.com/services/T00/B00/${cat}`,
          enabled: true,
        },
      });
      expect(res.status).toBe(200);
    }

    const listRes = await req("GET", "/api/orgs/org_test/slack/configs", { headers });
    expect(listRes.status).toBe(200);
    const data = (await listRes.json()) as any;
    expect(data.configs.length).toBe(5);
  });

  it("존재하지 않는 config 삭제 → 404", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });

    const res = await req("DELETE", "/api/orgs/org_test/slack/configs/agent", { headers });
    expect(res.status).toBe(404);
  });
});
