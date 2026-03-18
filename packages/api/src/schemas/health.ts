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

// Sprint 9 F51: Detailed infrastructure health
const InfraCheckSchema = z.object({
  status: z.enum(["ok", "error"]),
  latency: z.number().optional(),
  error: z.string().optional(),
  rateLimit: z
    .object({
      remaining: z.number(),
      limit: z.number(),
    })
    .optional(),
});

export const DetailedHealthSchema = z
  .object({
    status: z.enum(["ok", "degraded", "down"]),
    version: z.string(),
    checks: z.record(InfraCheckSchema),
  })
  .openapi("DetailedHealth");
