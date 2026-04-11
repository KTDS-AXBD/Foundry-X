import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  WorkSnapshotSchema,
  WorkContextSchema,
  ClassifyInputSchema,
  ClassifyOutputSchema,
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
