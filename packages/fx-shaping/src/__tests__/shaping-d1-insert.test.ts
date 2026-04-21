// F563 TDD Red — fx-shaping D1 INSERT 확인 (KOAMI P2 deferred 완결)
// bi-koami-001 shaping_runs ≥ 1건 실측, fixture/하드코딩 금지
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import Database from "better-sqlite3";
import { createMockD1, createShapingTables } from "./helpers/mock-d1.js";
import { shapingRoute } from "../routes/shaping.js";

type AnyDb = ReturnType<typeof createMockD1>;

function createTestApp(db: AnyDb) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    (c as any).env = { DB: db };
    c.set("orgId" as any, "org_test");
    c.set("userId" as any, "user-test");
    await next();
  });
  app.route("/api", shapingRoute);
  return app;
}

function post(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function get(app: Hono, path: string) {
  return app.request(path, { method: "GET" });
}

describe("F563: fx-shaping D1 INSERT 확인 (KOAMI P2 완결)", () => {
  let db: AnyDb;
  let rawDb: Database.Database;
  let app: Hono;

  beforeEach(() => {
    ({ db, rawDb } = createShapingTables());
    app = createTestApp(db);
  });

  // ── (c) Shaping Graph E2E: bi-koami-001 proposals ≥ 1건 실측 ──

  it("POST /api/shaping/runs → shaping_runs에 행 INSERT됨 (D1 확인)", async () => {
    const res = await post(app, "/api/shaping/runs", {
      discoveryPrdId: "bi-koami-001",
      mode: "hitl",
    });
    expect(res.status).toBe(201);

    const row = rawDb
      .prepare("SELECT * FROM shaping_runs WHERE discovery_prd_id = ?")
      .get("bi-koami-001") as Record<string, unknown> | undefined;
    expect(row).not.toBeNull();
    expect(row!.status).toBe("running");
    expect(row!.current_phase).toBe("A");
    expect(typeof row!.id).toBe("string");
  });

  it("bi-koami-001 Phase log INSERT — proposals ≥ 1건", async () => {
    const runRes = await post(app, "/api/shaping/runs", {
      discoveryPrdId: "bi-koami-001",
      mode: "hitl",
    });
    const run = (await runRes.json()) as { id: string };

    await post(app, `/api/shaping/runs/${run.id}/phase-logs`, {
      phase: "A",
      round: 1,
      verdict: "PASS",
      qualityScore: 0.85,
    });

    const cnt = rawDb
      .prepare("SELECT COUNT(*) as cnt FROM shaping_phase_logs WHERE run_id = ?")
      .get(run.id) as { cnt: number };
    expect(cnt.cnt).toBeGreaterThanOrEqual(1);
  });

  it("bi-koami-001 expert review INSERT 확인", async () => {
    const runRes = await post(app, "/api/shaping/runs", {
      discoveryPrdId: "bi-koami-001",
      mode: "auto",
    });
    const run = (await runRes.json()) as { id: string };

    await post(app, `/api/shaping/runs/${run.id}/expert-reviews`, {
      expertRole: "TA",
      reviewBody: "기술 아키텍처 검토 완료",
      qualityScore: 0.9,
    });

    const cnt = rawDb
      .prepare("SELECT COUNT(*) as cnt FROM shaping_expert_reviews WHERE run_id = ?")
      .get(run.id) as { cnt: number };
    expect(cnt.cnt).toBeGreaterThanOrEqual(1);
  });

  it("bi-koami-001 Six Hats INSERT 확인", async () => {
    const runRes = await post(app, "/api/shaping/runs", {
      discoveryPrdId: "bi-koami-001",
      mode: "hitl",
    });
    const run = (await runRes.json()) as { id: string };

    await post(app, `/api/shaping/runs/${run.id}/six-hats`, {
      hatColor: "white",
      round: 1,
      opinion: "데이터 기반 사실 분석 완료",
      verdict: "accept",
    });

    const cnt = rawDb
      .prepare("SELECT COUNT(*) as cnt FROM shaping_six_hats WHERE run_id = ?")
      .get(run.id) as { cnt: number };
    expect(cnt.cnt).toBeGreaterThanOrEqual(1);
  });

  // ── PATCH shaping run 상태 갱신 ──

  it("PATCH /api/shaping/runs/:id → status 갱신", async () => {
    const runRes = await post(app, "/api/shaping/runs", {
      discoveryPrdId: "bi-koami-001",
      mode: "hitl",
    });
    const run = (await runRes.json()) as { id: string };

    const patchRes = await app.request(`/api/shaping/runs/${run.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed", currentPhase: "F" }),
    });
    expect(patchRes.status).toBe(200);

    const row = rawDb
      .prepare("SELECT * FROM shaping_runs WHERE id = ?")
      .get(run.id) as Record<string, unknown>;
    expect(row.status).toBe("completed");
    expect(row.current_phase).toBe("F");
  });

  // ── GET list 확인 ──

  it("GET /api/shaping/runs → bi-koami-001 run 목록 반환", async () => {
    await post(app, "/api/shaping/runs", {
      discoveryPrdId: "bi-koami-001",
      mode: "hitl",
    });
    await post(app, "/api/shaping/runs", {
      discoveryPrdId: "bi-koami-001",
      mode: "auto",
    });

    const listRes = await get(app, "/api/shaping/runs");
    expect(listRes.status).toBe(200);
    const data = (await listRes.json()) as { items: unknown[]; total: number };
    expect(data.total).toBeGreaterThanOrEqual(2);
  });
});
