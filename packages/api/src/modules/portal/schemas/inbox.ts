import { z } from "zod";

export const sendMessageSchema = z.object({
  fromAgentId: z.string().min(1),
  toAgentId: z.string().min(1),
  type: z.enum([
    "task_assign",
    "task_result",
    "task_question",
    "task_feedback",
    "status_update",
  ]),
  subject: z.string().min(1).max(200),
  payload: z.record(z.unknown()).default({}),
  parentMessageId: z.string().optional(),
});

export const listMessagesSchema = z.object({
  unreadOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const threadParamsSchema = z.object({
  parentMessageId: z.string().min(1),
});
export const threadQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const ackThreadParamsSchema = z.object({
  parentMessageId: z.string().min(1),
});
