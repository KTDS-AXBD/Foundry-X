/**
 * F277: CAPTURED 엔진 API 라우트 — 워크플로우 패턴 추출 + 메타 스킬 후보 생성 + HITL 승인
 */

import { Hono } from "hono";
import type { Env } from "../../env.js";
import type { TenantVariables } from "../../middleware/tenant.js";
import { WorkflowPatternExtractorService } from "../services/workflow-pattern-extractor.js";
import { CapturedSkillGeneratorService } from "../services/captured-skill-generator.js";
import { CapturedReviewService } from "../services/captured-review.js";
import {
  extractWorkflowPatternsSchema,
  listWorkflowPatternsQuerySchema,
  generateCapturedCandidateSchema,
  listCapturedCandidatesQuerySchema,
  reviewCapturedCandidateSchema,
} from "../schemas/captured-engine.js";

export const capturedEngineRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// 1) POST /skills/captured/extract — 워크플로우 패턴 추출
capturedEngineRoute.post("/skills/captured/extract", async (c) => {
  const body = await c.req.json();
  const parsed = extractWorkflowPatternsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new WorkflowPatternExtractorService(c.env.DB);
  const result = await svc.extract(c.get("orgId"), parsed.data);
  return c.json(result, 201);
});

// 2) GET /skills/captured/patterns — 패턴 목록
capturedEngineRoute.get("/skills/captured/patterns", async (c) => {
  const parsed = listWorkflowPatternsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new WorkflowPatternExtractorService(c.env.DB);
  const result = await svc.getPatterns(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 3) GET /skills/captured/patterns/:patternId — 패턴 상세
capturedEngineRoute.get("/skills/captured/patterns/:patternId", async (c) => {
  const svc = new WorkflowPatternExtractorService(c.env.DB);
  const detail = await svc.getPatternDetail(c.get("orgId"), c.req.param("patternId"));
  if (!detail) return c.json({ error: "Pattern not found" }, 404);
  return c.json(detail);
});

// 4) POST /skills/captured/generate — 메타 스킬 후보 생성
capturedEngineRoute.post("/skills/captured/generate", async (c) => {
  const body = await c.req.json();
  const parsed = generateCapturedCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new CapturedSkillGeneratorService(c.env.DB);
  const result = await svc.generate(
    c.get("orgId"),
    parsed.data.patternId,
    { nameOverride: parsed.data.nameOverride, categoryOverride: parsed.data.categoryOverride },
    c.get("userId"),
  );
  return c.json(result, 201);
});

// 5) GET /skills/captured/candidates — 후보 목록
capturedEngineRoute.get("/skills/captured/candidates", async (c) => {
  const parsed = listCapturedCandidatesQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new CapturedSkillGeneratorService(c.env.DB);
  const result = await svc.listCandidates(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 6) GET /skills/captured/candidates/:candidateId — 후보 상세
capturedEngineRoute.get("/skills/captured/candidates/:candidateId", async (c) => {
  const svc = new CapturedSkillGeneratorService(c.env.DB);
  const detail = await svc.getCandidateDetail(c.get("orgId"), c.req.param("candidateId"));
  if (!detail) return c.json({ error: "Candidate not found" }, 404);
  return c.json(detail);
});

// 7) POST /skills/captured/candidates/:candidateId/review — HITL 리뷰
capturedEngineRoute.post("/skills/captured/candidates/:candidateId/review", async (c) => {
  const body = await c.req.json();
  const parsed = reviewCapturedCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new CapturedReviewService(c.env.DB);
  const result = await svc.review(
    c.get("orgId"),
    c.req.param("candidateId"),
    parsed.data,
    c.get("userId"),
  );
  return c.json(result, 201);
});

// 8) GET /skills/captured/stats — 엔진 통계
capturedEngineRoute.get("/skills/captured/stats", async (c) => {
  const svc = new CapturedReviewService(c.env.DB);
  const stats = await svc.getStats(c.get("orgId"));
  return c.json(stats);
});
