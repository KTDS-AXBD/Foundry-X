/**
 * Sprint 60: pm-skills Zod 스키마 (F193+F194)
 */

import { z } from "@hono/zod-openapi";

export const PmSkillsCriterionSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  criterionId: z.number().int(),
  name: z.string(),
  skill: z.string(),
  condition: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "needs_revision"]),
  evidence: z.string().nullable(),
  outputType: z.string(),
  score: z.number().nullable(),
  completedAt: z.string().nullable(),
  updatedAt: z.string(),
}).openapi("PmSkillsCriterion");

export const UpdatePmSkillsCriterionSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "needs_revision"]),
  evidence: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
}).openapi("UpdatePmSkillsCriterion");

export const PmSkillsClassificationSchema = z.object({
  methodologyId: z.string(),
  entryPoint: z.enum(["discovery", "validation", "expansion"]),
  confidence: z.number(),
  reasoning: z.string(),
  metadata: z.record(z.unknown()),
}).openapi("PmSkillsClassification");

export const PmSkillsAnalysisStepSchema = z.object({
  order: z.number().int(),
  skill: z.string(),
  name: z.string(),
  purpose: z.string(),
  dependencies: z.array(z.string()),
  criteriaMapping: z.array(z.number().int()),
  isCompleted: z.boolean(),
}).openapi("PmSkillsAnalysisStep");
