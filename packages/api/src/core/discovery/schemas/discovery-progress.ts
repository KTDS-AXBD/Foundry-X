/**
 * Sprint 56: Discovery 진행률 대시보드 Zod 스키마 (F189)
 */
import { z } from "zod";

export const CriterionStatSchema = z.object({
  criterionId: z.number().int().min(1).max(9),
  name: z.string(),
  completed: z.number().int().min(0),
  inProgress: z.number().int().min(0),
  needsRevision: z.number().int().min(0),
  pending: z.number().int().min(0),
  completionRate: z.number().min(0).max(100),
});

export const ItemProgressSchema = z.object({
  bizItemId: z.string(),
  title: z.string(),
  completedCount: z.number().int().min(0).max(9),
  gateStatus: z.enum(["blocked", "warning", "ready"]),
  criteria: z.array(z.object({
    criterionId: z.number().int(),
    status: z.enum(["pending", "in_progress", "completed", "needs_revision"]),
  })),
});

export const DiscoveryProgressSchema = z.object({
  totalItems: z.number().int(),
  byGateStatus: z.object({
    blocked: z.number().int(),
    warning: z.number().int(),
    ready: z.number().int(),
  }),
  byCriterion: z.array(CriterionStatSchema),
  items: z.array(ItemProgressSchema),
  bottleneck: z.object({
    criterionId: z.number().int(),
    name: z.string(),
    completionRate: z.number(),
  }).nullable(),
});

export const DiscoverySummarySchema = z.object({
  totalItems: z.number().int(),
  readyCount: z.number().int(),
  warningCount: z.number().int(),
  blockedCount: z.number().int(),
  overallCompletionRate: z.number().min(0).max(100),
  bottleneckCriterion: z.string().nullable(),
});
