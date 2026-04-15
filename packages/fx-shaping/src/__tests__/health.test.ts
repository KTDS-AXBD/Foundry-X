// F540 TDD Red — fx-shaping health endpoint
import { describe, it, expect } from "vitest";
import app from "../app.js";

const mockEnv = {
  DB: {} as D1Database,
  JWT_SECRET: "test-secret",
  ANTHROPIC_API_KEY: undefined,
  CACHE: {} as KVNamespace,
  FILES_BUCKET: {} as R2Bucket,
  MARKER_PROJECT_ID: undefined,
};

describe("fx-shaping health (F540)", () => {
  it("GET /api/shaping/health returns domain=shaping", async () => {
    const req = new Request("http://localhost/api/shaping/health");
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    const body = await res.json() as { domain: string; status: string };
    expect(body.domain).toBe("shaping");
    expect(body.status).toBe("ok");
  });
});
