/**
 * F286+F287: BD 형상화 Phase F — CRUD 10 EP + 승인 워크플로 3 EP = 13 EP
 */

import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { ShapingService } from "../services/shaping-service.js";
import { ShapingReviewService } from "../services/shaping-review-service.js";
import {
  createShapingRunSchema,
  updateShapingRunSchema,
  listShapingRunsQuerySchema,
  createPhaseLogSchema,
  createExpertReviewSchema,
  createSixHatsSchema,
  reviewSectionSchema,
} from "../schemas/shaping.js";

export const shapingRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// ─── F287: CRUD 10 EP ───

// 1) POST /shaping/runs — 형상화 실행 시작
shapingRoute.post("/shaping/runs", async (c) => {
  const body = await c.req.json();
  const parsed = createShapingRunSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new ShapingService(c.env.DB);
  const run = await svc.createRun(c.get("orgId"), parsed.data);
  return c.json(run, 201);
});

// 2) GET /shaping/runs — 실행 이력 목록
shapingRoute.get("/shaping/runs", async (c) => {
  const parsed = listShapingRunsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new ShapingService(c.env.DB);
  const result = await svc.listRuns(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 3) GET /shaping/runs/:runId — 실행 상세 (조인)
shapingRoute.get("/shaping/runs/:runId", async (c) => {
  const svc = new ShapingService(c.env.DB);
  const detail = await svc.getRunDetail(c.get("orgId"), c.req.param("runId"));
  if (!detail) return c.json({ error: "Run not found" }, 404);
  return c.json(detail);
});

// 4) PATCH /shaping/runs/:runId — 실행 상태 갱신
shapingRoute.patch("/shaping/runs/:runId", async (c) => {
  const body = await c.req.json();
  const parsed = updateShapingRunSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new ShapingService(c.env.DB);
  const updated = await svc.updateRun(c.get("orgId"), c.req.param("runId"), parsed.data);
  if (!updated) return c.json({ error: "Run not found" }, 404);
  return c.json(updated);
});

// 5) POST /shaping/runs/:runId/phase-logs — Phase 로그 추가
shapingRoute.post("/shaping/runs/:runId/phase-logs", async (c) => {
  const body = await c.req.json();
  const parsed = createPhaseLogSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new ShapingService(c.env.DB);
  const log = await svc.addPhaseLog(c.req.param("runId"), parsed.data);
  return c.json(log, 201);
});

// 6) GET /shaping/runs/:runId/phase-logs — Phase 로그 목록
shapingRoute.get("/shaping/runs/:runId/phase-logs", async (c) => {
  const svc = new ShapingService(c.env.DB);
  const logs = await svc.listPhaseLogs(c.req.param("runId"));
  return c.json(logs);
});

// 7) POST /shaping/runs/:runId/expert-reviews — 전문가 리뷰 추가
shapingRoute.post("/shaping/runs/:runId/expert-reviews", async (c) => {
  const body = await c.req.json();
  const parsed = createExpertReviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new ShapingService(c.env.DB);
  const review = await svc.addExpertReview(c.req.param("runId"), parsed.data);
  return c.json(review, 201);
});

// 8) GET /shaping/runs/:runId/expert-reviews — 전문가 리뷰 목록
shapingRoute.get("/shaping/runs/:runId/expert-reviews", async (c) => {
  const svc = new ShapingService(c.env.DB);
  const reviews = await svc.listExpertReviews(c.req.param("runId"));
  return c.json(reviews);
});

// 9) POST /shaping/runs/:runId/six-hats — Six Hats 의견 추가
shapingRoute.post("/shaping/runs/:runId/six-hats", async (c) => {
  const body = await c.req.json();
  const parsed = createSixHatsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new ShapingService(c.env.DB);
  const hat = await svc.addSixHats(c.req.param("runId"), parsed.data);
  return c.json(hat, 201);
});

// 10) GET /shaping/runs/:runId/six-hats — Six Hats 의견 목록
shapingRoute.get("/shaping/runs/:runId/six-hats", async (c) => {
  const svc = new ShapingService(c.env.DB);
  const hats = await svc.listSixHats(c.req.param("runId"));
  return c.json(hats);
});

// ─── F286: 승인 워크플로 3 EP ───

// 11) POST /shaping/runs/:runId/review — HITL 섹션별 승인/수정요청/반려
shapingRoute.post("/shaping/runs/:runId/review", async (c) => {
  const body = await c.req.json();
  const parsed = reviewSectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new ShapingReviewService(c.env.DB);
  const result = await svc.reviewSection(c.get("orgId"), c.req.param("runId"), parsed.data, c.get("userId"));
  if (!result) return c.json({ error: "Run not found" }, 404);
  return c.json(result);
});

// 12) POST /shaping/runs/:runId/auto-review — 자동 모드: AI 3 페르소나 리뷰
shapingRoute.post("/shaping/runs/:runId/auto-review", async (c) => {
  const svc = new ShapingReviewService(c.env.DB);
  const result = await svc.autoReview(c.get("orgId"), c.req.param("runId"));
  if (!result) return c.json({ error: "Run not found" }, 404);
  return c.json(result);
});

// 13) GET /shaping/runs/:runId/diff — 2단계 PRD 대비 변경 diff
shapingRoute.get("/shaping/runs/:runId/diff", async (c) => {
  const svc = new ShapingReviewService(c.env.DB);
  const diff = await svc.getDiff(c.get("orgId"), c.req.param("runId"));
  if (!diff) return c.json({ error: "Run not found" }, 404);
  return c.json(diff);
});
