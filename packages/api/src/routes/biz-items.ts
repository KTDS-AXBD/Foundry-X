/**
 * Sprint 51: BizItems Routes — 사업 아이템 CRUD + 분류 + 평가 (F175, F178)
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
