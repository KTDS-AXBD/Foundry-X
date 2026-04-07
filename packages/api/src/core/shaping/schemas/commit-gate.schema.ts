import { z } from "@hono/zod-openapi";

export const commitGateDecisionEnum = z.enum(["commit", "explore_alternatives", "drop"]);

export const CreateCommitGateSchema = z
  .object({
    bizItemId: z.string().min(1),
    question1Answer: z.string().max(2000).optional(),
    question2Answer: z.string().max(2000).optional(),
    question3Answer: z.string().max(2000).optional(),
    question4Answer: z.string().max(2000).optional(),
    finalDecision: commitGateDecisionEnum,
    reason: z.string().max(2000).optional(),
  })
  .openapi("CreateCommitGate");
