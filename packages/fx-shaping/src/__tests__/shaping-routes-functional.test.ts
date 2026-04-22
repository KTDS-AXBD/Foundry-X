// F563: fx-shaping 13 EP 기능 테스트 (shaping.ts routes)
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createShapingTables } from "./helpers/mock-d1.js";
import { shapingRoute } from "../routes/shaping.js";

type AnyDb = ReturnType<typeof createShapingTables>["db"];

function createTestApp(db: AnyDb) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    (c as any).env = { DB: db };
    c.set("orgId" as never, "org_test" as never);
    c.set("userId" as never, "user-test" as never);
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

function patch(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function get(app: Hono, path: string) {
  return app.request(path, { method: "GET" });
}

describe("F563: fx-shaping 13 EP 기능 테스트", () => {
  let app: Hono;

  beforeEach(() => {
    const { db } = createShapingTables();
    app = createTestApp(db);
  });

  // ── EP 1: POST /shaping/runs ──
  it("EP1: POST /api/shaping/runs → 201 + id 반환", async () => {
    const res = await post(app, "/api/shaping/runs", {
      discoveryPrdId: "prd-001",
      mode: "hitl",
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(typeof body.id).toBe("string");
    expect(body.status).toBe("running");
    expect(body.currentPhase).toBe("A");
  });

  // ── EP 2: GET /shaping/runs ──
  it("EP2: GET /api/shaping/runs → 목록 반환", async () => {
    await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-002", mode: "auto" });

    const res = await get(app, "/api/shaping/runs");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(body.items)).toBe(true);
  });

  // ── EP 3: GET /shaping/runs/:runId ──
  it("EP3: GET /api/shaping/runs/:id → 상세 반환", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;

    const res = await get(app, `/api/shaping/runs/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.id).toBe(id);
  });

  it("EP3: GET /api/shaping/runs/:id → 없으면 404", async () => {
    const res = await get(app, "/api/shaping/runs/nonexistent-id");
    expect(res.status).toBe(404);
  });

  // ── EP 4: PATCH /shaping/runs/:runId ──
  it("EP4: PATCH /api/shaping/runs/:id → status 갱신", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;

    const res = await patch(app, `/api/shaping/runs/${id}`, {
      status: "completed",
      currentPhase: "F",
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("completed");
    expect(body.currentPhase).toBe("F");
  });

  // ── EP 5: POST /shaping/runs/:runId/phase-logs ──
  it("EP5: POST /api/shaping/runs/:id/phase-logs → 201", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;

    const res = await post(app, `/api/shaping/runs/${id}/phase-logs`, {
      phase: "B",
      round: 1,
      verdict: "PASS",
      qualityScore: 0.9,
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.phase).toBe("B");
    expect(body.verdict).toBe("PASS");
  });

  // ── EP 6: GET /shaping/runs/:runId/phase-logs ──
  it("EP6: GET /api/shaping/runs/:id/phase-logs → 목록 반환", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;
    await post(app, `/api/shaping/runs/${id}/phase-logs`, { phase: "A", round: 1, verdict: "PASS" });

    const res = await get(app, `/api/shaping/runs/${id}/phase-logs`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  // ── EP 7: POST /shaping/runs/:runId/expert-reviews ──
  it("EP7: POST /api/shaping/runs/:id/expert-reviews → 201", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "auto" });
    const { id } = await createRes.json() as any;

    const res = await post(app, `/api/shaping/runs/${id}/expert-reviews`, {
      expertRole: "TA",
      reviewBody: "기술 아키텍처 적합성 검토 완료",
      qualityScore: 0.88,
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.expertRole).toBe("TA");
  });

  // ── EP 8: GET /shaping/runs/:runId/expert-reviews ──
  it("EP8: GET /api/shaping/runs/:id/expert-reviews → 목록 반환", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "auto" });
    const { id } = await createRes.json() as any;
    await post(app, `/api/shaping/runs/${id}/expert-reviews`, {
      expertRole: "CA",
      reviewBody: "클라우드 아키텍처 검토",
    });

    const res = await get(app, `/api/shaping/runs/${id}/expert-reviews`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  // ── EP 9: POST /shaping/runs/:runId/six-hats ──
  it("EP9: POST /api/shaping/runs/:id/six-hats → 201", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;

    const res = await post(app, `/api/shaping/runs/${id}/six-hats`, {
      hatColor: "green",
      round: 1,
      opinion: "창의적 대안 — 구독 모델 외 거래당 수수료 검토",
      verdict: "accept",
    });
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.hatColor).toBe("green");
    expect(body.verdict).toBe("accept");
  });

  // ── EP 10: GET /shaping/runs/:runId/six-hats ──
  it("EP10: GET /api/shaping/runs/:id/six-hats → 목록 반환", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;
    await post(app, `/api/shaping/runs/${id}/six-hats`, {
      hatColor: "white",
      round: 1,
      opinion: "데이터 기반 사실 분석",
      verdict: "accept",
    });

    const res = await get(app, `/api/shaping/runs/${id}/six-hats`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  // ── EP 11: POST /shaping/runs/:runId/review (HITL 섹션 승인) ──
  it("EP11: POST /api/shaping/runs/:id/review → approved", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;

    const res = await post(app, `/api/shaping/runs/${id}/review`, {
      section: "executive-summary",
      action: "approved",
      comment: "최종 승인",
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.action).toBe("approved");
    expect(body.newStatus).toBe("completed");
  });

  it("EP11: POST /api/shaping/runs/:id/review → revision_requested", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;

    const res = await post(app, `/api/shaping/runs/${id}/review`, {
      section: "market-analysis",
      action: "revision_requested",
      comment: "시장 규모 근거 보완 필요",
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.action).toBe("revision_requested");
  });

  // ── EP 12: POST /shaping/runs/:runId/auto-review ──
  it("EP12: POST /api/shaping/runs/:id/auto-review → 3 personas", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "auto" });
    const { id } = await createRes.json() as any;

    const res = await post(app, `/api/shaping/runs/${id}/auto-review`, {});
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBe(3);
    expect(body.consensus).toBe("approved");
  });

  // ── EP 13: GET /shaping/runs/:runId/diff ──
  it("EP13: GET /api/shaping/runs/:id/diff → diff 반환", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "auto" });
    const { id } = await createRes.json() as any;

    const res = await get(app, `/api/shaping/runs/${id}/diff`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.runId).toBe(id);
  });

  // ── 입력값 검증 ──
  it("EP1: 잘못된 mode 값 → 400", async () => {
    const res = await post(app, "/api/shaping/runs", {
      discoveryPrdId: "prd-001",
      mode: "invalid",
    });
    expect(res.status).toBe(400);
  });

  it("EP5: 잘못된 phase 값 → 400", async () => {
    const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-001", mode: "hitl" });
    const { id } = await createRes.json() as any;

    const res = await post(app, `/api/shaping/runs/${id}/phase-logs`, {
      phase: "Z",
      round: 1,
    });
    expect(res.status).toBe(400);
  });
});
