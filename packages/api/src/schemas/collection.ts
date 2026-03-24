import { z } from "@hono/zod-openapi";

export const AgentCollectSchema = z.object({
  keywords: z.array(z.string().min(1).max(100)).min(1).max(10),
  maxItems: z.number().int().min(1).max(10).default(5),
  focusArea: z.string().max(200).optional(),
}).openapi("AgentCollectRequest");

export const IdeaPortalWebhookSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  submittedBy: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("IdeaPortalWebhook");

export const ScreeningRejectSchema = z.object({
  reason: z.string().max(500).optional(),
}).openapi("ScreeningReject");
