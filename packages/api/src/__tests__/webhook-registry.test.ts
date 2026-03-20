import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { WebhookRegistryService } from "../services/webhook-registry.js";

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

function createSprint24Tables() {
  (env.DB as any).db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL,
      event_types TEXT NOT NULL,
      target_url TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'inbound',
      secret TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      config TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      org_id TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      response_code INTEGER,
      response_body TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      next_retry_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `);
}

beforeEach(() => {
  env = createTestEnv();
  createSprint24Tables();
  seedDb(
    "INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test User', 'admin', datetime('now'), datetime('now'))"
  );
  seedDb(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')"
  );
});

describe("WebhookRegistryService", () => {
  it("registers and lists webhooks", async () => {
    const service = new WebhookRegistryService(env.DB as unknown as D1Database);
    const webhook = await service.register("org_test", {
      provider: "github",
      event_types: ["push", "pull_request"],
      target_url: "https://example.com/hook",
      direction: "inbound",
    });
    expect(webhook.id).toBeTruthy();
    expect(webhook.provider).toBe("github");
    expect(webhook.event_types).toEqual(["push", "pull_request"]);

    const list = await service.list("org_test");
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(webhook.id);
  });

  it("deletes a webhook", async () => {
    const service = new WebhookRegistryService(env.DB as unknown as D1Database);
    const webhook = await service.register("org_test", {
      provider: "jira",
      event_types: ["issue.created"],
      target_url: "https://example.com/jira",
    });
    const deleted = await service.delete("org_test", webhook.id);
    expect(deleted).toBe(true);

    const list = await service.list("org_test");
    expect(list).toHaveLength(0);
  });

  it("returns false when deleting non-existent webhook", async () => {
    const service = new WebhookRegistryService(env.DB as unknown as D1Database);
    const deleted = await service.delete("org_test", "nonexistent");
    expect(deleted).toBe(false);
  });

  it("handles inbound webhook with no matching provider", async () => {
    const service = new WebhookRegistryService(env.DB as unknown as D1Database);
    const result = await service.handleInbound("unknown", new Headers(), "{}");
    expect(result.processed).toBe(false);
  });
});

describe("Webhook Registry Routes", () => {
  it("POST /api/orgs/:orgId/webhooks — creates webhook", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const res = await req("POST", "/api/orgs/org_test/webhooks", {
      headers,
      body: {
        provider: "custom",
        event_types: ["deploy"],
        target_url: "https://example.com/deploy",
        direction: "outbound",
      },
    });
    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.provider).toBe("custom");
    expect(data.direction).toBe("outbound");
  });

  it("GET /api/orgs/:orgId/webhooks — lists webhooks", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    // Create one first
    await req("POST", "/api/orgs/org_test/webhooks", {
      headers,
      body: {
        provider: "github",
        event_types: ["push"],
        target_url: "https://example.com/gh",
      },
    });

    const res = await req("GET", "/api/orgs/org_test/webhooks", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.webhooks.length).toBeGreaterThanOrEqual(1);
  });

  it("DELETE /api/orgs/:orgId/webhooks/:id — deletes webhook", async () => {
    const headers = await createAuthHeaders({ orgId: "org_test", orgRole: "owner" });
    const createRes = await req("POST", "/api/orgs/org_test/webhooks", {
      headers,
      body: {
        provider: "slack",
        event_types: ["message"],
        target_url: "https://example.com/slack",
      },
    });
    const created = await createRes.json() as any;

    const res = await req("DELETE", `/api/orgs/org_test/webhooks/${created.id}`, { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);
  });

  it("POST /api/orgs/:orgId/webhooks — requires admin role", async () => {
    // Use a different user that is a member (not owner/admin) in D1
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('member-user', 'member@example.com', 'Member', 'member', datetime('now'), datetime('now'))");
    seedDb("INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'member-user', 'member')");
    const headers = await createAuthHeaders({ sub: "member-user", email: "member@example.com", role: "member", orgId: "org_test", orgRole: "member" });
    const res = await req("POST", "/api/orgs/org_test/webhooks", {
      headers,
      body: {
        provider: "custom",
        event_types: ["test"],
        target_url: "https://example.com/test",
      },
    });
    expect(res.status).toBe(403);
  });
});
