import { z } from "zod";

// ── Create Run ──
export const createShapingRunSchema = z.object({
  discoveryPrdId: z.string().min(1),
  mode: z.enum(["hitl", "auto"]).default("hitl"),
  gitPath: z.string().max(500).optional(),
  maxIterations: z.number().int().min(1).max(10).optional().default(3),
  tokenLimit: z.number().int().min(10000).max(2000000).optional().default(500000),
});

export type CreateShapingRunInput = z.infer<typeof createShapingRunSchema>;

// ── Update Run ──
export const updateShapingRunSchema = z.object({
  status: z.enum(["running", "completed", "failed", "escalated"]).optional(),
  currentPhase: z.enum(["A", "B", "C", "D", "E", "F"]).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  tokenCost: z.number().int().min(0).optional(),
  gitPath: z.string().max(500).optional(),
});

export type UpdateShapingRunInput = z.infer<typeof updateShapingRunSchema>;

// ── List Runs Query ──
export const listShapingRunsQuerySchema = z.object({
  status: z.enum(["running", "completed", "failed", "escalated"]).optional(),
  mode: z.enum(["hitl", "auto"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListShapingRunsQuery = z.infer<typeof listShapingRunsQuerySchema>;

// ── Phase Log ──
export const createPhaseLogSchema = z.object({
  phase: z.enum(["A", "B", "C", "D", "E", "F"]),
  round: z.number().int().min(0).default(0),
  inputSnapshot: z.string().max(50000).optional(),
  outputSnapshot: z.string().max(50000).optional(),
  verdict: z.enum(["PASS", "MINOR_FIX", "MAJOR_ISSUE", "ESCALATED"]).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  findings: z.string().max(50000).optional(),
  durationMs: z.number().int().min(0).optional(),
});

export type CreatePhaseLogInput = z.infer<typeof createPhaseLogSchema>;

// ── Expert Review ──
export const createExpertReviewSchema = z.object({
  expertRole: z.enum(["TA", "AA", "CA", "DA", "QA"]),
  reviewBody: z.string().min(1).max(100000),
  findings: z.string().max(50000).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
});

export type CreateExpertReviewInput = z.infer<typeof createExpertReviewSchema>;

// ── Six Hats ──
export const createSixHatsSchema = z.object({
  hatColor: z.enum(["white", "red", "black", "yellow", "green", "blue"]),
  round: z.number().int().min(1),
  opinion: z.string().min(1).max(50000),
  verdict: z.enum(["accept", "concern", "reject"]).optional(),
});

export type CreateSixHatsInput = z.infer<typeof createSixHatsSchema>;

// ── HITL Review ──
export const reviewSectionSchema = z.object({
  action: z.enum(["approved", "revision_requested", "rejected"]),
  section: z.string().min(1).max(200),
  comment: z.string().max(5000).optional(),
});

export type ReviewSectionInput = z.infer<typeof reviewSectionSchema>;
