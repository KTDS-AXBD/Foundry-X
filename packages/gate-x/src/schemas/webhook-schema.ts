import { z } from "zod";
import { WEBHOOK_EVENT_TYPES } from "../types/webhook.js";

const webhookEventEnum = z.enum(
  WEBHOOK_EVENT_TYPES as [string, ...string[]],
) as z.ZodEnum<[
  "evaluation.completed",
  "evaluation.failed",
  "evaluation.started",
  "decision.made",
]>;

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(webhookEventEnum).min(1),
  description: z.string().max(200).optional().default(""),
});

export const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(webhookEventEnum).min(1).optional(),
  description: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;
