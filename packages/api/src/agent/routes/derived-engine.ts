/**
 * F276: DERIVED 엔진 API 라우트 — 패턴 추출 + 스킬 후보 생성 + HITL 승인
 */

import { Hono } from "hono";
import type { Env } from "../../env.js";
import type { TenantVariables } from "../../middleware/tenant.js";
import { PatternExtractorService } from "../../core/harness/services/pattern-extractor.js";
import { DerivedSkillGeneratorService } from "../services/derived-skill-generator.js";
import { DerivedReviewService } from "../services/derived-review.js";
import {
  extractPatternsSchema,
  listPatternsQuerySchema,
  generateCandidateSchema,
  listCandidatesQuerySchema,
  reviewCandidateSchema,
} from "../schemas/derived-engine.js";

export const derivedEngineRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// 1) POST /skills/derived/extract — 패턴 추출
derivedEngineRoute.post("/skills/derived/extract", async (c) => {
  const body = await c.req.json();
  const parsed = extractPatternsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new PatternExtractorService(c.env.DB);
  const result = await svc.extract(c.get("orgId"), parsed.data);
  return c.json(result, 201);
});

// 2) GET /skills/derived/patterns — 패턴 목록
derivedEngineRoute.get("/skills/derived/patterns", async (c) => {
  const parsed = listPatternsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new PatternExtractorService(c.env.DB);
  const result = await svc.getPatterns(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 3) GET /skills/derived/patterns/:patternId — 패턴 상세
derivedEngineRoute.get("/skills/derived/patterns/:patternId", async (c) => {
  const svc = new PatternExtractorService(c.env.DB);
  const detail = await svc.getPatternDetail(c.get("orgId"), c.req.param("patternId"));
  if (!detail) return c.json({ error: "Pattern not found" }, 404);
  return c.json(detail);
});

// 4) POST /skills/derived/generate — 스킬 후보 생성
derivedEngineRoute.post("/skills/derived/generate", async (c) => {
  const body = await c.req.json();
  const parsed = generateCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new DerivedSkillGeneratorService(c.env.DB);
  const result = await svc.generate(
    c.get("orgId"),
    parsed.data.patternId,
    { nameOverride: parsed.data.nameOverride, categoryOverride: parsed.data.categoryOverride },
    c.get("userId"),
  );
  return c.json(result, 201);
});

// 5) GET /skills/derived/candidates — 후보 목록
derivedEngineRoute.get("/skills/derived/candidates", async (c) => {
  const parsed = listCandidatesQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new DerivedSkillGeneratorService(c.env.DB);
  const result = await svc.listCandidates(c.get("orgId"), parsed.data);
  return c.json(result);
});

// 6) GET /skills/derived/candidates/:candidateId — 후보 상세
derivedEngineRoute.get("/skills/derived/candidates/:candidateId", async (c) => {
  const svc = new DerivedSkillGeneratorService(c.env.DB);
  const detail = await svc.getCandidateDetail(c.get("orgId"), c.req.param("candidateId"));
  if (!detail) return c.json({ error: "Candidate not found" }, 404);
  return c.json(detail);
});

// 7) POST /skills/derived/candidates/:candidateId/review — HITL 리뷰
derivedEngineRoute.post("/skills/derived/candidates/:candidateId/review", async (c) => {
  const body = await c.req.json();
  const parsed = reviewCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new DerivedReviewService(c.env.DB);
  const result = await svc.review(
    c.get("orgId"),
    c.req.param("candidateId"),
    parsed.data,
    c.get("userId"),
  );
  return c.json(result, 201);
});

// 8) GET /skills/derived/stats — 엔진 통계
derivedEngineRoute.get("/skills/derived/stats", async (c) => {
  const svc = new DerivedReviewService(c.env.DB);
  const stats = await svc.getStats(c.get("orgId"));
  return c.json(stats);
});
