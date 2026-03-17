import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { wikiRoute } from "../routes/wiki.js";

describe("wiki route instance", () => {
  it("wikiRoute is an OpenAPIHono instance", () => {
    expect(wikiRoute).toBeDefined();
    expect(typeof wikiRoute.request).toBe("function");
  });
});

describe("wiki CRUD (D1)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let authHeader: Record<string, string>;

  beforeAll(async () => {
    authHeader = await createAuthHeaders({ role: "member" });
  });

  beforeEach(() => {
    env = createTestEnv();
  });

  it("GET /api/wiki returns empty list initially", async () => {
    const res = await app.request("/api/wiki", { headers: authHeader }, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it("POST /api/wiki creates a page", async () => {
    const res = await app.request(
      "/api/wiki",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "docs/test.md", content: "# Test\n\nHello" }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.title).toBe("test");
    expect(data.content).toBe("# Test\n\nHello");
    expect(data.slug).toBeTruthy();
  });

  it("GET /api/wiki lists created pages", async () => {
    await app.request(
      "/api/wiki",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "docs/page1.md", content: "# Page 1" }),
      },
      env,
    );

    const res = await app.request("/api/wiki", { headers: authHeader }, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("page1");
  });

  it("GET /api/wiki/:slug returns page with content", async () => {
    const createRes = await app.request(
      "/api/wiki",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "docs/detail.md", content: "# Detail\n\nFull content" }),
      },
      env,
    );
    const created = (await createRes.json()) as any;

    const res = await app.request(`/api/wiki/${created.slug}`, { headers: authHeader }, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.content).toBe("# Detail\n\nFull content");
  });

  it("GET /api/wiki/:slug returns 404 for missing page", async () => {
    const res = await app.request("/api/wiki/nonexistent", { headers: authHeader }, env);
    expect(res.status).toBe(404);
  });

  it("PUT /api/wiki/:slug updates page content", async () => {
    const createRes = await app.request(
      "/api/wiki",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "docs/edit.md", content: "# Original" }),
      },
      env,
    );
    const created = (await createRes.json()) as any;

    const res = await app.request(
      `/api/wiki/${created.slug}`,
      {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# Updated" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.ok).toBe(true);
  });

  it("DELETE /api/wiki/:slug removes the page", async () => {
    const createRes = await app.request(
      "/api/wiki",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "docs/delete.md", content: "# To Delete" }),
      },
      env,
    );
    const created = (await createRes.json()) as any;

    const res = await app.request(
      `/api/wiki/${created.slug}`,
      { method: "DELETE", headers: authHeader },
      env,
    );
    expect(res.status).toBe(200);

    const getRes = await app.request(`/api/wiki/${created.slug}`, { headers: authHeader }, env);
    expect(getRes.status).toBe(404);
  });
});
