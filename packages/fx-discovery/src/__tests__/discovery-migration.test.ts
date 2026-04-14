/**
 * F538: Discovery 완전 분리 — 마이그레이션 검증 (TDD Red Phase)
 * FX-REQ-575 — core/discovery/* 전체가 fx-discovery에 이전됨을 검증
 */
import { describe, it, expect, vi } from "vitest";
import app from "../app.js";
import type { DiscoveryEnv } from "../env.js";

const makeD1Mock = (rows: Record<string, unknown>[] = []) =>
  ({
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: rows }),
        first: vi.fn().mockResolvedValue(rows[0] ?? null),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
      all: vi.fn().mockResolvedValue({ results: rows }),
      first: vi.fn().mockResolvedValue(rows[0] ?? null),
      run: vi.fn().mockResolvedValue({ success: true }),
    }),
  }) as unknown as D1Database;

const makeEnv = (db?: D1Database): DiscoveryEnv => ({
  DB: db ?? makeD1Mock(),
  JWT_SECRET: "test-secret-f538",
  ANTHROPIC_API_KEY: "test-api-key",
});

// F538: discovery route들이 fx-discovery에 존재함을 검증
describe("F538: Discovery 완전 분리 — fx-discovery route 검증", () => {
  // §(a) discovery route 이전 확인: health endpoint
  it("GET /api/discovery/health → 200 (이미 존재)", async () => {
    const res = await app.request("/api/discovery/health", {}, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.domain).toBe("discovery");
  });

  // §(a) biz-items route 이전: 이전 전에는 404 (Red), 이전 후에는 401 (auth required)
  it("GET /api/biz-items → 401 (auth required, route 존재 확인)", async () => {
    const res = await app.request("/api/biz-items", {}, makeEnv());
    // auth middleware 없으면 200이지만, 이전 전에는 404
    // 이전 후에는 route가 존재하므로 200 or 401
    expect(res.status).not.toBe(404);
  });

  // §(a) discovery-pipeline route 이전
  it("GET /api/discovery-pipeline/runs → not 404 (route 존재)", async () => {
    const res = await app.request("/api/discovery-pipeline/runs", {}, makeEnv());
    expect(res.status).not.toBe(404);
  });

  // §(a) discovery route 이전
  it("GET /api/discovery/progress → not 404 (route 존재)", async () => {
    const res = await app.request("/api/discovery/progress", {}, makeEnv());
    expect(res.status).not.toBe(404);
  });

  // §(a) ax-bd-discovery route 이전
  it("GET /api/ax-bd/discovery/status → not 404 (route 존재)", async () => {
    const res = await app.request("/api/ax-bd/discovery/status", {}, makeEnv());
    expect(res.status).not.toBe(404);
  });

  // §(a) ax-bd-artifacts route 이전
  it("GET /api/ax-bd/artifacts → not 404 (route 존재)", async () => {
    const res = await app.request("/api/ax-bd/artifacts", {}, makeEnv());
    expect(res.status).not.toBe(404);
  });
});
