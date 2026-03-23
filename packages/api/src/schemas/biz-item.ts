import { z } from "@hono/zod-openapi";

// --- 공통 열거형 ---
export const bizItemSource = z.enum(["agent", "field", "idea_portal"]);
export const bizItemStatus = z.enum([
  "draft", "classifying", "classified", "evaluating", "evaluated", "archived",
]);
export const bizItemType = z.enum(["type_a", "type_b", "type_c"]);
export const evaluationVerdict = z.enum(["green", "keep", "red"]);
export const personaId = z.enum([
  "strategy", "sales", "ap_biz", "ai_tech",
  "finance", "security", "partnership", "product",
]);

// --- 요청 스키마 ---
export const CreateBizItemSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    source: bizItemSource.default("field"),
  })
  .openapi("CreateBizItem");

export const ClassifyBizItemSchema = z
  .object({
    context: z.string().max(3000).optional(),
  })
  .openapi("ClassifyBizItem");

export const EvaluateBizItemSchema = z
  .object({
    models: z.array(z.string()).max(3).optional(),
  })
  .openapi("EvaluateBizItem");

// --- 응답 스키마 ---
export const BizItemSchema = z
  .object({
    id: z.string(),
    orgId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    source: bizItemSource,
    status: bizItemStatus,
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    classification: z
      .object({
        itemType: bizItemType,
        confidence: z.number(),
        analysisWeights: z.record(z.number()),
        classifiedAt: z.string(),
      })
      .nullable(),
  })
  .openapi("BizItem");

export const ClassificationResultSchema = z
  .object({
    itemType: bizItemType,
    confidence: z.number().min(0).max(1),
    turnAnswers: z.object({
      turn1: z.string(),
      turn2: z.string(),
      turn3: z.string(),
    }),
    analysisWeights: z.record(z.number()),
    reasoning: z.string(),
  })
  .openapi("ClassificationResult");

export const BizEvaluationScoreSchema = z
  .object({
    personaId: personaId,
    personaName: z.string(),
    businessViability: z.number().min(1).max(10),
    strategicFit: z.number().min(1).max(10),
    customerValue: z.number().min(1).max(10),
    techMarket: z.number().min(1).max(10),
    execution: z.number().min(1).max(10),
    financialFeasibility: z.number().min(1).max(10),
    competitiveDiff: z.number().min(1).max(10),
    scalability: z.number().min(1).max(10),
    summary: z.string(),
    concerns: z.array(z.string()),
  })
  .openapi("BizEvaluationScore");

export const EvaluationResultSchema = z
  .object({
    id: z.string(),
    bizItemId: z.string(),
    verdict: evaluationVerdict,
    avgScore: z.number(),
    totalConcerns: z.number(),
    scores: z.array(BizEvaluationScoreSchema),
    evaluatedAt: z.string(),
  })
  .openapi("EvaluationResult");
