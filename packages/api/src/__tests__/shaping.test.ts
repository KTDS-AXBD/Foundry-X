import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { shapingRoute } from "../routes/shaping.js";

function createTestApp(db: any) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    (c as any).env = { DB: db };
    c.set("orgId" as any, "org_test");
    c.set("userId" as any, "test-user");
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

describe("shaping routes (F286+F287)", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;

  beforeEach(() => {
    db = createMockD1();
    app = createTestApp(db);
  });

  // ── POST /shaping/runs ──

  describe("POST /api/shaping/runs", () => {
    it("should create a run (201)", async () => {
      const res = await post(app, "/api/shaping/runs", {
        discoveryPrdId: "prd-001",
        mode: "hitl",
      });
      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data.discoveryPrdId).toBe("prd-001");
      expect(data.mode).toBe("hitl");
      expect(data.status).toBe("running");
      expect(data.currentPhase).toBe("A");
    });

    it("should create an auto-mode run", async () => {
      const res = await post(app, "/api/shaping/runs", {
        discoveryPrdId: "prd-002",
        mode: "auto",
        maxIterations: 5,
        tokenLimit: 100000,
      });
      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data.mode).toBe("auto");
      expect(data.maxIterations).toBe(5);
      expect(data.tokenLimit).toBe(100000);
    });

    it("should reject missing discoveryPrdId (400)", async () => {
      const res = await post(app, "/api/shaping/runs", { mode: "hitl" });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /shaping/runs ──

  describe("GET /api/shaping/runs", () => {
    it("should list runs with pagination", async () => {
      await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-a" });
      await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-b" });

      const res = await app.request("/api/shaping/runs?limit=10&offset=0");
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.items.length).toBe(2);
      expect(data.total).toBe(2);
    });

    it("should filter by status", async () => {
      await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-a" });

      const res = await app.request("/api/shaping/runs?status=completed");
      const data: any = await res.json();
      expect(data.items.length).toBe(0);
    });

    it("should return empty for no results", async () => {
      const res = await app.request("/api/shaping/runs");
      const data: any = await res.json();
      expect(data.items).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  // ── GET /shaping/runs/:runId ──

  describe("GET /api/shaping/runs/:runId", () => {
    it("should return detail with joins", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-x" });
      const run: any = await createRes.json();

      // Add phase log
      await post(app, `/api/shaping/runs/${run.id}/phase-logs`, {
        phase: "A",
        round: 1,
        verdict: "PASS",
      });

      // Add expert review
      await post(app, `/api/shaping/runs/${run.id}/expert-reviews`, {
        expertRole: "TA",
        reviewBody: "Architecture looks solid",
      });

      // Add six hats
      await post(app, `/api/shaping/runs/${run.id}/six-hats`, {
        hatColor: "white",
        round: 1,
        opinion: "Factual analysis complete",
      });

      const res = await app.request(`/api/shaping/runs/${run.id}`);
      expect(res.status).toBe(200);
      const detail: any = await res.json();
      expect(detail.phaseLogs.length).toBe(1);
      expect(detail.expertReviews.length).toBe(1);
      expect(detail.sixHats.length).toBe(1);
    });

    it("should return 404 for non-existent run", async () => {
      const res = await app.request("/api/shaping/runs/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /shaping/runs/:runId ──

  describe("PATCH /api/shaping/runs/:runId", () => {
    it("should update run status and phase", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-u" });
      const run: any = await createRes.json();

      const res = await patch(app, `/api/shaping/runs/${run.id}`, {
        currentPhase: "C",
        qualityScore: 0.85,
      });
      expect(res.status).toBe(200);
      const updated: any = await res.json();
      expect(updated.currentPhase).toBe("C");
      expect(updated.qualityScore).toBe(0.85);
    });

    it("should return 404 for non-existent run", async () => {
      const res = await patch(app, "/api/shaping/runs/missing", { status: "completed" });
      expect(res.status).toBe(404);
    });
  });

  // ── POST/GET /shaping/runs/:runId/phase-logs ──

  describe("phase-logs", () => {
    it("should add and list phase logs", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-pl" });
      const run: any = await createRes.json();

      const addRes = await post(app, `/api/shaping/runs/${run.id}/phase-logs`, {
        phase: "B",
        round: 1,
        verdict: "MINOR_FIX",
        findings: "Minor formatting issues",
      });
      expect(addRes.status).toBe(201);

      const listRes = await app.request(`/api/shaping/runs/${run.id}/phase-logs`);
      const logs: any = await listRes.json();
      expect(logs.length).toBe(1);
      expect(logs[0].phase).toBe("B");
      expect(logs[0].verdict).toBe("MINOR_FIX");
    });

    it("should reject invalid phase (400)", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-pl2" });
      const run: any = await createRes.json();

      const res = await post(app, `/api/shaping/runs/${run.id}/phase-logs`, {
        phase: "Z",
        round: 1,
      });
      expect(res.status).toBe(400);
    });
  });

  // ── POST/GET /shaping/runs/:runId/expert-reviews ──

  describe("expert-reviews", () => {
    it("should add and list expert reviews", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-er" });
      const run: any = await createRes.json();

      const addRes = await post(app, `/api/shaping/runs/${run.id}/expert-reviews`, {
        expertRole: "CA",
        reviewBody: "Cloud architecture is well-designed",
        qualityScore: 0.9,
      });
      expect(addRes.status).toBe(201);

      const listRes = await app.request(`/api/shaping/runs/${run.id}/expert-reviews`);
      const reviews: any = await listRes.json();
      expect(reviews.length).toBe(1);
      expect(reviews[0].expertRole).toBe("CA");
    });

    it("should reject invalid expertRole (400)", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-er2" });
      const run: any = await createRes.json();

      const res = await post(app, `/api/shaping/runs/${run.id}/expert-reviews`, {
        expertRole: "INVALID",
        reviewBody: "test",
      });
      expect(res.status).toBe(400);
    });
  });

  // ── POST/GET /shaping/runs/:runId/six-hats ──

  describe("six-hats", () => {
    it("should add and list six hats opinions", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-sh" });
      const run: any = await createRes.json();

      const addRes = await post(app, `/api/shaping/runs/${run.id}/six-hats`, {
        hatColor: "black",
        round: 1,
        opinion: "Risk of market timing is high",
        verdict: "concern",
      });
      expect(addRes.status).toBe(201);

      const listRes = await app.request(`/api/shaping/runs/${run.id}/six-hats`);
      const hats: any = await listRes.json();
      expect(hats.length).toBe(1);
      expect(hats[0].hatColor).toBe("black");
      expect(hats[0].verdict).toBe("concern");
    });

    it("should reject invalid hat color (400)", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-sh2" });
      const run: any = await createRes.json();

      const res = await post(app, `/api/shaping/runs/${run.id}/six-hats`, {
        hatColor: "purple",
        round: 1,
        opinion: "test",
      });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /shaping/runs/:runId/review (HITL) ──

  describe("POST /api/shaping/runs/:runId/review", () => {
    it("should approve and set status to completed", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-rv" });
      const run: any = await createRes.json();

      const res = await post(app, `/api/shaping/runs/${run.id}/review`, {
        action: "approved",
        section: "사업 타당성",
      });
      expect(res.status).toBe(200);
      const result: any = await res.json();
      expect(result.action).toBe("approved");
      expect(result.newStatus).toBe("completed");
    });

    it("should handle revision request (status stays running)", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-rv2" });
      const run: any = await createRes.json();

      const res = await post(app, `/api/shaping/runs/${run.id}/review`, {
        action: "revision_requested",
        section: "기술 실현성",
        comment: "더 구체적인 아키텍처 필요",
      });
      const result: any = await res.json();
      expect(result.action).toBe("revision_requested");
      expect(result.newStatus).toBe("running");
    });

    it("should reject and set status to failed", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-rv3" });
      const run: any = await createRes.json();

      const res = await post(app, `/api/shaping/runs/${run.id}/review`, {
        action: "rejected",
        section: "사업 타당성",
        comment: "시장 분석 부족",
      });
      const result: any = await res.json();
      expect(result.newStatus).toBe("failed");
    });
  });

  // ── POST /shaping/runs/:runId/auto-review ──

  describe("POST /api/shaping/runs/:runId/auto-review", () => {
    it("should auto-review and return consensus approved", async () => {
      const createRes = await post(app, "/api/shaping/runs", {
        discoveryPrdId: "prd-ar",
        mode: "auto",
      });
      const run: any = await createRes.json();

      const res = await post(app, `/api/shaping/runs/${run.id}/auto-review`, {});
      expect(res.status).toBe(200);
      const result: any = await res.json();
      expect(result.results.length).toBe(3);
      expect(result.consensus).toBe("approved");
      expect(result.newStatus).toBe("completed");
    });

    it("should return 404 for non-existent run", async () => {
      const res = await post(app, "/api/shaping/runs/missing/auto-review", {});
      expect(res.status).toBe(404);
    });
  });

  // ── GET /shaping/runs/:runId/diff ──

  describe("GET /api/shaping/runs/:runId/diff", () => {
    it("should return diff sections", async () => {
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-diff" });
      const run: any = await createRes.json();

      const res = await app.request(`/api/shaping/runs/${run.id}/diff`);
      expect(res.status).toBe(200);
      const diff: any = await res.json();
      expect(diff.discoveryPrdId).toBe("prd-diff");
      expect(diff.sections).toBeDefined();
    });

    it("should return 404 for non-existent run", async () => {
      const res = await app.request("/api/shaping/runs/missing/diff");
      expect(res.status).toBe(404);
    });
  });

  // ── Tenant isolation ──

  describe("tenant isolation", () => {
    it("should not access other tenant's runs", async () => {
      // Create run in org_test
      const createRes = await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-t1" });
      const run: any = await createRes.json();

      // Create app with different tenant
      const otherApp = new Hono();
      otherApp.use("*", async (c, next) => {
        (c as any).env = { DB: db };
        c.set("orgId" as any, "other_org");
        c.set("userId" as any, "other-user");
        await next();
      });
      otherApp.route("/api", shapingRoute);

      // Try to access from other tenant
      const res = await otherApp.request(`/api/shaping/runs/${run.id}`);
      expect(res.status).toBe(404);
    });

    it("should not list other tenant's runs", async () => {
      await post(app, "/api/shaping/runs", { discoveryPrdId: "prd-t2" });

      const otherApp = new Hono();
      otherApp.use("*", async (c, next) => {
        (c as any).env = { DB: db };
        c.set("orgId" as any, "other_org");
        c.set("userId" as any, "other-user");
        await next();
      });
      otherApp.route("/api", shapingRoute);

      const res = await otherApp.request("/api/shaping/runs");
      const data: any = await res.json();
      expect(data.items.length).toBe(0);
    });
  });
});
