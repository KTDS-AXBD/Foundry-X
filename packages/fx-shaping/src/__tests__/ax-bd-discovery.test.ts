// F560 TDD Red — ax-bd-discovery routes in fx-shaping
import { describe, it, expect } from "vitest";
import app from "../app.js";

const mockEnv = {
  DB: {} as D1Database,
  JWT_SECRET: "test-secret",
  ANTHROPIC_API_KEY: undefined,
  CACHE: { get: async () => null, put: async () => undefined } as unknown as KVNamespace,
  FILES_BUCKET: {} as R2Bucket,
  MARKER_PROJECT_ID: undefined,
};

describe("ax-bd-discovery routes (F560)", () => {
  it("POST /api/ax-bd/discovery/ingest without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/discovery/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: "v1", source: {}, data: [] }),
    });
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });

  it("GET /api/ax-bd/discovery/status without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/discovery/status");
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });

  it("POST /api/ax-bd/discovery/sync without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/discovery/sync", {
      method: "POST",
    });
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });
});
