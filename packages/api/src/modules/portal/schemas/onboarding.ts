import { z } from "@hono/zod-openapi";

export const OnboardingProgressResponseSchema = z
  .object({
    userId: z.string(),
    completedSteps: z.array(z.string()),
    totalSteps: z.number(),
    progressPercent: z.number(),
    steps: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        completed: z.boolean(),
        completedAt: z.string().nullable(),
      }),
    ),
  })
  .openapi("OnboardingProgressResponse");

export const OnboardingStepCompleteRequestSchema = z
  .object({
    stepId: z.string(),
    completed: z.boolean().default(true),
  })
  .openapi("OnboardingStepCompleteRequest");

export const OnboardingStepCompleteResponseSchema = z
  .object({
    success: z.boolean(),
    stepId: z.string(),
    progressPercent: z.number(),
    allComplete: z.boolean(),
  })
  .openapi("OnboardingStepCompleteResponse");
