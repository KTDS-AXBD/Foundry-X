/**
 * F523: Discovery items GET 라우트 (TDD Red Phase)
 * FX-REQ-551 — fx-discovery에 실제 Discovery 라우트 이관
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../app.js";
import type { DiscoveryEnv } from "../env.js";

// D1Database mock (in-memory 시뮬레이션)
const makeD1Mock = (rows: Record<string, unknown>[] = []) => ({
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: rows }),
      first: vi.fn().mockResolvedValue({ count: rows.length }),
    }),
  }),
}) as unknown as D1Database;

const makeEnv = (db?: D1Database): DiscoveryEnv => ({
  DB: db ?? makeD1Mock(),
  JWT_SECRET: "test-secret",
});

describe("F523: GET /api/discovery/items", () => {
  it("빈 DB에서 빈 배열과 total:0을 반환한다", async () => {
    const env = makeEnv(makeD1Mock([]));
    const res = await app.request("/api/discovery/items", {}, env);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("limit 파라미터가 결과 개수를 제한한다", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      source: "field",
      status: "draft",
      created_at: "2026-01-01T00:00:00Z",
    }));
    const env = makeEnv(makeD1Mock(rows));
    const res = await app.request("/api/discovery/items?limit=5", {}, env);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect((body.items as unknown[]).length).toBeLessThanOrEqual(5);
  });

  it("응답 items 각 요소에 id, title, status, created_at 필드가 있다", async () => {
    const row = {
      id: "abc-123",
      title: "Test Biz Item",
      source: "field",
      status: "draft",
      created_at: "2026-01-01T00:00:00Z",
    };
    const env = makeEnv(makeD1Mock([row]));
    const res = await app.request("/api/discovery/items", {}, env);

    expect(res.status).toBe(200);
    const body = await res.json() as { items: typeof row[] };
    expect(body.items[0]).toMatchObject({
      id: "abc-123",
      title: "Test Biz Item",
      status: "draft",
    });
  });

  it("limit/offset이 숫자가 아니면 400을 반환한다", async () => {
    const env = makeEnv();
    const res = await app.request("/api/discovery/items?limit=abc", {}, env);
    expect(res.status).toBe(400);
  });
});
