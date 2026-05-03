/**
 * F539c Group B: discovery-stages 2 라우트 TDD Red Phase
 * FX-REQ-578 — GET /api/biz-items/:id/discovery-progress, POST /api/biz-items/:id/discovery-stage
 * F582: DiagnosticCollector record() 호출 + autoTriggerMetaAgent 연동 TDD Red
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sign } from "hono/jwt";
import app from "../app.js";
import type { DiscoveryEnv } from "../env.js";
import { DiagnosticCollector } from "../services/diagnostic-collector.js";

vi.mock("../services/diagnostic-collector.js", () => ({
  DiagnosticCollector: vi.fn(),
}));

const TEST_SECRET = "test-secret-f539c";

async function makeAuthHeader() {
  const token = await sign(
    { sub: "user-1", orgId: "org-1", orgRole: "admin", exp: Math.floor(Date.now() / 1000) + 3600 },
    TEST_SECRET,
    "HS256",
  );
  return { Authorization: `Bearer ${token}` };
}

const makeDb = (stageRows: Record<string, unknown>[] = []) =>
  ({
    prepare: vi.fn((sql: string) => {
      const isOrgMember = sql.includes("org_members");
      return {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: stageRows }),
          first: vi.fn().mockResolvedValue(isOrgMember ? { role: "admin" } : (stageRows[0] ?? null)),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        all: vi.fn().mockResolvedValue({ results: stageRows }),
        first: vi.fn().mockResolvedValue(isOrgMember ? { role: "admin" } : (stageRows[0] ?? null)),
        run: vi.fn().mockResolvedValue({ success: true }),
      };
    }),
  }) as unknown as D1Database;

let mockRecord: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockRecord = vi.fn().mockResolvedValue(undefined);
  vi.mocked(DiagnosticCollector).mockImplementation(() => ({ record: mockRecord }) as unknown as DiagnosticCollector);
});

const makeEnv = (db?: D1Database): DiscoveryEnv => ({
  DB: db ?? makeDb(),
  JWT_SECRET: TEST_SECRET,
  ANTHROPIC_API_KEY: "test-api-key",
});

describe("F539c Group B: discovery-stages 2 라우트", () => {
  it("GET /api/biz-items/:id/discovery-progress → 200", async () => {
    const headers = await makeAuthHeader();
    const res = await app.request("/api/biz-items/item-001/discovery-progress", { headers }, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json() as { stages: unknown[]; completedCount: number; totalCount: number };
    expect(Array.isArray(body.stages)).toBe(true);
    expect(typeof body.completedCount).toBe("number");
  });

  it("POST /api/biz-items/:id/discovery-stage → 200 or 400", async () => {
    const headers = await makeAuthHeader();
    const res = await app.request("/api/biz-items/item-001/discovery-stage", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "2-1", status: "in_progress" }),
    }, makeEnv());
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/biz-items/:id/discovery-stage → 400 with invalid body", async () => {
    const headers = await makeAuthHeader();
    const res = await app.request("/api/biz-items/item-001/discovery-stage", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }, makeEnv());
    expect(res.status).toBe(400);
  });
});

// F582: DiagnosticCollector 호출 검증 (TDD Red)
describe("F582: DiagnosticCollector 배선 — discovery-stage update", () => {
  it("POST status=completed → DiagnosticCollector.record 1회 호출", async () => {
    const headers = await makeAuthHeader();
    const res = await app.request("/api/biz-items/item-001/discovery-stage", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "2-1", status: "completed" }),
    }, makeEnv());
    expect([200, 400]).toContain(res.status);
    expect(mockRecord).toHaveBeenCalledOnce();
    // sessionId 패턴: "stage-{stage}-{bizItemId}"
    expect(mockRecord.mock.calls[0]?.[0]).toBe("stage-2-1-item-001");
    expect(mockRecord.mock.calls[0]?.[1]).toBe("discovery-stage-runner");
  });

  it("POST status=in_progress → DiagnosticCollector.record 1회 호출", async () => {
    const headers = await makeAuthHeader();
    const res = await app.request("/api/biz-items/item-001/discovery-stage", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "2-2", status: "in_progress" }),
    }, makeEnv());
    expect([200, 400]).toContain(res.status);
    expect(mockRecord).toHaveBeenCalledOnce();
    expect(mockRecord.mock.calls[0]?.[0]).toBe("stage-2-2-item-001");
  });
});
