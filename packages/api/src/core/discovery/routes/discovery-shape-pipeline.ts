/**
 * F379: Discovery → Shape Pipeline Routes (Sprint 171)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { EventBus } from "../../../services/event-bus.js";
import { DiscoveryShapePipelineService } from "../services/discovery-shape-pipeline-service.js";
import {
  PipelineTriggerSchema,
  ShapePipelineStatusQuerySchema,
} from "../schemas/discovery-shape-pipeline.schema.js";

// Singleton EventBus for pipeline handlers
const pipelineEventBus = new EventBus();

export const discoveryShapePipelineRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /pipeline/shape/trigger — 수동 파이프라인 트리거
discoveryShapePipelineRoute.post("/pipeline/shape/trigger", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = PipelineTriggerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new DiscoveryShapePipelineService(c.env.DB, pipelineEventBus);
  const result = await svc.triggerPipeline(orgId, parsed.data.itemId, userId, parsed.data.tone);

  if (result.status === "failed") {
    return c.json({ error: result.error, result }, 400);
  }

  return c.json(result, result.status === "success" ? 201 : 200);
});

// GET /pipeline/shape/status — 파이프라인 상태 조회
discoveryShapePipelineRoute.get("/pipeline/shape/status", async (c) => {
  const orgId = c.get("orgId");

  const parsed = ShapePipelineStatusQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new DiscoveryShapePipelineService(c.env.DB, pipelineEventBus);
  const status = await svc.getStatus(orgId, parsed.data.itemId);

  return c.json(status);
});
