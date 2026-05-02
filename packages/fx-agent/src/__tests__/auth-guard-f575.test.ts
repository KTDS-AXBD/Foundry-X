// F575 TDD Red Phase — 7 routes auth guard (test/fx-agent): F575 red
import { describe, test, expect } from "vitest";
import app from "../app.js";
import { createMockEnv } from "./helpers/mock-d1.js";

describe("F575: Agent 잔여 7 routes auth guard", () => {
  const env = createMockEnv();

  test("GET /api/agents without auth → 401", async () => {
    const res = await app.request("/api/agents", {}, env);
    expect(res.status).toBe(401);
  });

  test("POST /api/agents/run/stream without auth → 401", async () => {
    const res = await app.request("/api/agents/run/stream", { method: "POST" }, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/skills/registry without auth → 401", async () => {
    const res = await app.request("/api/skills/registry", {}, env);
    expect(res.status).toBe(401);
  });

  test("POST /api/skills/metrics/record without auth → 401", async () => {
    const res = await app.request("/api/skills/metrics/record", { method: "POST" }, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/skills/captured/patterns without auth → 401", async () => {
    const res = await app.request("/api/skills/captured/patterns", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/skills/derived/patterns without auth → 401", async () => {
    const res = await app.request("/api/skills/derived/patterns", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/telemetry/counts without auth → 401", async () => {
    const res = await app.request("/api/telemetry/counts", {}, env);
    expect(res.status).toBe(401);
  });
});
