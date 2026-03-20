import { z } from "@hono/zod-openapi";

// ─── GitHub Issue Event ───

export const githubIssueEventSchema = z.object({
  action: z.enum(["opened", "closed", "reopened", "edited", "labeled", "unlabeled"]),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    state: z.enum(["open", "closed"]),
    body: z.string().nullable(),
    labels: z.array(z.object({ name: z.string() })).default([]),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});
export type GitHubIssueEvent = z.infer<typeof githubIssueEventSchema>;

// ─── GitHub Pull Request Event ───

export const githubPrEventSchema = z.object({
  action: z.enum(["opened", "closed", "reopened", "synchronize", "edited"]),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    state: z.enum(["open", "closed"]),
    merged: z.boolean().default(false),
    merged_at: z.string().nullable().default(null),
    head: z.object({ ref: z.string() }).optional(),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});
export type GitHubPrEvent = z.infer<typeof githubPrEventSchema>;

// ─── GitHub Issue Comment Event (PR 코멘트 포함) ───

export const githubCommentEventSchema = z.object({
  action: z.enum(["created", "edited", "deleted"]),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    user: z.object({ login: z.string() }),
    created_at: z.string(),
  }),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    pull_request: z.object({
      url: z.string(),
    }).optional(),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});
export type GitHubCommentEvent = z.infer<typeof githubCommentEventSchema>;

// ─── Webhook Registry (F99) ───

export const webhookCreateSchema = z
  .object({
    provider: z.enum(["github", "jira", "slack", "custom"]),
    event_types: z.array(z.string()),
    target_url: z.string().url(),
    direction: z.enum(["inbound", "outbound"]).default("inbound"),
    secret: z.string().optional(),
    config: z.record(z.unknown()).optional(),
  })
  .openapi("WebhookCreate");

export const webhookResponseSchema = z
  .object({
    id: z.string(),
    org_id: z.string(),
    provider: z.string(),
    event_types: z.array(z.string()),
    target_url: z.string(),
    direction: z.string(),
    enabled: z.boolean(),
    config: z.record(z.unknown()).nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .openapi("WebhookResponse");

export type WebhookCreate = z.input<typeof webhookCreateSchema>;
export type WebhookResponse = z.infer<typeof webhookResponseSchema>;
