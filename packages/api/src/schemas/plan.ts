import { z } from "zod";

export const createPlanSchema = z.object({
  agentId: z.string().min(1),
  taskType: z.enum([
    "code-review",
    "code-generation",
    "spec-analysis",
    "test-generation",
  ]),
  context: z.object({
    repoUrl: z.string(),
    branch: z.string(),
    targetFiles: z.array(z.string()).optional(),
    instructions: z.string().optional(),
  }),
});

export const rejectPlanSchema = z.object({
  reason: z.string().optional(),
});

export const modifyPlanSchema = z.object({
  feedback: z.string().min(1),
});
