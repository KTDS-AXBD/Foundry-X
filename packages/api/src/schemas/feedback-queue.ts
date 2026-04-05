import { z } from "@hono/zod-openapi";

export const feedbackQueueItemSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  github_issue_number: z.number(),
  github_issue_url: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  labels: z.string(),
  screenshot_url: z.string().nullable(),
  status: z.enum(["pending", "processing", "done", "failed", "skipped"]),
  agent_pr_url: z.string().nullable(),
  agent_log: z.string().nullable(),
  error_message: z.string().nullable(),
  retry_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("FeedbackQueueItem");

export const feedbackQueueListSchema = z.object({
  items: z.array(feedbackQueueItemSchema),
  total: z.number(),
}).openapi("FeedbackQueueList");

export const feedbackQueueUpdateSchema = z.object({
  status: z.enum(["done", "failed", "skipped"]).optional(),
  agentPrUrl: z.string().optional(),
  agentLog: z.string().optional(),
  errorMessage: z.string().optional(),
}).openapi("FeedbackQueueUpdate");
