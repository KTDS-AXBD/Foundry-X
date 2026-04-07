/**
 * Sprint 53: Discovery 9기준 Zod 스키마 (F183)
 */

import { z } from "@hono/zod-openapi";

export const criterionStatusEnum = z.enum(["pending", "in_progress", "completed", "needs_revision"]);

export const UpdateCriterionSchema = z.object({
  status: criterionStatusEnum,
  evidence: z.string().max(5000).optional(),
}).openapi("UpdateCriterion");

export const CriterionResponseSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  criterionId: z.number().int().min(1).max(9),
  name: z.string(),
  condition: z.string(),
  status: criterionStatusEnum,
  evidence: z.string().nullable(),
  completedAt: z.string().nullable(),
  updatedAt: z.string(),
}).openapi("CriterionResponse");

export const CriteriaProgressSchema = z.object({
  total: z.literal(9),
  completed: z.number().int(),
  inProgress: z.number().int(),
  needsRevision: z.number().int(),
  pending: z.number().int(),
  criteria: z.array(CriterionResponseSchema),
  gateStatus: z.enum(["blocked", "warning", "ready"]),
}).openapi("CriteriaProgress");
