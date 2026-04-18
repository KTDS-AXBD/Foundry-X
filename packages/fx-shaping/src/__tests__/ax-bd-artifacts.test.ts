// F560 TDD Red — ax-bd-artifacts routes in fx-shaping
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

describe("ax-bd-artifacts routes (F560)", () => {
  it("GET /api/ax-bd/artifacts without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/artifacts");
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });

  it("GET /api/ax-bd/artifacts/:id without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/artifacts/art-001");
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });

  it("GET /api/ax-bd/biz-items/:bizItemId/artifacts without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/biz-items/biz-001/artifacts");
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });

  it("GET /api/ax-bd/artifacts/:bizItemId/:skillId/versions without auth → 401", async () => {
    const req = new Request("http://localhost/api/ax-bd/artifacts/biz-001/skill-001/versions");
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });
});
