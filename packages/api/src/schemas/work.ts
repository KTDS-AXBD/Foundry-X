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

// ─── Agent Sessions (F510 M4) ──────────────────────────────────────────────

export const AgentSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["busy", "idle", "done"]),
  profile: z.enum(["coder", "reviewer", "tester", "unknown"]),
  worktree: z.string().optional(),
  branch: z.string().optional(),
  windows: z.number(),
  last_activity: z.string().optional(),
  collected_at: z.string(),
});

export const SessionListSchema = z.object({
  sessions: z.array(AgentSessionSchema),
  worktrees: z.array(z.object({
    path: z.string(),
    branch: z.string(),
  })),
  last_sync: z.string(),
});

export const SessionSyncInputSchema = z.object({
  sessions: z.array(z.object({
    name: z.string(),
    status: z.string(),
    profile: z.string(),
    windows: z.number(),
    last_activity: z.number(),
  })),
  worktrees: z.array(z.object({
    path: z.string(),
    branch: z.string(),
  })),
  collected_at: z.string(),
});

export const SessionSyncOutputSchema = z.object({
  synced: z.number(),
  removed: z.number(),
});

export const ClassifyOutputSchema = z.object({
  track: z.enum(["F", "B", "C", "X"]),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  title: z.string(),
  req_code: z.string().optional(),
  method: z.enum(["llm", "regex"]),
});

// ─── Work Management Analytics (F513 B-1~B-3) ────────────────────────────────

export const VelocitySchema = z.object({
  sprints: z.array(z.object({
    sprint: z.number(),
    f_items_done: z.number(),
    week: z.string(),
  })),
  avg_per_sprint: z.number(),
  trend: z.enum(["up", "down", "stable"]),
  generated_at: z.string(),
});

export const PhaseProgressSchema = z.object({
  phases: z.array(z.object({
    id: z.number(),
    name: z.string(),
    total: z.number(),
    done: z.number(),
    in_progress: z.number(),
    pct: z.number(),
  })),
  current_phase: z.number(),
  generated_at: z.string(),
});

export const BacklogHealthSchema = z.object({
  total_backlog: z.number(),
  stale_items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    age_sprints: z.number(),
  })),
  health_score: z.number().min(0).max(100),
  warnings: z.array(z.string()),
  generated_at: z.string(),
});

// ─── Changelog ──────────────────────────────────────────────────────────────

export const ChangelogSchema = z.object({
  content: z.string(),
  generated_at: z.string(),
});

// ─── Roadmap ────────────────────────────────────────────────────────────────

export const RoadmapSchema = z.object({
  content: z.string(),
  generated_at: z.string(),
});
