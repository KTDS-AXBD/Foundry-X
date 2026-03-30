import { describe, it, expect, beforeEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createMockD1 } from "./helpers/mock-d1.js";
import { expansionPackRoute } from "../routes/expansion-pack.js";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS expansion_packs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    domain TEXT NOT NULL DEFAULT 'custom' CHECK(domain IN ('security', 'data', 'devops', 'testing', 'custom')),
    version TEXT NOT NULL DEFAULT '1.0.0',
    manifest TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    author TEXT NOT NULL,
    install_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_expansion_packs_status ON expansion_packs(status, domain);

  CREATE TABLE IF NOT EXISTS pack_installations (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    installed_by TEXT NOT NULL,
    installed_at TEXT NOT NULL DEFAULT (datetime('now')),
    config TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (pack_id) REFERENCES expansion_packs(id),
    UNIQUE(pack_id, org_id)
  );
  CREATE INDEX IF NOT EXISTS idx_pack_installations_org ON pack_installations(org_id);
`;

function createApp(db: D1Database) {
  const app = new OpenAPIHono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("userId" as never, "test-user");
    await next();
  });
  app.route("/api", expansionPackRoute);

  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("Expansion Pack Routes", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  it("POST /api/expansion-packs: creates pack", async () => {
    const res = await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Security Pack", domain: "security" }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.id).toMatch(/^pack-/);
    expect(data.name).toBe("Security Pack");
    expect(data.domain).toBe("security");
    expect(data.author).toBe("test-user");
  });

  it("GET /api/expansion-packs: lists packs", async () => {
    await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Pack A" }),
    });

    const res = await app.request("/api/expansion-packs");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
  });

  it("GET /api/expansion-packs: filters by domain", async () => {
    await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Sec", domain: "security" }),
    });
    await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Data", domain: "data" }),
    });

    const res = await app.request("/api/expansion-packs?domain=security");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Sec");
  });

  it("GET /api/expansion-packs/installations: lists installations", async () => {
    const createRes = await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Pack" }),
    });
    const { id } = (await createRes.json()) as any;

    await app.request(`/api/expansion-packs/${id}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await app.request("/api/expansion-packs/installations");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
  });

  it("GET /api/expansion-packs/:id: returns pack", async () => {
    const createRes = await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/expansion-packs/${id}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe(id);
  });

  it("GET /api/expansion-packs/:id: 404 for unknown", async () => {
    const res = await app.request("/api/expansion-packs/nonexistent");
    expect(res.status).toBe(404);
  });

  it("PUT /api/expansion-packs/:id: updates pack", async () => {
    const createRes = await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Original" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/expansion-packs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.name).toBe("Updated");
  });

  it("PATCH /api/expansion-packs/:id/publish: publishes pack", async () => {
    const createRes = await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Pack" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/expansion-packs/${id}/publish`, {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe("published");
  });

  it("POST /api/expansion-packs/:id/install: installs pack", async () => {
    const createRes = await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Pack" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/expansion-packs/${id}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: { env: "prod" } }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.id).toMatch(/^inst-/);
    expect(data.packId).toBe(id);
    expect(data.config).toEqual({ env: "prod" });
  });

  it("DELETE /api/expansion-packs/installations/:installId: uninstalls", async () => {
    const createRes = await app.request("/api/expansion-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Pack" }),
    });
    const { id: packId } = (await createRes.json()) as any;

    const installRes = await app.request(`/api/expansion-packs/${packId}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const { id: installId } = (await installRes.json()) as any;

    const res = await app.request(`/api/expansion-packs/installations/${installId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
  });
});
