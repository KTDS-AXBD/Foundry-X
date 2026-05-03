import { z } from "zod";

export const extractWorkflowPatternsSchema = z.object({
  pipelineStage: z
    .enum(["collection", "discovery", "shaping", "validation", "productization", "gtm"])
    .optional(),
  methodologyId: z.string().optional(),
  minSampleCount: z.number().int().min(1).max(100).optional().default(3),
  minSuccessRate: z.number().min(0).max(1).optional().default(0.7),
});

export type ExtractWorkflowPatternsInput = z.infer<typeof extractWorkflowPatternsSchema>;

export const listWorkflowPatternsQuerySchema = z.object({
  pipelineStage: z
    .enum(["collection", "discovery", "shaping", "validation", "productization", "gtm"])
    .optional(),
  methodologyId: z.string().optional(),
  status: z.enum(["active", "consumed", "expired"]).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListWorkflowPatternsQuery = z.infer<typeof listWorkflowPatternsQuerySchema>;

export const generateCapturedCandidateSchema = z.object({
  patternId: z.string().min(1),
  nameOverride: z.string().max(200).optional(),
  categoryOverride: z
    .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
    .optional(),
});

export type GenerateCapturedCandidateInput = z.infer<typeof generateCapturedCandidateSchema>;

export const listCapturedCandidatesQuerySchema = z.object({
  reviewStatus: z.enum(["pending", "approved", "rejected", "revision_requested"]).optional(),
  category: z
    .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListCapturedCandidatesQuery = z.infer<typeof listCapturedCandidatesQuerySchema>;

export const reviewCapturedCandidateSchema = z.object({
  action: z.enum(["approved", "rejected", "revision_requested"]),
  comment: z.string().max(2000).optional(),
  modifiedPrompt: z.string().max(50000).optional(),
});

export type ReviewCapturedCandidateInput = z.infer<typeof reviewCapturedCandidateSchema>;
