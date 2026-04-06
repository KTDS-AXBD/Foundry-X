import { z } from "@hono/zod-openapi";

export const jiraConfigSchema = z
  .object({
    api_url: z.string().url(),
    email: z.string().email(),
    api_token: z.string().min(1),
    project_key: z.string().optional(),
  })
  .openapi("JiraConfig");

export const jiraIssueSchema = z
  .object({
    key: z.string(),
    summary: z.string(),
    status: z.string(),
    type: z.string(),
    assignee: z.string().nullable(),
    priority: z.string().nullable(),
    updated: z.string(),
  })
  .openapi("JiraIssue");

export const jiraProjectSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
  })
  .openapi("JiraProject");

export type JiraConfig = z.infer<typeof jiraConfigSchema>;
export type JiraIssue = z.infer<typeof jiraIssueSchema>;
export type JiraProject = z.infer<typeof jiraProjectSchema>;
