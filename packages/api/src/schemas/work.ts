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

// ─── F517: 메타데이터 트레이서빌리티 ─────────────────────────────────────────

export const TracePrSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  state: z.string(),
  commits: z.array(z.string()),
});

export const TraceFItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  sprint: z.string().optional(),
  req_code: z.string().optional(),
  prs: z.array(TracePrSchema),
});

export const TraceChainSchema = z.object({
  id: z.string(),
  type: z.enum(["req", "f_item"]),
  f_items: z.array(TraceFItemSchema),
});

export const TraceSyncOutputSchema = z.object({
  synced: z.object({
    spec: z.number(),
    prs: z.number(),
  }),
});

export const ChangelogItemSchema = z.object({
  f_item: z.string().optional(),
  text: z.string(),
  req_code: z.string().optional(),
  sprint: z.string().optional(),
  pr_number: z.number().optional(),
});

export const ChangelogEntrySchema = z.object({
  phase: z.string(),
  title: z.string(),
  items: z.array(ChangelogItemSchema),
});

export const StructuredChangelogSchema = z.object({
  entries: z.array(ChangelogEntrySchema),
  generated_at: z.string(),
});

// ─── F516: Backlog 인입 파이프라인 ──────────────────────────────────────────

export const WorkSubmitInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  source: z.enum(["web", "cli", "marker"]).default("web"),
  idempotency_key: z.string().optional(),
});

export const WorkSubmitOutputSchema = z.object({
  id: z.string(),
  track: z.enum(["F", "B", "C", "X"]),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  title: z.string(),
  classify_method: z.enum(["llm", "regex"]),
  github_issue_number: z.number().optional(),
  spec_row_added: z.boolean(),
  status: z.string(),
});

// ─── F518: Work KG 스키마 ──────────────────────────────────────────────────

export const KgNodeSchema = z.object({
  id: z.string(),
  node_type: z.string(),
  label: z.string(),
  metadata: z.record(z.unknown()),
});

export const KgEdgeSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  target_id: z.string(),
  edge_type: z.string(),
});

export const KgGraphSchema = z.object({
  root_id: z.string(),
  nodes: z.array(KgNodeSchema),
  edges: z.array(KgEdgeSchema),
});

export const KgSyncOutputSchema = z.object({
  synced: z.object({
    nodes: z.number(),
    edges: z.number(),
  }),
});
