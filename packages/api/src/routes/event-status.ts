// ─── F406: 이벤트 상태 폴링 API (Sprint 191) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { D1EventBus } from "@foundry-x/shared";
import { validationHook, ErrorSchema } from "../schemas/common.js";
import type { Env } from "../env.js";

export const eventStatusRoute = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: validationHook as any,
});

// ── 스키마 ──

const EventStatusSchema = z
  .object({
    pending: z.number().int(),
    failed: z.number().int(),
    dead_letter: z.number().int(),
    processed_last_hour: z.number().int(),
  })
  .openapi("EventStatus");

const DLQEventSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    source: z.string(),
    tenant_id: z.string(),
    payload: z.string(),
    metadata: z.string().nullable(),
    created_at: z.string(),
    retry_count: z.number().int(),
  })
  .openapi("DLQEvent");

// ── GET /api/events/status ──

const getStatusRoute = createRoute({
  method: "get",
  path: "/events/status",
  tags: ["Events"],
  summary: "이벤트 상태 통계 (pending/failed/dead_letter/processed)",
  responses: {
    200: {
      description: "이벤트 상태 통계",
      content: { "application/json": { schema: EventStatusSchema } },
    },
    500: {
      description: "서버 오류",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

eventStatusRoute.openapi(getStatusRoute, async (c) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bus = new D1EventBus(c.env.DB as any);
  const status = await bus.getStatus();
  return c.json(status);
});

// ── GET /api/events/dlq ──

const getDLQRoute = createRoute({
  method: "get",
  path: "/events/dlq",
  tags: ["Events"],
  summary: "Dead-Letter Queue 이벤트 목록",
  request: {
    query: z.object({
      limit: z.string().optional().openapi({ description: "최대 조회 건수 (기본 20)" }),
    }),
  },
  responses: {
    200: {
      description: "DLQ 이벤트 목록",
      content: { "application/json": { schema: z.object({ events: z.array(DLQEventSchema) }) } },
    },
    500: {
      description: "서버 오류",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

eventStatusRoute.openapi(getDLQRoute, async (c) => {
  const limitParam = c.req.query("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bus = new D1EventBus(c.env.DB as any);
  const events = await bus.getDLQ(limit);
  return c.json({ events });
});

// ── GET /api/events/:id ──

const getEventByIdRoute = createRoute({
  method: "get",
  path: "/events/{id}",
  tags: ["Events"],
  summary: "특정 이벤트 상태 조회",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "이벤트 상태",
      content: { "application/json": { schema: DLQEventSchema } },
    },
    404: {
      description: "이벤트 없음",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

eventStatusRoute.openapi(getEventByIdRoute, async (c) => {
  const { id } = c.req.valid("param");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await (c.env.DB as any)
    .prepare(
      `SELECT id, type, source, tenant_id, payload, metadata, created_at, retry_count
       FROM domain_events WHERE id = ?`,
    )
    .bind(id)
    .first();
  if (!row) return c.json({ error: "Event not found" } as any, 404);
  return c.json(row);
});

// ── POST /api/events/dlq/:id/reprocess ──

const reprocessRoute = createRoute({
  method: "post",
  path: "/events/dlq/{id}/reprocess",
  tags: ["Events"],
  summary: "DLQ 이벤트 수동 재처리 (dead_letter → pending)",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "재처리 요청 성공",
      content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
    },
    404: {
      description: "이벤트 없음",
      content: { "application/json": { schema: ErrorSchema } },
    },
    500: {
      description: "서버 오류",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

eventStatusRoute.openapi(reprocessRoute, async (c) => {
  const { id } = c.req.valid("param");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bus = new D1EventBus(c.env.DB as any);
  await bus.reprocess(id);
  return c.json({ ok: true });
});
