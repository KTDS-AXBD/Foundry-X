/**
 * Sprint 223: F459 포트폴리오 연결 구조 검색 스키마
 */
import { z } from "zod";

export const PortfolioClassificationSchema = z
  .object({
    itemType: z.string(),
    confidence: z.number(),
    classifiedAt: z.string(),
  })
  .nullable();

export const PortfolioEvaluationScoreSchema = z.object({
  personaId: z.string(),
  businessViability: z.number(),
  strategicFit: z.number(),
  customerValue: z.number(),
  summary: z.string().nullable(),
});

export const PortfolioEvaluationSchema = z.object({
  id: z.string(),
  verdict: z.string(),
  avgScore: z.number(),
  totalConcerns: z.number(),
  evaluatedAt: z.string(),
  scores: z.array(PortfolioEvaluationScoreSchema),
});

export const PortfolioStartingPointSchema = z
  .object({
    startingPoint: z.enum(["idea", "market", "problem", "tech", "service"]),
    confidence: z.number(),
    reasoning: z.string().nullable(),
  })
  .nullable();

export const PortfolioCriterionSchema = z.object({
  criterionId: z.number(),
  status: z.enum(["pending", "in_progress", "completed", "needs_revision"]),
  evidence: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const PortfolioBusinessPlanSchema = z.object({
  id: z.string(),
  version: z.number(),
  modelUsed: z.string().nullable(),
  generatedAt: z.string(),
});

export const PortfolioOfferingSchema = z.object({
  id: z.string(),
  title: z.string(),
  purpose: z.enum(["report", "proposal", "review"]),
  format: z.enum(["html", "pptx"]),
  status: z.string(),
  currentVersion: z.number(),
  sectionsCount: z.number(),
  versionsCount: z.number(),
  linkedPrototypeIds: z.array(z.string()),
});

export const PortfolioPrototypeSchema = z.object({
  id: z.string(),
  version: z.number(),
  format: z.string(),
  templateUsed: z.string().nullable(),
  generatedAt: z.string(),
});

export const PortfolioPipelineStageSchema = z.object({
  stage: z.string(),
  enteredAt: z.string(),
  exitedAt: z.string().nullable(),
  notes: z.string().nullable(),
});

export const PortfolioProgressSchema = z.object({
  currentStage: z.string(),
  completedStages: z.array(z.string()),
  criteriaCompleted: z.number(),
  criteriaTotal: z.number(),
  hasBusinessPlan: z.boolean(),
  hasOffering: z.boolean(),
  hasPrototype: z.boolean(),
  overallPercent: z.number(),
});

export const PortfolioTreeSchema = z.object({
  item: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    source: z.string(),
    status: z.string(),
    createdAt: z.string(),
  }),
  classification: PortfolioClassificationSchema,
  evaluations: z.array(PortfolioEvaluationSchema),
  startingPoint: PortfolioStartingPointSchema,
  criteria: z.array(PortfolioCriterionSchema),
  businessPlans: z.array(PortfolioBusinessPlanSchema),
  offerings: z.array(PortfolioOfferingSchema),
  prototypes: z.array(PortfolioPrototypeSchema),
  pipelineStages: z.array(PortfolioPipelineStageSchema),
  progress: PortfolioProgressSchema,
});

export type PortfolioTree = z.infer<typeof PortfolioTreeSchema>;
export type PortfolioProgress = z.infer<typeof PortfolioProgressSchema>;
export type PortfolioOffering = z.infer<typeof PortfolioOfferingSchema>;
export type PortfolioEvaluation = z.infer<typeof PortfolioEvaluationSchema>;

// ─── Sprint 224: F459+F460 Gap 보강 스키마 ───

export const PortfolioListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  currentStage: z.string(),
  hasEvaluation: z.boolean(),
  prdCount: z.number(),
  offeringCount: z.number(),
  prototypeCount: z.number(),
  overallPercent: z.number(),
  createdAt: z.string(),
});

export const PortfolioListResponseSchema = z.object({
  items: z.array(PortfolioListItemSchema),
  total: z.number(),
});

export const ArtifactLookupItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  currentStage: z.string(),
});

export const ArtifactLookupResponseSchema = z.object({
  artifactType: z.enum(["prd", "offering", "prototype"]),
  artifactId: z.string(),
  bizItems: z.array(ArtifactLookupItemSchema),
});

export type PortfolioListItem = z.infer<typeof PortfolioListItemSchema>;
export type PortfolioListResponse = z.infer<typeof PortfolioListResponseSchema>;
export type ArtifactLookupResponse = z.infer<typeof ArtifactLookupResponseSchema>;
