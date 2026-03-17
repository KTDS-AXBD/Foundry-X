import { z } from "@hono/zod-openapi";

export const HealthResponseSchema = z
  .object({
    overall: z.number(),
    specToCode: z.number(),
    codeToTest: z.number(),
    specToTest: z.number(),
    grade: z.string(),
  })
  .openapi("HealthScore");
