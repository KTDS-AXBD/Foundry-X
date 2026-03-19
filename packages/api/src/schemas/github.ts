import { z } from "@hono/zod-openapi";

export const prNumberParamsSchema = z.object({
  prNumber: z.coerce.number().int().positive(),
});

export const externalReviewResultSchema = z.object({
  prNumber: z.number(),
  decision: z.enum(["approve", "request_changes", "comment"]),
  summary: z.string(),
  sddScore: z.number(),
  qualityScore: z.number(),
  securityIssues: z.array(z.string()),
  comments: z.array(z.object({
    file: z.string(),
    line: z.number(),
    comment: z.string(),
    severity: z.enum(["error", "warning", "info"]),
  })),
  labels: z.array(z.string()),
  reviewedAt: z.string(),
});
