import { z } from "@hono/zod-openapi";

export const FeedbackSubmitRequestSchema = z
  .object({
    npsScore: z.number().int().min(1).max(10),
    comment: z.string().max(1000).optional(),
    pagePath: z.string().max(200).optional(),
    sessionSeconds: z.number().int().min(0).optional(),
    feedbackType: z.enum(["nps", "feature", "bug", "general"]).default("nps"),
  })
  .openapi("FeedbackSubmitRequest");

export const FeedbackSubmitResponseSchema = z
  .object({
    success: z.boolean(),
    id: z.string(),
    npsScore: z.number(),
  })
  .openapi("FeedbackSubmitResponse");

export const FeedbackSummaryResponseSchema = z
  .object({
    averageNps: z.number(),
    totalResponses: z.number(),
    recentFeedback: z.array(
      z.object({
        id: z.string(),
        userId: z.string(),
        npsScore: z.number(),
        comment: z.string().nullable(),
        createdAt: z.string(),
      }),
    ),
  })
  .openapi("FeedbackSummaryResponse");
