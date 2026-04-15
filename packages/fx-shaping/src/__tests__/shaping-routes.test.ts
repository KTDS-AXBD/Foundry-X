// F540 TDD Red — fx-shaping route authentication
import { describe, it, expect } from "vitest";
import app from "../app.js";

const mockEnv = {
  DB: {} as D1Database,
  JWT_SECRET: "test-secret",
  ANTHROPIC_API_KEY: undefined,
  CACHE: {
    get: async () => null,
    put: async () => undefined,
  } as unknown as KVNamespace,
  FILES_BUCKET: {} as R2Bucket,
  MARKER_PROJECT_ID: undefined,
};

describe("fx-shaping routes require auth (F540)", () => {
  it("POST /api/shaping/runs without auth → 401", async () => {
    const req = new Request("http://localhost/api/shaping/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bizItemId: "test" }),
    });
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });

  it("POST /api/ax-bd/bmc without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/bmc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });

  it("GET /api/ax-bd/persona-evals/test-item without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/persona-evals/test-item");
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });
});
