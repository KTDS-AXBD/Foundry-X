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
