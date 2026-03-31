import { z } from "@hono/zod-openapi";

export const HelpAgentChatRequestSchema = z
  .object({
    message: z.string().min(1).max(2000),
    conversationId: z.string().min(1),
    bizItemId: z.string().optional(),
    stage: z.string().optional(),
  })
  .openapi("HelpAgentChatRequest");

export const HelpAgentLocalResponseSchema = z
  .object({
    role: z.literal("assistant"),
    content: z.string(),
    isLocal: z.literal(true),
  })
  .openapi("HelpAgentLocalResponse");

export const HelpAgentHistoryItemSchema = z
  .object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    isLocalResponse: z.boolean(),
    createdAt: z.string(),
  })
  .openapi("HelpAgentHistoryItem");

export const HelpAgentHistoryResponseSchema = z
  .object({
    conversationId: z.string(),
    messages: z.array(HelpAgentHistoryItemSchema),
  })
  .openapi("HelpAgentHistoryResponse");
