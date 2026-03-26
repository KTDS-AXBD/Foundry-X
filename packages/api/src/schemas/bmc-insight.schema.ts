import { z } from "@hono/zod-openapi";

export const GenerateInsightSchema = z.object({
  currentContent: z.string().min(20).max(2000),
  bmcContext: z.record(z.string(), z.string()).optional(),
}).openapi("GenerateInsight");
