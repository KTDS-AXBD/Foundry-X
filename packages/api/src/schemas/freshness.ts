import { z } from "@hono/zod-openapi";

const FreshnessItemSchema = z.object({
  file: z.string(),
  lastModified: z.string(),
  codeLastCommit: z.string(),
  stale: z.boolean(),
  staleDays: z.number(),
});

export const FreshnessSchema = z
  .object({
    documents: z.array(FreshnessItemSchema),
    overallStale: z.boolean(),
    checkedAt: z.string(),
  })
  .openapi("FreshnessReport");
