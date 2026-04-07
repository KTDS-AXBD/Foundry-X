import { z } from "@hono/zod-openapi";

export const harnessViolationSchema = z
  .object({
    rule: z.string(),
    severity: z.enum(["error", "warning", "info"]),
    file: z.string().optional(),
    message: z.string(),
  })
  .openapi("HarnessViolation");

export const harnessCheckResultSchema = z
  .object({
    score: z.number(),
    passed: z.boolean(),
    violations: z.array(harnessViolationSchema),
    checkedAt: z.string(),
  })
  .openapi("HarnessCheckResult");

export const violationHistorySchema = z
  .object({
    events: z.array(z.unknown()),
    total: z.number(),
  })
  .openapi("ViolationHistory");
