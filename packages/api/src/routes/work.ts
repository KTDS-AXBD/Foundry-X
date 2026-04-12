import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  WorkSnapshotSchema,
  WorkContextSchema,
  ClassifyInputSchema,
  ClassifyOutputSchema,
  SessionListSchema,
  SessionSyncInputSchema,
  SessionSyncOutputSchema,
  VelocitySchema,
  PhaseProgressSchema,
  BacklogHealthSchema,
  ChangelogSchema,
} from "../schemas/work.js";
import type { Env } from "../env.js";
import { WorkService } from "../services/work.service.js";

export const workRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── GET /api/work/snapshot ───

const getSnapshot = createRoute({
  method: "get",
  path: "/work/snapshot",
  tags: ["Work Observability"],
  summary: "Aggregated work snapshot (SPEC items + PRs + commits)",
  responses: {
    200: {
      content: { "application/json": { schema: WorkSnapshotSchema } },
      description: "Work snapshot",
    },
  },
});

workRoute.openapi(getSnapshot, async (c) => {
  const svc = new WorkService(c.env);
  const snapshot = await svc.getSnapshot();
  return c.json(snapshot);
});

// ─── GET /api/work/context ───

const getContext = createRoute({
  method: "get",
  path: "/work/context",
  tags: ["Work Observability"],
  summary: "Context resume — recent commits + WT state + next actions",
  responses: {
    200: {
      content: { "application/json": { schema: WorkContextSchema } },
      description: "Work context",
    },
  },
});

workRoute.openapi(getContext, async (c) => {
  const svc = new WorkService(c.env);
  const ctx = await svc.getContext();
  return c.json(ctx);
});

// ─── POST /api/work/classify ───

const classifyWork = createRoute({
  method: "post",
  path: "/work/classify",
  tags: ["Work Observability"],
  summary: "Classify natural language input into work track + priority",
  request: {
    body: { content: { "application/json": { schema: ClassifyInputSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ClassifyOutputSchema } },
      description: "Classification result",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Invalid input",
    },
  },
});

workRoute.openapi(classifyWork, async (c) => {
  const { text } = c.req.valid("json");
  const svc = new WorkService(c.env);
  const result = await svc.classify(text);
  return c.json(result);
});

// ─── GET /api/work/sessions (F510 M4) ───────────────────────────────────────

const getSessions = createRoute({
  method: "get",
  path: "/work/sessions",
  tags: ["Work Observability"],
  summary: "Agent session list collected from local tmux/git state",
  responses: {
    200: {
      content: { "application/json": { schema: SessionListSchema } },
      description: "Agent sessions",
    },
  },
});

workRoute.openapi(getSessions, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getSessions();
  return c.json(data);
});

// ─── POST /api/work/sessions/sync (F510 M4) ──────────────────────────────────

const syncSessions = createRoute({
  method: "post",
  path: "/work/sessions/sync",
  tags: ["Work Observability"],
  summary: "Upsert agent session state from local collector script",
  request: {
    body: { content: { "application/json": { schema: SessionSyncInputSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SessionSyncOutputSchema } },
      description: "Sync result",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Invalid input",
    },
  },
});

workRoute.openapi(syncSessions, async (c) => {
  const body = c.req.valid("json");
  const svc = new WorkService(c.env);
  const result = await svc.syncSessions(body);
  return c.json(result);
});

// ─── GET /api/work/velocity (F513 B-1) ────────────────────────────────────────

const getVelocity = createRoute({
  method: "get",
  path: "/work/velocity",
  tags: ["Work Observability"],
  summary: "Sprint velocity — done F-items per sprint with trend",
  responses: {
    200: {
      content: { "application/json": { schema: VelocitySchema } },
      description: "Velocity data",
    },
  },
});

workRoute.openapi(getVelocity, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getVelocity();
  return c.json(data);
});

// ─── GET /api/work/phase-progress (F513 B-2) ─────────────────────────────────

const getPhaseProgress = createRoute({
  method: "get",
  path: "/work/phase-progress",
  tags: ["Work Observability"],
  summary: "Phase-level progress — done/in-progress/total per phase",
  responses: {
    200: {
      content: { "application/json": { schema: PhaseProgressSchema } },
      description: "Phase progress",
    },
  },
});

workRoute.openapi(getPhaseProgress, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getPhaseProgress();
  return c.json(data);
});

// ─── GET /api/work/backlog-health (F513 B-3) ─────────────────────────────────

const getBacklogHealth = createRoute({
  method: "get",
  path: "/work/backlog-health",
  tags: ["Work Observability"],
  summary: "Backlog health score — stale items + warnings",
  responses: {
    200: {
      content: { "application/json": { schema: BacklogHealthSchema } },
      description: "Backlog health",
    },
  },
});

workRoute.openapi(getBacklogHealth, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getBacklogHealth();
  return c.json(data);
});

// ─── GET /api/work/changelog ─────────────────────────────────────────────────

const getChangelog = createRoute({
  method: "get",
  path: "/work/changelog",
  tags: ["Work Observability"],
  summary: "CHANGELOG.md content from repository",
  responses: {
    200: {
      content: { "application/json": { schema: ChangelogSchema } },
      description: "Changelog content",
    },
  },
});

workRoute.openapi(getChangelog, async (c) => {
  const svc = new WorkService(c.env);
  const data = await svc.getChangelog();
  return c.json(data);
});
