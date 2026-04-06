// ─── F356: Prototype Feedback Zod 스키마 (Sprint 160) ───

import { z } from "@hono/zod-openapi";

export const FEEDBACK_CATEGORIES = [
  "layout",
  "content",
  "functionality",
  "ux",
  "other",
] as const;

export const FEEDBACK_STATUSES = ["pending", "applied", "dismissed"] as const;

export const CreateFeedbackSchema = z
  .object({
    category: z.enum(FEEDBACK_CATEGORIES),
    content: z.string().min(1).max(2000),
  })
  .openapi("CreatePrototypeFeedback");

export const PrototypeFeedbackSchema = z
  .object({
    id: z.string(),
    jobId: z.string(),
    orgId: z.string(),
    authorId: z.string().nullable(),
    category: z.enum(FEEDBACK_CATEGORIES),
    content: z.string(),
    status: z.enum(FEEDBACK_STATUSES),
    createdAt: z.number(),
  })
  .openapi("PrototypeFeedback");
