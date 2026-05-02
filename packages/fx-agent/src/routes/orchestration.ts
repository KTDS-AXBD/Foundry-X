// ─── F335: Orchestration API — 루프 시작/이력/텔레메트리 (Sprint 150) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  LoopStartRequestSchema,
  LoopResponseSchema,
  LoopHistorySchema,
  TelemetryEventsListSchema,
  TelemetryEventCountsSchema,
} from "../schemas/orchestration.js";
import { OrchestrationLoop } from "../services/orchestration-loop.js";
import { TaskStateService } from "../services/task-state-service.js";
import { TelemetryCollector } from "../services/telemetry-collector.js";
import { EventBus } from "../services/event-bus.js";
import { createDefaultGuard } from "../services/transition-guard.js";
import type { AgentAdapter, AgentResult, LoopMode } from "@foundry-x/shared";
import type { AgentEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const orchestrationRoute = new OpenAPIHono<{ Bindings: AgentEnv; Variables: TenantVariables }>();

// ─── Shared instances (per-request) ───

function createLoop(db: D1Database) {
  const guard = createDefaultGuard();
  const taskStateService = new TaskStateService(db, guard);
  const eventBus = new EventBus();
  const telemetry = new TelemetryCollector(db);
  telemetry.subscribe(eventBus);
  return { loop: new OrchestrationLoop(taskStateService, eventBus, db), telemetry };
}

// ─── MockAgentAdapter — F335에서는 실제 에이전트 없이 인터페이스 검증 ───

function createMockAgent(name: string, role: "generator" | "discriminator" | "orchestrator"): AgentAdapter {
  return {
    name,
    role,
    async execute(ctx) {
      // Mock: round가 올라갈수록 품질 개선 시뮬레이션
      const score = Math.min(0.5 + ctx.round * 0.2, 1.0);
      return {
        success: score >= 0.7,
        qualityScore: score,
        feedback: score >= 0.7 ? [] : [`Quality ${score.toFixed(1)} below threshold`],
      };
    },
  };
}

// ─── POST /task-states/:taskId/loop — 루프 시작 ───

const startLoopRoute = createRoute({
  method: "post",
  path: "/task-states/{taskId}/loop",
  tags: ["Orchestration"],
  summary: "피드백 루프 시작",
  request: {
    params: z.object({ taskId: z.string() }),
    body: {
      content: { "application/json": { schema: LoopStartRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: LoopResponseSchema } },
      description: "루프 결과",
    },
    400: { description: "루프 시작 불가" },
    404: { description: "태스크 없음" },
  },
});

orchestrationRoute.openapi(startLoopRoute, async (c) => {
  const orgId = c.get("orgId");
  const { taskId } = c.req.valid("param");
  const body = c.req.valid("json");
  const { loop } = createLoop(c.env.DB);

  // F335: MockAdapter 사용 — F336에서 실제 에이전트 래핑으로 전환
  const agents: AgentAdapter[] = body.agentNames.map((name, i) => {
    if (body.loopMode === "adversarial") {
      return createMockAgent(name, i === 0 ? "generator" : "discriminator");
    }
    return createMockAgent(name, "generator");
  });

  const outcome = await loop.run({
    taskId,
    tenantId: orgId,
    loopMode: body.loopMode as LoopMode,
    agents,
    convergence: body.convergence,
    metadata: body.metadata,
  });

  // 루프 이력에서 최신 컨텍스트 가져오기
  const history = await loop.getHistory(taskId, orgId, 1);
  const context = history[0] ?? null;

  if (outcome.status === "escalated" && outcome.reason.includes("not found")) {
    return c.json({ error: outcome.reason }, 404);
  }
  if (outcome.status === "escalated" && outcome.reason.includes("not FEEDBACK_LOOP")) {
    return c.json({ error: outcome.reason }, 400);
  }

  return c.json({ outcome, context });
});

// ─── GET /task-states/:taskId/loop-history — 루프 이력 ───

const getLoopHistoryRoute = createRoute({
  method: "get",
  path: "/task-states/{taskId}/loop-history",
  tags: ["Orchestration"],
  summary: "루프 이력 조회",
  request: {
    params: z.object({ taskId: z.string() }),
    query: z.object({
      limit: z.coerce.number().min(1).max(100).default(10),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: LoopHistorySchema } },
      description: "이력",
    },
  },
});

orchestrationRoute.openapi(getLoopHistoryRoute, async (c) => {
  const orgId = c.get("orgId");
  const { taskId } = c.req.valid("param");
  const { limit } = c.req.valid("query");
  const { loop } = createLoop(c.env.DB);

  const items = await loop.getHistory(taskId, orgId, limit);
  return c.json({ items, total: items.length });
});

// ─── GET /telemetry/events — 텔레메트리 이벤트 조회 ───

const getTelemetryRoute = createRoute({
  method: "get",
  path: "/telemetry/events",
  tags: ["Telemetry"],
  summary: "텔레메트리 이벤트 조회",
  request: {
    query: z.object({
      taskId: z.string(),
      source: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(50),
      offset: z.coerce.number().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: TelemetryEventsListSchema } },
      description: "이벤트 목록",
    },
  },
});

orchestrationRoute.openapi(getTelemetryRoute, async (c) => {
  const orgId = c.get("orgId");
  const { taskId, source, limit, offset } = c.req.valid("query");
  const telemetry = new TelemetryCollector(c.env.DB);

  const result = await telemetry.getEvents(taskId, orgId, { source, limit, offset });
  return c.json(result);
});

// ─── GET /telemetry/counts — 소스별 집계 ───

const getTelemetryCountsRoute = createRoute({
  method: "get",
  path: "/telemetry/counts",
  tags: ["Telemetry"],
  summary: "소스별 이벤트 수 집계",
  request: {
    query: z.object({
      since: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: TelemetryEventCountsSchema } },
      description: "집계",
    },
  },
});

orchestrationRoute.openapi(getTelemetryCountsRoute, async (c) => {
  const orgId = c.get("orgId");
  const { since } = c.req.valid("query");
  const telemetry = new TelemetryCollector(c.env.DB);

  const counts = await telemetry.getEventCounts(orgId, since);
  return c.json(counts);
});
