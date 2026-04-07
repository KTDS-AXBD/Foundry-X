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
    spec: z.string().optional(),
    fileContents: z.record(z.string(), z.string()).optional(),
  }),
  model: z.enum(["claude-sonnet-4-5-20250514", "claude-haiku-4-5-20250714"]).optional(),
});

export const rejectPlanSchema = z.object({
  reason: z.string().optional(),
});

export const modifyPlanSchema = z.object({
  feedback: z.string().min(1),
});

export const executePlanSchema = z.object({
  repoUrl: z.string().optional(),
  branch: z.string().optional(),
  projectId: z.string().optional(),
});
