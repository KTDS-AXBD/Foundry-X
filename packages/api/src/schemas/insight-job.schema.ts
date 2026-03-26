import { z } from "@hono/zod-openapi";

export const CreateMarketSummarySchema = z.object({
  keywords: z.array(z.string().min(1).max(100)).min(1).max(10),
}).openapi("CreateMarketSummary");
