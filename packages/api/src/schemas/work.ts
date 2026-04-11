import { z } from "@hono/zod-openapi";

export const WorkItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["backlog", "planned", "in_progress", "done", "rejected", "closed"]),
  sprint: z.string().optional(),
  priority: z.string().optional(),
  req_code: z.string().optional(),
});

export const WorkSnapshotSchema = z.object({
  summary: z.object({
    backlog: z.number(),
    planned: z.number(),
    in_progress: z.number(),
    done_today: z.number(),
  }),
  items: z.array(WorkItemSchema),
  prs: z.array(z.object({
    number: z.number(),
    title: z.string(),
    state: z.string(),
    url: z.string(),
    created_at: z.string(),
  })),
  commits: z.array(z.object({
    sha: z.string(),
    message: z.string(),
    date: z.string(),
    author: z.string(),
  })),
  generated_at: z.string(),
});

export const WorkContextSchema = z.object({
  recent_commits: z.array(z.object({
    sha: z.string(),
    message: z.string(),
    date: z.string(),
    author: z.string(),
  })),
  worktrees: z.array(z.string()),
  daemon_events: z.array(z.object({
    event: z.string(),
    timestamp: z.string(),
  })),
  next_actions: z.array(z.string()),
  note: z.string().optional(),
});

export const ClassifyInputSchema = z.object({
  text: z.string().min(1).max(500),
});

export const ClassifyOutputSchema = z.object({
  track: z.enum(["F", "B", "C", "X"]),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  title: z.string(),
  req_code: z.string().optional(),
  method: z.enum(["llm", "regex"]),
});
