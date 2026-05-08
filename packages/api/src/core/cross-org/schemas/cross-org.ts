// F603: Cross-Org zod 스키마
import { z } from "zod";
import { CROSS_ORG_GROUPS, ASSET_KINDS, EXPORT_BLOCK_REASONS } from "../types.js";

export const CrossOrgGroupSchema = z.enum(CROSS_ORG_GROUPS);
export const AssetKindSchema = z.enum(ASSET_KINDS);
export const ExportBlockReasonSchema = z.enum(EXPORT_BLOCK_REASONS);

export const AssignGroupSchema = z.object({
  assetId: z.string().min(1),
  assetKind: AssetKindSchema,
  orgId: z.string().min(1),
  groupType: CrossOrgGroupSchema,
  signals: z
    .object({
      commonality: z.number().min(0).max(1).optional(),
      variance: z.number().min(0).max(1).optional(),
      documentationRate: z.number().min(0).max(1).optional(),
      businessImpact: z.enum(["low", "medium", "high"]).optional(),
    })
    .optional(),
  assignedBy: z.enum(["auto", "sme", "manual"]).default("manual"),
});

export const CheckExportSchema = z.object({
  assetId: z.string().min(1),
  attemptedAction: z.string().optional(),
  traceId: z.string().optional(),
});

export const GroupAssignmentResponseSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  assetKind: AssetKindSchema,
  orgId: z.string(),
  groupType: CrossOrgGroupSchema,
  commonality: z.number().nullable(),
  variance: z.number().nullable(),
  documentationRate: z.number().nullable(),
  businessImpact: z.enum(["low", "medium", "high"]).nullable(),
  assignedBy: z.enum(["auto", "sme", "manual"]),
  assignedAt: z.number(),
});

export const ExportCheckResponseSchema = z.object({
  allowed: z.boolean(),
  groupType: CrossOrgGroupSchema.nullable(),
  reason: ExportBlockReasonSchema.nullable(),
  blockId: z.string().nullable(),
});

// F626: 차단율 측정
export const BlockingRateQuerySchema = z.object({
  org_id: z.string().min(1),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const BlockingRateResponseSchema = z.object({
  orgId: z.string(),
  windowDays: z.number(),
  totalCoreDiffAssets: z.number(),
  totalExportAttempts: z.number(),
  blockedCount: z.number(),
  blockingRate: z.number().min(0).max(1),
  threshold: z.number(),
  passed: z.boolean(),
  measuredAt: z.number(),
});

// F620 CO-I01 PolicyEmbedder
export const EmbedPolicySchema = z.object({
  text: z.string().min(1),
  orgId: z.string().min(1),
  sourceKind: z.enum(["policy", "ontology", "skill", "system_knowledge"]).optional(),
});

export const FindSimilarSchema = z.object({
  text: z.string().min(1),
  orgId: z.string().min(1),
  threshold: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

// F620 CO-I04 ExpertReviewManager
export const ReviewStatusSchema = z.enum(["pending", "in_review", "signed_off"]);
export const ReviewDecisionSchema = z.enum(["approve", "reject", "reclassify"]);

export const EnqueueReviewSchema = z.object({
  assignmentId: z.string().min(1),
  orgId: z.string().min(1),
});

export const SignOffReviewSchema = z.object({
  reviewId: z.string().min(1),
  expertId: z.string().min(1),
  decision: ReviewDecisionSchema,
  reclassifiedTo: z.string().optional(),
  notes: z.string().optional(),
});

// F620 CO-I07 LaunchBlockingSignal
export const NotifyLaunchSchema = z.object({
  blockId: z.string().min(1),
  releaseId: z.string().min(1),
  assetId: z.string().min(1),
  orgId: z.string().min(1),
});
