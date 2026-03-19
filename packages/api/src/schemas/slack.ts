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
