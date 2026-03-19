import { z } from "@hono/zod-openapi";

export const SlackCommandSchema = z
  .object({
    text: z.string(),
    team_id: z.string(),
    user_id: z.string(),
    channel_id: z.string(),
  })
  .openapi("SlackCommand");

export const SlackInteractionSchema = z
  .object({
    payload: z.string(), // JSON string with { type, actions: [{ action_id, value }], ... }
  })
  .openapi("SlackInteraction");

// ─── F94: 카테고리별 알림 설정 ───

export const SlackNotificationCategorySchema = z.enum([
  "agent", "pr", "plan", "queue", "message",
]).openapi("SlackNotificationCategory");

export const SlackNotificationConfigSchema = z.object({
  id: z.string(),
  category: SlackNotificationCategorySchema,
  webhook_url: z.string().url().startsWith("https://hooks.slack.com/"),
  enabled: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).openapi("SlackNotificationConfig");

export const UpsertSlackConfigSchema = z.object({
  webhook_url: z.string().url().startsWith("https://hooks.slack.com/"),
  enabled: z.boolean().default(true),
}).openapi("UpsertSlackConfig");

export const SlackTestSchema = z.object({
  category: SlackNotificationCategorySchema.optional(),
}).openapi("SlackTest");
