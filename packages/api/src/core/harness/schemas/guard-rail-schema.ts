// ─── F357+F358: Guard Rail Zod Schemas (Sprint 161, Phase 17) ───

import { z } from "@hono/zod-openapi";

// GET /guard-rail/diagnostic
export const DiagnosticResultSchema = z.object({
  totalEvents: z.number(),
  totalFailedTransitions: z.number(),
  earliestEvent: z.string().nullable(),
  latestEvent: z.string().nullable(),
  dataCoverageDays: z.number(),
  sourceDistribution: z.record(z.number()),
  severityDistribution: z.record(z.number()),
  failedTransitionsBySource: z.record(z.number()),
  isDataSufficient: z.boolean(),
});

// POST /guard-rail/detect
export const DetectRequestSchema = z.object({
  minOccurrences: z.number().min(1).optional().default(3),
  sinceDays: z.number().min(1).optional().default(30),
});

export const FailurePatternSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patternKey: z.string(),
  occurrenceCount: z.number(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  sampleEventIds: z.array(z.string()),
  samplePayloads: z.array(z.unknown()),
  status: z.enum(["detected", "proposed", "resolved"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DetectResultSchema = z.object({
  patternsFound: z.number(),
  patternsNew: z.number(),
  patternsUpdated: z.number(),
  patterns: z.array(FailurePatternSchema),
});

// GET /guard-rail/proposals
export const ProposalSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patternId: z.string(),
  ruleContent: z.string(),
  ruleFilename: z.string(),
  rationale: z.string(),
  llmModel: z.string(),
  status: z.enum(["pending", "approved", "rejected", "modified"]),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const ProposalListSchema = z.object({
  items: z.array(ProposalSchema),
  total: z.number(),
});

// PATCH /guard-rail/proposals/:id
export const ProposalUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "modified"]),
  ruleContent: z.string().optional(),
  reviewedBy: z.string().optional(),
});

// POST /guard-rail/generate
export const GenerateResultSchema = z.object({
  proposalsCreated: z.number(),
  proposals: z.array(ProposalSchema),
});

// POST /guard-rail/proposals/:id/deploy — F359
export const DeployResultSchema = z.object({
  filename: z.string(),
  content: z.string(),
  proposalId: z.string(),
  patternId: z.string(),
});
