// F571 TDD Red Phase — 8 routes auth guard (test/fx-agent): F571 red
import { describe, test, expect } from "vitest";
import app from "../app.js";
import { createMockEnv } from "./helpers/mock-d1.js";

describe("F571: Agent Walking Skeleton 8 routes auth guard", () => {
  const env = createMockEnv();

  test("GET /api/agent-adapters without auth → 401", async () => {
    const res = await app.request("/api/agent-adapters", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/agent-definitions/schema without auth → 401", async () => {
    const res = await app.request("/api/agent-definitions/schema", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/command-registry/namespaces without auth → 401", async () => {
    const res = await app.request("/api/command-registry/namespaces", {}, env);
    expect(res.status).toBe(401);
  });

  test("POST /api/context-passthroughs without auth → 401", async () => {
    const res = await app.request("/api/context-passthroughs", { method: "POST" }, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/execution-events without auth → 401", async () => {
    const res = await app.request("/api/execution-events", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/meta/proposals without auth → 401", async () => {
    const res = await app.request("/api/meta/proposals", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/task-states without auth → 401", async () => {
    const res = await app.request("/api/task-states", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/orgs/:orgId/workflows without auth → 401", async () => {
    const res = await app.request("/api/orgs/test-org/workflows", {}, env);
    expect(res.status).toBe(401);
  });
});
