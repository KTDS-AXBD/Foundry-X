import { describe, it, expect, beforeEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createMockD1 } from "./helpers/mock-d1.js";
import { specLibraryRoute } from "../core/spec/routes/spec-library.js";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS spec_library (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('feature', 'api', 'component', 'integration', 'other')),
    tags TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'deprecated')),
    author TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_spec_library_org ON spec_library(org_id, category, status);
  CREATE INDEX IF NOT EXISTS idx_spec_library_search ON spec_library(org_id, title);
`;

function createApp(db: D1Database) {
  const app = new OpenAPIHono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("userId" as never, "test-user");
    await next();
  });
  app.route("/api", specLibraryRoute);

  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("Spec Library Routes", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  it("POST /api/spec-library: creates spec", async () => {
    const res = await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Auth Spec", content: "JWT flow description" }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.id).toMatch(/^spec-/);
    expect(data.title).toBe("Auth Spec");
    expect(data.author).toBe("test-user");
  });

  it("GET /api/spec-library: lists specs", async () => {
    await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Spec A", content: "A" }),
    });

    const res = await app.request("/api/spec-library");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
  });

  it("GET /api/spec-library: filters by category", async () => {
    await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Feature", content: "F", category: "feature" }),
    });
    await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "API", content: "A", category: "api" }),
    });

    const res = await app.request("/api/spec-library?category=feature");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Feature");
  });

  it("GET /api/spec-library/search: searches specs", async () => {
    await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Auth Flow", content: "JWT tokens" }),
    });
    await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "UI", content: "React" }),
    });

    const res = await app.request("/api/spec-library/search?q=auth");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Auth Flow");
  });

  it("GET /api/spec-library/categories: lists categories", async () => {
    await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "F", content: "F", category: "feature" }),
    });
    await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "A", content: "A", category: "api" }),
    });

    const res = await app.request("/api/spec-library/categories");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data.sort()).toEqual(["api", "feature"]);
  });

  it("GET /api/spec-library/:id: returns spec", async () => {
    const createRes = await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", content: "Body" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/spec-library/${id}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe(id);
  });

  it("GET /api/spec-library/:id: 404 for unknown", async () => {
    const res = await app.request("/api/spec-library/nonexistent");
    expect(res.status).toBe(404);
  });

  it("PUT /api/spec-library/:id: updates spec", async () => {
    const createRes = await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Original", content: "Body" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/spec-library/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.title).toBe("Updated");
  });

  it("DELETE /api/spec-library/:id: deletes spec", async () => {
    const createRes = await app.request("/api/spec-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "To delete", content: "Body" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/spec-library/${id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);

    const getRes = await app.request(`/api/spec-library/${id}`);
    expect(getRes.status).toBe(404);
  });
});
