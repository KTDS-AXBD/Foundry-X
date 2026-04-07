import { z } from "zod";

export const extractPatternsSchema = z.object({
  pipelineStage: z
    .enum(["collection", "discovery", "shaping", "validation", "productization", "gtm"])
    .optional(),
  discoveryStage: z.string().regex(/^2-\d{1,2}$/).optional(),
  minSampleCount: z.number().int().min(1).max(100).optional().default(5),
  minSuccessRate: z.number().min(0).max(1).optional().default(0.7),
  includeChains: z.boolean().optional().default(true),
});

export const listPatternsQuerySchema = z.object({
  pipelineStage: z
    .enum(["collection", "discovery", "shaping", "validation", "productization", "gtm"])
    .optional(),
  status: z.enum(["active", "consumed", "expired"]).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const generateCandidateSchema = z.object({
  patternId: z.string().min(1),
  nameOverride: z.string().max(200).optional(),
  categoryOverride: z
    .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
    .optional(),
});

export const listCandidatesQuerySchema = z.object({
  reviewStatus: z.enum(["pending", "approved", "rejected", "revision_requested"]).optional(),
  category: z
    .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const reviewCandidateSchema = z.object({
  action: z.enum(["approved", "rejected", "revision_requested"]),
  comment: z.string().max(2000).optional(),
  modifiedPrompt: z.string().max(50000).optional(),
});

export type ExtractPatternsInput = z.infer<typeof extractPatternsSchema>;
export type ListPatternsQuery = z.infer<typeof listPatternsQuerySchema>;
export type GenerateCandidateInput = z.infer<typeof generateCandidateSchema>;
export type ListCandidatesQuery = z.infer<typeof listCandidatesQuerySchema>;
export type ReviewCandidateInput = z.infer<typeof reviewCandidateSchema>;
