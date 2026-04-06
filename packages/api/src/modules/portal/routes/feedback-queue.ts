import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { feedbackQueueItemSchema, feedbackQueueListSchema, feedbackQueueUpdateSchema } from "../schemas/feedback-queue.js";
import { FeedbackQueueService } from "../services/feedback-queue-service.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";

export const feedbackQueueRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── GET /feedback-queue ───

const listRoute = createRoute({
  method: "get",
  path: "/feedback-queue",
  tags: ["FeedbackQueue"],
  summary: "피드백 큐 목록 조회",
  request: {
    query: z.object({
      status: z.enum(["pending", "processing", "done", "failed", "skipped"]).optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: feedbackQueueListSchema } },
      description: "큐 목록",
    },
  },
});

feedbackQueueRoute.openapi(listRoute, async (c) => {
  const { status, limit, offset } = c.req.valid("query");
  const svc = new FeedbackQueueService(c.env.DB);
  const result = await svc.list({ status, limit, offset });
  return c.json(result as z.infer<typeof feedbackQueueListSchema>);
});

// ─── GET /feedback-queue/:id ───

const getByIdRoute = createRoute({
  method: "get",
  path: "/feedback-queue/{id}",
  tags: ["FeedbackQueue"],
  summary: "피드백 큐 아이템 상세",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: feedbackQueueItemSchema } },
      description: "큐 아이템",
    },
    404: { description: "아이템 없음" },
  },
});

feedbackQueueRoute.openapi(getByIdRoute, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new FeedbackQueueService(c.env.DB);
  const item = await svc.getById(id);
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json(item as z.infer<typeof feedbackQueueItemSchema>);
});

// ─── PATCH /feedback-queue/:id ───

const updateRoute = createRoute({
  method: "patch",
  path: "/feedback-queue/{id}",
  tags: ["FeedbackQueue"],
  summary: "큐 아이템 상태/결과 업데이트",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: feedbackQueueUpdateSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: feedbackQueueItemSchema } },
      description: "업데이트된 아이템",
    },
    404: { description: "아이템 없음" },
  },
});

feedbackQueueRoute.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const svc = new FeedbackQueueService(c.env.DB);
  const item = await svc.update(id, body);
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json(item as z.infer<typeof feedbackQueueItemSchema>);
});

// ─── POST /feedback-queue/consume ───

const consumeRoute = createRoute({
  method: "post",
  path: "/feedback-queue/consume",
  tags: ["FeedbackQueue"],
  summary: "다음 pending 아이템 consume (pending→processing 원자적 전환)",
  responses: {
    200: {
      content: { "application/json": { schema: feedbackQueueItemSchema.nullable() } },
      description: "consume된 아이템 (없으면 null)",
    },
  },
});

feedbackQueueRoute.openapi(consumeRoute, async (c) => {
  const svc = new FeedbackQueueService(c.env.DB);
  const item = await svc.consume();
  return c.json(item as z.infer<typeof feedbackQueueItemSchema> | null);
});
