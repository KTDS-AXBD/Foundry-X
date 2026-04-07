// ─── F353: Prototype Job Zod 스키마 (Sprint 159) ───

import { z } from "@hono/zod-openapi";

export const JOB_STATUSES = [
  "queued", "building", "deploying", "live",
  "failed", "deploy_failed", "dead_letter", "feedback_pending",
] as const;

export const BUILDER_TYPES = ["cli", "api", "ensemble"] as const;

const JobStatusEnum = z.enum(JOB_STATUSES);
const BuilderTypeEnum = z.enum(BUILDER_TYPES);

// ─── 요청 스키마 ───

export const CreatePrototypeJobSchema = z.object({
  prdContent: z.string().min(10),
  prdTitle: z.string().min(1).max(200),
}).openapi("CreatePrototypeJob");

export const UpdatePrototypeJobSchema = z.object({
  status: JobStatusEnum.optional(),
  buildLog: z.string().optional(),
  pagesProject: z.string().optional(),
  pagesUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
  costInputTokens: z.number().int().min(0).optional(),
  costOutputTokens: z.number().int().min(0).optional(),
  costUsd: z.number().min(0).optional(),
  modelUsed: z.string().optional(),
  fallbackUsed: z.boolean().optional(),
}).openapi("UpdatePrototypeJob");

// ─── 응답 스키마 ───

export const PrototypeJobSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  prdTitle: z.string(),
  status: JobStatusEnum,
  builderType: BuilderTypeEnum,
  pagesUrl: z.string().nullable(),
  costUsd: z.number(),
  modelUsed: z.string(),
  fallbackUsed: z.boolean(),
  retryCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
}).openapi("PrototypeJob");

export const PrototypeJobListSchema = z.object({
  items: z.array(PrototypeJobSchema),
  total: z.number(),
}).openapi("PrototypeJobList");

export const PrototypeJobDetailSchema = PrototypeJobSchema.extend({
  prdContent: z.string(),
  buildLog: z.string(),
  errorMessage: z.string().nullable(),
}).openapi("PrototypeJobDetail");
