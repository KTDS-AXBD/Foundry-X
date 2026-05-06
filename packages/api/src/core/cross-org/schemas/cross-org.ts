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
