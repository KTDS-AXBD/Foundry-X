/**
 * F539c Group B: discovery-pipeline GET 2 라우트 TDD Red Phase
 * FX-REQ-578 — GET /api/discovery-pipeline/runs, GET /api/discovery-pipeline/runs/:id
 */
import { describe, it, expect, vi } from "vitest";
import { sign } from "hono/jwt";
import app from "../app.js";
import type { DiscoveryEnv } from "../env.js";

const TEST_SECRET = "test-secret-f539c";

async function makeAuthHeader() {
  const token = await sign(
    { sub: "user-1", orgId: "org-1", orgRole: "admin", exp: Math.floor(Date.now() / 1000) + 3600 },
    TEST_SECRET,
    "HS256",
  );
  return { Authorization: `Bearer ${token}` };
}

const makeDb = (runRows: Record<string, unknown>[] = []) =>
  ({
    prepare: vi.fn((sql: string) => {
      const isOrgMember = sql.includes("org_members");
      const isCount = sql.includes("COUNT(*)");
      return {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: runRows }),
          first: vi.fn().mockResolvedValue(
            isOrgMember ? { role: "admin" } : isCount ? { total: runRows.length } : (runRows[0] ?? null),
          ),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        all: vi.fn().mockResolvedValue({ results: runRows }),
        first: vi.fn().mockResolvedValue(
          isOrgMember ? { role: "admin" } : isCount ? { total: runRows.length } : (runRows[0] ?? null),
        ),
        run: vi.fn().mockResolvedValue({ success: true }),
      };
    }),
  }) as unknown as D1Database;

const makeEnv = (db?: D1Database): DiscoveryEnv => ({
  DB: db ?? makeDb(),
  JWT_SECRET: TEST_SECRET,
  ANTHROPIC_API_KEY: "test-api-key",
});

describe("F539c Group B: discovery-pipeline GET 2 라우트", () => {
  it("GET /api/discovery-pipeline/runs → 200 with items/total", async () => {
    const headers = await makeAuthHeader();
    const res = await app.request("/api/discovery-pipeline/runs", { headers }, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; total: number };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  it("GET /api/discovery-pipeline/runs/:id → 404 for missing run", async () => {
    const headers = await makeAuthHeader();
    const res = await app.request("/api/discovery-pipeline/runs/nonexistent", { headers }, makeEnv());
    expect(res.status).toBe(404);
  });

  it("GET /api/discovery-pipeline/runs → 400 with invalid query", async () => {
    const headers = await makeAuthHeader();
    const res = await app.request("/api/discovery-pipeline/runs?limit=abc", { headers }, makeEnv());
    expect(res.status).toBe(400);
  });
});
