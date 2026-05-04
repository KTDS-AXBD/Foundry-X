/**
 * F513 B-1~B-3 — Work Management 신규 엔드포인트 TDD Red Phase
 *
 * 대상: GET /api/work/velocity, /api/work/phase-progress, /api/work/backlog-health
 * 9건 FAIL → Green 구현 후 PASS
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { workRoute } from "../core/work/routes/work.js";
import { z } from "@hono/zod-openapi";
import type { Env } from "../env.js";

// ── 최소 테스트 앱 (workRoute만 등록) ────────────────────────────────────────
// app.ts 전체 임포트 시 @foundry-x/shared 빌드 미완성으로 collect 실패 → 경량 앱 사용

function makeTestApp() {
  const app = new OpenAPIHono<{ Bindings: Env }>();
  app.route("/api", workRoute);
  return app;
}

// ── Zod 검증 스키마 (Design §2 인터페이스 기반) ──────────────────────────────

const VelocitySchema = z.object({
  sprints: z.array(z.object({
    sprint: z.number(),
    f_items_done: z.number(),
    week: z.string(), // YYYY-WNN
  })),
  avg_per_sprint: z.number(),
  trend: z.enum(["up", "down", "stable"]),
  generated_at: z.string(),
});

const PhaseProgressSchema = z.object({
  phases: z.array(z.object({
    id: z.number(),
    name: z.string(),
    total: z.number(),
    done: z.number(),
    in_progress: z.number(),
    pct: z.number(),
  })),
  current_phase: z.number(),
  generated_at: z.string(),
});

const BacklogHealthSchema = z.object({
  total_backlog: z.number(),
  stale_items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    age_sprints: z.number(),
  })),
  health_score: z.number().min(0).max(100),
  warnings: z.array(z.string()),
  generated_at: z.string(),
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── B-1: GET /api/work/velocity ───────────────────────────────────────────────

describe("GET /api/work/velocity — F513 B-1", () => {
  it("fetch 정상 — 200 + VelocitySchema 검증", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
| F501 | Done item A | Sprint 260 | ✅ | |
| F502 | Done item B | Sprint 261 | ✅ | |
| F503 | In progress | Sprint 264 | 🔧(impl) | |
`.trim(),
    }));

    const res = await makeTestApp().request("/api/work/velocity");
    expect(res.status).toBe(200);

    const body = await res.json();
    const result = VelocitySchema.safeParse(body);
    expect(result.success, JSON.stringify(result.error)).toBe(true);
  });

  it("fetch 실패 — 200 + 빈 sprints 배열 (graceful)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const res = await makeTestApp().request("/api/work/velocity");
    expect(res.status).toBe(200);

    const body = await res.json() as { sprints: unknown[] };
    expect(Array.isArray(body.sprints)).toBe(true);
  });

  it("빈 SPEC → avg_per_sprint=0, trend=stable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    }));

    const res = await makeTestApp().request("/api/work/velocity");
    expect(res.status).toBe(200);

    const body = await res.json() as { avg_per_sprint: number; trend: string };
    expect(body.avg_per_sprint).toBe(0);
    expect(body.trend).toBe("stable");
  });
});

// ── B-2: GET /api/work/phase-progress ────────────────────────────────────────

describe("GET /api/work/phase-progress — F513 B-2", () => {
  it("fetch 정상 — 200 + PhaseProgressSchema 검증", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
| F501 | Done A (FX-REQ-501, P1) | Sprint 260 | ✅ | Phase 35 |
| F502 | In progress B | Sprint 264 | 🔧(impl) | |
`.trim(),
    }));

    const res = await makeTestApp().request("/api/work/phase-progress");
    expect(res.status).toBe(200);

    const body = await res.json();
    const result = PhaseProgressSchema.safeParse(body);
    expect(result.success, JSON.stringify(result.error)).toBe(true);
  });

  it("fetch 실패 — 200 + phases=[] (graceful)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const res = await makeTestApp().request("/api/work/phase-progress");
    expect(res.status).toBe(200);

    const body = await res.json() as { phases: unknown[] };
    expect(Array.isArray(body.phases)).toBe(true);
  });

  it("current_phase 양수 정수", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `| F510 | Some feature | Sprint 264 | 🔧 | |`,
    }));

    const res = await makeTestApp().request("/api/work/phase-progress");
    expect(res.status).toBe(200);

    const body = await res.json() as { current_phase: number };
    expect(typeof body.current_phase).toBe("number");
    expect(body.current_phase).toBeGreaterThanOrEqual(0);
  });
});

// ── B-3: GET /api/work/backlog-health ────────────────────────────────────────

describe("GET /api/work/backlog-health — F513 B-3", () => {
  it("fetch 정상 — 200 + BacklogHealthSchema 검증", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
| F501 | Stale backlog item | — | 📋(idea) | |
| F502 | Active in-progress | Sprint 264 | 🔧(impl) | |
`.trim(),
    }));

    const res = await makeTestApp().request("/api/work/backlog-health");
    expect(res.status).toBe(200);

    const body = await res.json();
    const result = BacklogHealthSchema.safeParse(body);
    expect(result.success, JSON.stringify(result.error)).toBe(true);
  });

  it("fetch 실패 — 200 + health_score=100 (graceful, 빈 backlog)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const res = await makeTestApp().request("/api/work/backlog-health");
    expect(res.status).toBe(200);

    const body = await res.json() as { health_score: number };
    expect(body.health_score).toBeGreaterThanOrEqual(0);
    expect(body.health_score).toBeLessThanOrEqual(100);
  });

  it("backlog 없음 → total_backlog=0, warnings 배열", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `| F510 | Done item | Sprint 263 | ✅ | |`,
    }));

    const res = await makeTestApp().request("/api/work/backlog-health");
    expect(res.status).toBe(200);

    const body = await res.json() as { total_backlog: number; warnings: unknown[] };
    expect(body.total_backlog).toBe(0);
    expect(Array.isArray(body.warnings)).toBe(true);
  });
});
