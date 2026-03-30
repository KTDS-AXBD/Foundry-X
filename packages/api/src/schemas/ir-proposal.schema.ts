import { z } from "zod";

export const IR_CATEGORIES = ["technology", "market", "process", "partnership", "other"] as const;
export const IR_STATUSES = ["submitted", "under_review", "approved", "rejected"] as const;
export type IrProposalStatus = (typeof IR_STATUSES)[number];

export const CreateIrProposalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum(IR_CATEGORIES),
  rationale: z.string().max(2000).optional(),
  expectedImpact: z.string().max(2000).optional(),
});

export const ReviewIrProposalSchema = z.object({
  comment: z.string().max(2000).optional(),
});

export const IrProposalFilterSchema = z.object({
  status: z.enum(IR_STATUSES).optional(),
  category: z.enum(IR_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
