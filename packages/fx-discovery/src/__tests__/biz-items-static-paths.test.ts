/**
 * Hotfix: /biz-items/summary, /biz-items/portfolio-list, /biz-items/by-artifact
 *
 * 배경: F539c에서 fx-gateway가 `/api/biz-items/:id` 패턴을 DISCOVERY로 라우팅하면서,
 * 정적 경로 3개(summary/portfolio-list/by-artifact)가 `:id`에 매칭되어 fx-discovery로 유입되지만
 * fx-discovery에 핸들러가 없어 `/biz-items/:id` 핸들러가 id="summary" 등으로 오동작.
 *
 * 해법(옵션 B): 정적 경로 3개를 fx-discovery로 이전하여 F539c 의도와 정렬.
 */
import { describe, it, expect, vi } from "vitest";
import { sign } from "hono/jwt";
import app from "../app.js";
import type { DiscoveryEnv } from "../env.js";

const TEST_SECRET = "test-secret-biz-items-static";

async function makeAuthHeader(payload: Record<string, unknown> = {}) {
  const token = await sign(
    { sub: "user-1", orgId: "org-1", orgRole: "admin", exp: Math.floor(Date.now() / 1000) + 3600, ...payload },
    TEST_SECRET,
    "HS256",
  );
  return { Authorization: `Bearer ${token}` };
}

/**
 * tenantGuard가 통과하도록 org_members 테이블 + 대상 테이블을 SQL별로 분기해서 반환해요.
 */
function makeDb(
  handlers: {
    summaryRows?: Record<string, unknown>[];
    coverageRows?: Record<string, unknown>[];
    lookupRows?: Record<string, unknown>[];
  },
): D1Database {
  return {
    prepare: vi.fn((sql: string) => {
      const isOrgMember = sql.includes("org_members");
      const isSummaryQuery = sql.includes("pipeline_stages") && sql.includes("LEFT JOIN");
      const isCoverageQuery = sql.includes("biz_evaluations be") || sql.includes("has_evaluation");
      const isLookupQuery = sql.includes("INNER JOIN") && (sql.includes("business_plan_drafts") || sql.includes("offerings") || sql.includes("prototypes"));

      return {
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockImplementation(async () => {
            if (isSummaryQuery) return { results: handlers.summaryRows ?? [] };
            if (isCoverageQuery) return { results: handlers.coverageRows ?? [] };
            if (isLookupQuery) return { results: handlers.lookupRows ?? [] };
            return { results: [] };
          }),
          first: vi.fn().mockImplementation(async () => {
            if (isOrgMember) return { role: "admin" };
            return null;
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        first: vi.fn().mockImplementation(async () => {
          if (isOrgMember) return { role: "admin" };
          return null;
        }),
        run: vi.fn().mockResolvedValue({ success: true }),
      };
    }),
  } as unknown as D1Database;
}

const makeEnv = (db: D1Database): DiscoveryEnv => ({
  DB: db,
  JWT_SECRET: TEST_SECRET,
  ANTHROPIC_API_KEY: "test",
});

describe("biz-items 정적 경로 3개 (fx-discovery 이전)", () => {
  it("GET /api/biz-items/summary → 200 with items array (ToDo 요약)", async () => {
    const db = makeDb({
      summaryRows: [
        { biz_item_id: "item-1", title: "Item 1", stage: "DISCOVERY" },
        { biz_item_id: "item-2", title: "Item 2", stage: null },
      ],
    });
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items/summary", { headers }, makeEnv(db));
    expect(res.status).toBe(200);

    const body = await res.json() as { items: Array<{ bizItemId: string; title: string; currentStage: number }> };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toMatchObject({ bizItemId: "item-1", title: "Item 1", currentStage: 2 });
    expect(body.items[1]).toMatchObject({ bizItemId: "item-2", title: "Item 2", currentStage: 1 });
  });

  it("GET /api/biz-items/portfolio-list → 200 with coverage data", async () => {
    const db = makeDb({
      coverageRows: [
        {
          id: "item-1",
          title: "Item 1",
          status: "draft",
          created_at: "2026-04-15T00:00:00Z",
          current_stage: "DISCOVERY",
          has_evaluation: 1,
          prd_count: 0,
          offering_count: 0,
          prototype_count: 0,
          criteria_completed: 3,
          criteria_total: 9,
        },
      ],
    });
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items/portfolio-list", { headers }, makeEnv(db));
    expect(res.status).toBe(200);

    const body = await res.json() as { data: { items: unknown[]; total: number } };
    expect(body.data.total).toBe(1);
    expect(Array.isArray(body.data.items)).toBe(true);
  });

  it("GET /api/biz-items/by-artifact?type=prd&id=xxx → 200 with bizItems", async () => {
    const db = makeDb({
      lookupRows: [{ id: "item-1", title: "Item 1", status: "draft", current_stage: "DISCOVERY" }],
    });
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items/by-artifact?type=prd&id=plan-1", { headers }, makeEnv(db));
    expect(res.status).toBe(200);

    const body = await res.json() as { data: { artifactType: string; artifactId: string; bizItems: unknown[] } };
    expect(body.data.artifactType).toBe("prd");
    expect(body.data.artifactId).toBe("plan-1");
    expect(body.data.bizItems).toHaveLength(1);
  });

  it("GET /api/biz-items/by-artifact → 400 without type param", async () => {
    const db = makeDb({});
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items/by-artifact?id=plan-1", { headers }, makeEnv(db));
    expect(res.status).toBe(400);
  });

  it("GET /api/biz-items/by-artifact → 400 without id param", async () => {
    const db = makeDb({});
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items/by-artifact?type=prd", { headers }, makeEnv(db));
    expect(res.status).toBe(400);
  });

  it("정적 경로는 /:id 패턴보다 먼저 매칭되어야 함 — summary가 id='summary'로 해석되지 않음", async () => {
    // summary 쿼리가 호출되면 통과, :id가 먼저 매칭되면 다른 쿼리가 호출됨
    const db = makeDb({ summaryRows: [] });
    const headers = await makeAuthHeader();

    const res = await app.request("/api/biz-items/summary", { headers }, makeEnv(db));
    expect(res.status).toBe(200); // :id가 먼저 잡히면 404가 뜰 것
    const body = await res.json() as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });
});
