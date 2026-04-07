import { z } from "@hono/zod-openapi";

export const PrdReviewResponseSchema = z.object({
  reviews: z.array(z.object({
    provider: z.string(),
    response: z.object({
      sections: z.array(z.object({
        name: z.string(),
        score: z.number().int().min(1).max(10),
        grade: z.enum(["충실", "적정", "최소", "미흡"]),
        feedback: z.string(),
      })),
      overallScore: z.number().int().min(0).max(100),
      verdict: z.enum(["go", "conditional", "reject"]),
      summary: z.string(),
      improvements: z.array(z.string()),
    }),
  })),
  scorecard: z.object({
    totalScore: z.number().int().min(0).max(100),
    verdict: z.enum(["go", "conditional", "reject"]),
    providerCount: z.number().int(),
    providerVerdicts: z.array(z.object({
      name: z.string(),
      verdict: z.string(),
      score: z.number(),
    })),
    sectionAverages: z.array(z.object({
      name: z.string(),
      avgScore: z.number(),
      avgGrade: z.string(),
    })),
  }),
  failures: z.array(z.string()),
}).openapi("PrdReviewResponse");
