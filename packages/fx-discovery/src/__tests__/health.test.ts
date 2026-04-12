/**
 * F518: Discovery Worker stub tests (TDD Red Phase)
 * FX-REQ-546 — fx-discovery Worker 경계 선언
 */
import { describe, it, expect } from "vitest";
import app from "../app.js";
import type { DiscoveryEnv } from "../env.js";

const makeEnv = (): DiscoveryEnv => ({
  DB: {} as D1Database,
  JWT_SECRET: "test-secret",
});

describe("F518: Discovery Worker", () => {
  it("returns 200 on GET /api/discovery/health", async () => {
    const res = await app.request("/api/discovery/health", {}, makeEnv());
    expect(res.status).toBe(200);
  });

  it("returns discovery domain info in health response", async () => {
    const res = await app.request("/api/discovery/health", {}, makeEnv());
    const body = await res.json() as Record<string, unknown>;
    expect(body.domain).toBe("discovery");
    expect(body.status).toBe("ok");
  });
});
