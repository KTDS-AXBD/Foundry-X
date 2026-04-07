/**
 * Sprint 67: F209 — PoC 환경 + 기술 검증 Zod 스키마
 */
import { z } from "@hono/zod-openapi";

export const PocEnvProvisionSchema = z.object({
  config: z.record(z.unknown()).optional(),
}).openapi("PocEnvProvisionRequest");

export const PocEnvStatusEnum = z.enum([
  "pending", "provisioning", "ready", "teardown", "terminated", "failed",
]);

export const PocEnvResponseSchema = z.object({
  id: z.string(),
  prototypeId: z.string(),
  status: PocEnvStatusEnum,
  config: z.record(z.unknown()),
  provisionedAt: z.string().nullable(),
  terminatedAt: z.string().nullable(),
  createdAt: z.string(),
}).openapi("PocEnvResponse");

export const TechReviewResponseSchema = z.object({
  id: z.string(),
  prototypeId: z.string(),
  feasibility: z.enum(["high", "medium", "low"]),
  stackFit: z.number().min(0).max(100),
  complexity: z.enum(["low", "medium", "high"]),
  risks: z.array(z.string()),
  recommendation: z.enum(["proceed", "modify", "reject"]),
  estimatedEffort: z.string(),
  reviewedAt: z.string(),
  createdAt: z.string(),
}).openapi("TechReviewResponse");

export const PrototypeListItemSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number(),
  format: z.string(),
  templateUsed: z.string().nullable(),
  generatedAt: z.string(),
}).openapi("PrototypeListItem");

export const PrototypeListResponseSchema = z.object({
  items: z.array(PrototypeListItemSchema),
  total: z.number(),
}).openapi("PrototypeListResponse");

export const PrototypeDetailSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number(),
  format: z.string(),
  content: z.string(),
  templateUsed: z.string().nullable(),
  modelUsed: z.string().nullable(),
  tokensUsed: z.number(),
  generatedAt: z.string(),
  pocEnv: PocEnvResponseSchema.nullable(),
  techReview: TechReviewResponseSchema.nullable(),
}).openapi("PrototypeDetail");
