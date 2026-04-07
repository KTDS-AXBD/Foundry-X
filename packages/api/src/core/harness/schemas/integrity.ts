import { z } from "@hono/zod-openapi";

const IntegrityCheckSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  level: z.enum(["PASS", "WARN", "FAIL"]),
  message: z.string(),
});

export const IntegritySchema = z
  .object({
    passed: z.boolean(),
    score: z.number(),
    checks: z.array(IntegrityCheckSchema),
  })
  .openapi("HarnessIntegrity");
