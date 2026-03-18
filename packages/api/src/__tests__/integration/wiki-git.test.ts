import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { app } from "../../app.js";
import { createTestEnv, createAuthHeaders } from "../helpers/test-app.js";

describe("integration: wiki page creation → D1 verification", () => {
  let env: ReturnType<typeof createTestEnv>;
  let authHeader: Record<string, string>;

  beforeAll(async () => {
    authHeader = await createAuthHeaders({ role: "member" });
  });

  beforeEach(() => {
    env = createTestEnv();
  });

  it("create wiki page → verify slug exists via GET", async () => {
    // Create a wiki page
    const createRes = await app.request(
      "/api/wiki",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "docs/integration-test.md", content: "# Integration\n\nTest content" }),
      },
      env,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as any;

    // Verify via GET
    const getRes = await app.request(`/api/wiki/${created.slug}`, { headers: authHeader }, env);
    expect(getRes.status).toBe(200);
    const page = (await getRes.json()) as any;
    expect(page.content).toBe("# Integration\n\nTest content");
  });

  it("create wiki page → update → verify content changed", async () => {
    const createRes = await app.request(
      "/api/wiki",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "docs/update-test.md", content: "# Original" }),
      },
      env,
    );
    const created = (await createRes.json()) as any;

    await app.request(
      `/api/wiki/${created.slug}`,
      {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# Updated Content" }),
      },
      env,
    );

    const getRes = await app.request(`/api/wiki/${created.slug}`, { headers: authHeader }, env);
    expect(getRes.status).toBe(200);
    const page = (await getRes.json()) as any;
    expect(page.content).toBe("# Updated Content");
  });

  it("create wiki page → delete → verify 404", async () => {
    const createRes = await app.request(
      "/api/wiki",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: "docs/delete-test.md", content: "# To Delete" }),
      },
      env,
    );
    const created = (await createRes.json()) as any;

    await app.request(`/api/wiki/${created.slug}`, { method: "DELETE", headers: authHeader }, env);

    const getRes = await app.request(`/api/wiki/${created.slug}`, { headers: authHeader }, env);
    expect(getRes.status).toBe(404);
  });
});
