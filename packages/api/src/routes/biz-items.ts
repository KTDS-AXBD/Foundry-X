/**
 * Sprint 51~53: BizItems Routes — CRUD + 분류 + 평가 + Discovery 9기준 + 분석 컨텍스트 + PRD 생성
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { CreateBizItemSchema, ClassifyBizItemSchema } from "../schemas/biz-item.js";
import { BizItemService } from "../services/biz-item-service.js";
import { ItemClassifier, ClassificationError } from "../services/item-classifier.js";
import { BizPersonaEvaluator, EvaluationError } from "../services/biz-persona-evaluator.js";
import { createAgentRunner } from "../services/agent-runner.js";
import { StartingPointClassifier, StartingPointError } from "../services/starting-point-classifier.js";
import { getAnalysisPath, type StartingPointType } from "../services/analysis-paths.js";
import { ClassifyStartingPointSchema, ConfirmStartingPointSchema } from "../schemas/starting-point.js";
// Sprint 55 imports (F186, F187)
import { PrdReviewPipeline, PipelineError } from "../services/prd-review-pipeline.js";
import { savePrdPersonaEvaluations, getPrdPersonaEvaluations } from "../services/biz-persona-evaluator.js";
// Sprint 53 imports (F183, F184, F185)
import { DiscoveryCriteriaService } from "../services/discovery-criteria.js";
import { AnalysisContextService } from "../services/analysis-context.js";
import { PrdGeneratorService } from "../services/prd-generator.js";
import { UpdateCriterionSchema } from "../schemas/discovery-criteria.js";
import { SaveAnalysisContextSchema } from "../schemas/analysis-context.js";
import { GeneratePrdSchema } from "../schemas/prd.js";
// Sprint 56 imports (F188)
import { SixHatsDebateService, SixHatsDebateError } from "../services/sixhats-debate.js";
// Sprint 57 imports (F179, F190)
import { TrendDataService, TrendAnalysisError } from "../services/trend-data-service.js";
import { CompetitorScanner, CompetitorScanError } from "../services/competitor-scanner.js";
import { TrendReportRequestSchema } from "../schemas/trend.js";

export const bizItemsRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── POST /biz-items — 사업 아이템 등록 ───

bizItemsRoute.post("/biz-items", async (c) => {
  const body = await c.req.json();
  const parsed = CreateBizItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const service = new BizItemService(c.env.DB);
  const item = await service.create(orgId, userId, parsed.data);

  return c.json(item, 201);
});

// ─── GET /biz-items — 목록 조회 (org 필터) ───

bizItemsRoute.get("/biz-items", async (c) => {
  const orgId = c.get("orgId");
  const status = c.req.query("status") || undefined;
  const source = c.req.query("source") || undefined;

  const service = new BizItemService(c.env.DB);
  const items = await service.list(orgId, { status, source });

  return c.json({ items });
});

// ─── GET /biz-items/:id — 상세 조회 ───

bizItemsRoute.get("/biz-items/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  return c.json(item);
});

// ─── POST /biz-items/:id/classify — 분류 실행 ───

bizItemsRoute.post("/biz-items/:id/classify", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  if (item.classification) {
    return c.json({ error: "ALREADY_CLASSIFIED" }, 409);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = ClassifyBizItemSchema.safeParse(body);
  const context = parsed.success ? parsed.data.context : undefined;

  const runner = createAgentRunner(c.env);
  const classifier = new ItemClassifier(runner, c.env.DB);

  try {
    await service.updateStatus(id, "classifying");

    const result = await classifier.classify(
      { id: item.id, title: item.title, description: item.description, source: item.source, status: item.status, orgId: item.orgId, createdBy: item.createdBy },
      context,
    );

    await service.saveClassification(id, {
      itemType: result.itemType,
      confidence: result.confidence,
      turn1Answer: result.turnAnswers.turn1,
      turn2Answer: result.turnAnswers.turn2,
      turn3Answer: result.turnAnswers.turn3,
      analysisWeights: result.analysisWeights,
    });

    await service.updateStatus(id, "classified");

    return c.json(result);
  } catch (e) {
    await service.updateStatus(id, "draft");
    if (e instanceof ClassificationError) {
      const status = e.code === "LLM_PARSE_ERROR" ? 502 : 500;
      return c.json({ error: e.code, message: e.message }, status);
    }
    throw e;
  }
});

// ─── POST /biz-items/:id/evaluate — 멀티 페르소나 평가 ───

bizItemsRoute.post("/biz-items/:id/evaluate", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  if (!item.classification) {
    return c.json({ error: "CLASSIFICATION_REQUIRED", message: "Item must be classified before evaluation" }, 400);
  }

  const runner = createAgentRunner(c.env);
  const evaluator = new BizPersonaEvaluator(runner, c.env.DB);

  try {
    await service.updateStatus(id, "evaluating");

    const result = await evaluator.evaluate(
      { id: item.id, title: item.title, description: item.description, source: item.source, status: item.status, orgId: item.orgId, createdBy: item.createdBy },
      { itemType: item.classification.itemType as "type_a" | "type_b" | "type_c", confidence: item.classification.confidence, analysisWeights: item.classification.analysisWeights },
    );

    const evalId = await service.saveEvaluation(id, {
      verdict: result.verdict,
      avgScore: result.avgScore,
      totalConcerns: result.totalConcerns,
    });

    await service.saveEvaluationScores(
      evalId,
      result.scores.map((s) => ({
        personaId: s.personaId,
        businessViability: s.businessViability,
        strategicFit: s.strategicFit,
        customerValue: s.customerValue,
        techMarket: s.techMarket,
        execution: s.execution,
        financialFeasibility: s.financialFeasibility,
        competitiveDiff: s.competitiveDiff,
        scalability: s.scalability,
        summary: s.summary,
        concerns: s.concerns,
      })),
    );

    await service.updateStatus(id, "evaluated");

    return c.json({
      id: evalId,
      bizItemId: id,
      verdict: result.verdict,
      avgScore: result.avgScore,
      totalConcerns: result.totalConcerns,
      scores: result.scores,
      warnings: result.warnings,
    });
  } catch (e) {
    await service.updateStatus(id, "classified");
    if (e instanceof EvaluationError) {
      return c.json({ error: e.code, message: e.message }, 502);
    }
    throw e;
  }
});

// ─── GET /biz-items/:id/evaluation — 평가 결과 조회 ───

bizItemsRoute.get("/biz-items/:id/evaluation", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  const evaluation = await service.getEvaluation(id);

  if (!evaluation) {
    return c.json({ error: "EVALUATION_NOT_FOUND" }, 404);
  }

  return c.json(evaluation);
});

// ─── POST /biz-items/:id/starting-point — 5시작점 분류 실행 (F182) ───

bizItemsRoute.post("/biz-items/:id/starting-point", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = ClassifyStartingPointSchema.safeParse(body);
  const context = parsed.success ? parsed.data.context : undefined;

  const runner = createAgentRunner(c.env);
  const classifier = new StartingPointClassifier(runner);

  try {
    const result = await classifier.classify(
      { title: item.title, description: item.description, source: item.source },
      context,
    );

    await service.saveStartingPoint(id, result);

    // Sprint 53: 시작점 분류 성공 시 9기준 자동 초기화
    try {
      const criteriaService = new DiscoveryCriteriaService(c.env.DB);
      await criteriaService.initialize(id);
    } catch {
      // biz_discovery_criteria 테이블 미존재 시 무시 (마이그레이션 미적용 환경)
    }

    return c.json({
      ...result,
      analysisPath: getAnalysisPath(result.startingPoint),
    });
  } catch (e) {
    if (e instanceof StartingPointError) {
      const status = e.code === "LLM_PARSE_ERROR" ? 502 : 500;
      return c.json({ error: e.code, message: e.message }, status);
    }
    throw e;
  }
});

// ─── PATCH /biz-items/:id/starting-point — 시작점 확인/수정 (F182) ───

bizItemsRoute.patch("/biz-items/:id/starting-point", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const existing = await service.getStartingPoint(id);
  if (!existing) return c.json({ error: "STARTING_POINT_NOT_CLASSIFIED" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = ConfirmStartingPointSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  await service.confirmStartingPoint(id, userId, parsed.data.startingPoint);

  const updated = await service.getStartingPoint(id);
  return c.json(updated);
});

// ─── GET /biz-items/:id/analysis-path — 분석 경로 조회 (F182) ───

bizItemsRoute.get("/biz-items/:id/analysis-path", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const sp = await service.getStartingPoint(id);
  if (!sp) return c.json({ error: "STARTING_POINT_NOT_CLASSIFIED" }, 404);

  const path = getAnalysisPath(sp.startingPoint as StartingPointType);
  return c.json({
    startingPoint: sp,
    analysisPath: path,
  });
});

// ─── GET /biz-items/:id/discovery-criteria — 9기준 체크리스트 조회 (F183) ───

bizItemsRoute.get("/biz-items/:id/discovery-criteria", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const service = new DiscoveryCriteriaService(c.env.DB);
  const progress = await service.getAll(id);

  return c.json(progress);
});

// ─── PATCH /biz-items/:id/discovery-criteria/:criterionId — 기준 상태 업데이트 (F183) ───

bizItemsRoute.patch("/biz-items/:id/discovery-criteria/:criterionId", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const criterionId = Number(c.req.param("criterionId"));

  if (isNaN(criterionId) || criterionId < 1 || criterionId > 9) {
    return c.json({ error: "INVALID_CRITERION_ID" }, 400);
  }

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const body = await c.req.json();
  const parsed = UpdateCriterionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const service = new DiscoveryCriteriaService(c.env.DB);
  const updated = await service.update(id, criterionId, parsed.data);

  return c.json(updated);
});

// ─── POST /biz-items/:id/analysis-context — 분석 컨텍스트 저장 (F184) ───

bizItemsRoute.post("/biz-items/:id/analysis-context", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const body = await c.req.json();
  const parsed = SaveAnalysisContextSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

  const service = new AnalysisContextService(c.env.DB);
  const ctx = await service.save(id, parsed.data);

  // discoveryMapping으로 9기준 자동 체크 제안
  const sp = await bizService.getStartingPoint(id);
  let suggestedCriteria: number[] = [];
  if (sp) {
    const path = getAnalysisPath(sp.startingPoint as StartingPointType);
    const step = path.steps.find(s => s.order === parsed.data.stepOrder);
    if (step) {
      const criteriaService = new DiscoveryCriteriaService(c.env.DB);
      const suggestions = await criteriaService.suggestFromStep(id, step.discoveryMapping);
      suggestedCriteria = suggestions.map(s => s.criterionId);
    }
  }

  return c.json({ ...ctx, suggestedCriteria }, 201);
});

// ─── GET /biz-items/:id/analysis-context — 분석 컨텍스트 조회 (F184) ───

bizItemsRoute.get("/biz-items/:id/analysis-context", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const service = new AnalysisContextService(c.env.DB);
  const contexts = await service.getAll(id);

  return c.json({ contexts });
});

// ─── GET /biz-items/:id/next-guide — 다음 단계 가이드 (F184) ───

bizItemsRoute.get("/biz-items/:id/next-guide", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const sp = await bizService.getStartingPoint(id);
  if (!sp) return c.json({ error: "STARTING_POINT_NOT_CLASSIFIED" }, 404);

  const path = getAnalysisPath(sp.startingPoint as StartingPointType);
  const ctxService = new AnalysisContextService(c.env.DB);
  const guide = await ctxService.getNextGuide(id, path);

  return c.json(guide);
});

// ─── POST /biz-items/:id/generate-prd — PRD 자동 생성 (F185) ───

bizItemsRoute.post("/biz-items/:id/generate-prd", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  // 게이트 확인
  const criteriaService = new DiscoveryCriteriaService(c.env.DB);
  const gate = await criteriaService.checkGate(id);
  if (gate.gateStatus === "blocked") {
    return c.json({
      error: "DISCOVERY_CRITERIA_NOT_MET",
      gateStatus: gate.gateStatus,
      completedCount: gate.completedCount,
      missingCriteria: gate.missingCriteria,
    }, 422);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = GeneratePrdSchema.safeParse(body);
  const skipLlm = parsed.success ? parsed.data.skipLlmRefine : false;

  const sp = await bizService.getStartingPoint(id);
  if (!sp) return c.json({ error: "STARTING_POINT_NOT_CLASSIFIED" }, 404);

  const criteria = await criteriaService.getAll(id);
  const ctxService = new AnalysisContextService(c.env.DB);
  const contexts = await ctxService.getAll(id);

  const runner = createAgentRunner(c.env);
  const prdService = new PrdGeneratorService(c.env.DB, runner);

  const prd = await prdService.generate({
    bizItemId: id,
    bizItem: { title: item.title, description: item.description, source: item.source },
    criteria: criteria.criteria,
    contexts,
    startingPoint: sp.startingPoint as StartingPointType,
    skipLlmRefine: skipLlm,
  });

  return c.json(prd, 201);
});

// ─── GET /biz-items/:id/prd — 최신 PRD 조회 (F185) ───

bizItemsRoute.get("/biz-items/:id/prd", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getLatest(id);
  if (!prd) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  return c.json(prd);
});

// ─── GET /biz-items/:id/prd/:version — PRD 특정 버전 조회 (F185) ───

bizItemsRoute.get("/biz-items/:id/prd/:version", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const version = Number(c.req.param("version"));

  if (isNaN(version) || version < 1) return c.json({ error: "INVALID_VERSION" }, 400);

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getByVersion(id, version);
  if (!prd) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  return c.json(prd);
});

// ─── POST /biz-items/:id/trend-report — 트렌드 분석 실행 (F190) ───

bizItemsRoute.post("/biz-items/:id/trend-report", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = TrendReportRequestSchema.safeParse(body);
  const forceRefresh = parsed.success ? parsed.data.forceRefresh : false;

  const runner = createAgentRunner(c.env);
  const trendService = new TrendDataService(runner, c.env.DB);

  try {
    // 캐시 히트 여부 확인 (forceRefresh가 아닌 경우)
    if (!forceRefresh) {
      const cached = await trendService.getReport(id);
      if (cached && new Date(cached.expiresAt) > new Date()) {
        return c.json(cached, 200);
      }
    }

    const report = await trendService.analyze(
      { id: item.id, title: item.title, description: item.description },
      { forceRefresh: true },
    );

    return c.json(report, 201);
  } catch (e) {
    if (e instanceof TrendAnalysisError) {
      return c.json({ error: e.code, message: e.message }, 502);
    }
    throw e;
  }
});

// ─── GET /biz-items/:id/trend-report — 트렌드 리포트 조회 (F190) ───

bizItemsRoute.get("/biz-items/:id/trend-report", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const report = await service.getTrendReport(id);
  if (!report) return c.json({ error: "TREND_REPORT_NOT_FOUND" }, 404);

  return c.json(report);
});

// ─── POST /biz-items/:id/competitor-scan — 경쟁사 스캔 (F190) ───

bizItemsRoute.post("/biz-items/:id/competitor-scan", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemService(c.env.DB);
  const item = await service.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const runner = createAgentRunner(c.env);
  const scanner = new CompetitorScanner(runner);

  try {
    const result = await scanner.scan(
      { title: item.title, description: item.description },
      item.classification ? { itemType: item.classification.itemType } : undefined,
    );

    return c.json(result);
  } catch (e) {
    if (e instanceof CompetitorScanError) {
      return c.json({ error: e.code, message: e.message }, 502);
    }
    throw e;
  }
});

// ─── POST /biz-items/:id/prd/:prdId/review — 다중 AI 검토 시작 (F186) ───

bizItemsRoute.post("/biz-items/:id/prd/:prdId/review", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const prdId = c.req.param("prdId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getLatest(id);
  if (!prd || prd.id !== prdId) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  const pipeline = new PrdReviewPipeline(c.env.DB, {
    OPENAI_API_KEY: c.env.OPENAI_API_KEY,
    GOOGLE_AI_API_KEY: c.env.GOOGLE_AI_API_KEY,
    DEEPSEEK_API_KEY: c.env.DEEPSEEK_API_KEY,
  });

  if (pipeline.availableProviderCount === 0) {
    return c.json({ error: "NO_REVIEW_PROVIDERS", message: "No AI API keys configured" }, 503);
  }

  try {
    const result = await pipeline.execute(prdId, id, prd.content, orgId);
    return c.json(result, 201);
  } catch (e) {
    if (e instanceof PipelineError) {
      return c.json({ error: e.code, message: e.message }, 502);
    }
    throw e;
  }
});

// ─── GET /biz-items/:id/prd/:prdId/reviews — 검토 결과 조회 (F186) ───

bizItemsRoute.get("/biz-items/:id/prd/:prdId/reviews", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const prdId = c.req.param("prdId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const pipeline = new PrdReviewPipeline(c.env.DB, {});
  const result = await pipeline.getReviews(prdId);

  if (result.reviews.length === 0) return c.json({ error: "REVIEWS_NOT_FOUND" }, 404);

  return c.json(result);
});

// ─── POST /biz-items/:id/prd/:prdId/persona-evaluate — PRD 페르소나 평가 (F187) ───

bizItemsRoute.post("/biz-items/:id/prd/:prdId/persona-evaluate", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const prdId = c.req.param("prdId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getLatest(id);
  if (!prd || prd.id !== prdId) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  const runner = createAgentRunner(c.env);
  const evaluator = new BizPersonaEvaluator(runner, c.env.DB);

  try {
    const result = await evaluator.evaluatePrd(
      { id: item.id, title: item.title, description: item.description, source: item.source, status: item.status, orgId: item.orgId, createdBy: item.createdBy },
      prd.content,
    );

    const verdictId = await savePrdPersonaEvaluations(c.env.DB, prdId, id, orgId, result);

    return c.json({
      verdictId,
      prdId,
      bizItemId: id,
      verdict: result.verdict,
      avgScore: result.avgScore,
      totalConcerns: result.totalConcerns,
      scores: result.scores,
      warnings: result.warnings,
    }, 201);
  } catch (e) {
    if (e instanceof EvaluationError) {
      return c.json({ error: e.code, message: e.message }, 502);
    }
    throw e;
  }
});

// ─── GET /biz-items/:id/prd/:prdId/persona-evaluations — 페르소나 평가 결과 조회 (F187) ───

bizItemsRoute.get("/biz-items/:id/prd/:prdId/persona-evaluations", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const prdId = c.req.param("prdId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const result = await getPrdPersonaEvaluations(c.env.DB, prdId);

  if (result.evaluations.length === 0) return c.json({ error: "PERSONA_EVALUATIONS_NOT_FOUND" }, 404);

  return c.json(result);
});

// ─── POST /biz-items/:id/prd/:prdId/sixhats — Six Hats 토론 시작 (F188) ───

bizItemsRoute.post("/biz-items/:id/prd/:prdId/sixhats", async (c) => {
  const { id, prdId } = c.req.param();
  const orgId = c.get("orgId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const prd = await c.env.DB.prepare(
    "SELECT content FROM biz_generated_prds WHERE id = ? AND biz_item_id = ?"
  ).bind(prdId, id).first<{ content: string }>();
  if (!prd) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  const service = new SixHatsDebateService(c.env.DB, c.env);
  try {
    const result = await service.startDebate(prdId, id, prd.content, orgId);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof SixHatsDebateError) {
      return c.json({ error: err.code, message: err.message }, 500);
    }
    throw err;
  }
});

// ─── GET /biz-items/:id/prd/:prdId/sixhats — 토론 목록 조회 (F188) ───

bizItemsRoute.get("/biz-items/:id/prd/:prdId/sixhats", async (c) => {
  const { prdId } = c.req.param();
  const service = new SixHatsDebateService(c.env.DB, c.env);
  const debates = await service.listDebates(prdId);
  return c.json({ debates });
});

// ─── GET /biz-items/:id/prd/:prdId/sixhats/:debateId — 특정 토론 상세 (F188) ───

bizItemsRoute.get("/biz-items/:id/prd/:prdId/sixhats/:debateId", async (c) => {
  const { debateId } = c.req.param();
  const service = new SixHatsDebateService(c.env.DB, c.env);
  const debate = await service.getDebate(debateId);
  if (!debate) return c.json({ error: "DEBATE_NOT_FOUND" }, 404);
  return c.json(debate);
});
