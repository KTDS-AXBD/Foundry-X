import { z } from "@hono/zod-openapi";

export const NpsSurveyCheckResponseSchema = z
  .object({
    shouldShow: z.boolean(),
    surveyId: z.string().nullable(),
  })
  .openapi("NpsSurveyCheckResponse");

export const NpsDismissRequestSchema = z
  .object({
    surveyId: z.string(),
  })
  .openapi("NpsDismissRequest");

export const NpsWeeklyTrendItemSchema = z
  .object({
    week: z.string(),
    avgNps: z.number(),
    count: z.number(),
  })
  .openapi("NpsWeeklyTrendItem");

export const NpsOrgSummaryResponseSchema = z
  .object({
    averageNps: z.number(),
    totalResponses: z.number(),
    responseRate: z.number(),
    weeklyTrend: z.array(NpsWeeklyTrendItemSchema),
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
  .openapi("NpsOrgSummaryResponse");
