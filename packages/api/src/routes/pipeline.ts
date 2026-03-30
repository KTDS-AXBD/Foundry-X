/**
 * Sprint 79: Pipeline Routes — 파이프라인 대시보드 (F232)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { PipelineService } from "../services/pipeline-service.js";
import { AdvanceStageSchema, PipelineFilterSchema } from "../schemas/pipeline.schema.js";

export const pipelineRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// GET /pipeline/items — 파이프라인 아이템 목록
pipelineRoute.get("/pipeline/items", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = PipelineFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new PipelineService(c.env.DB);
  const result = await svc.listItems(orgId, parsed.data);
  return c.json(result);
});

// GET /pipeline/items/:id — 아이템 상세 + 단계 이력
pipelineRoute.get("/pipeline/items/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const svc = new PipelineService(c.env.DB);
  const detail = await svc.getItemDetail(id, orgId);

  if (!detail) {
    return c.json({ error: "Pipeline item not found" }, 404);
  }

  return c.json(detail);
});

// PATCH /pipeline/items/:id/stage — 단계 전환
pipelineRoute.patch("/pipeline/items/:id/stage", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = AdvanceStageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PipelineService(c.env.DB);
  const result = await svc.advanceStage(id, orgId, parsed.data.stage, userId, parsed.data.notes);
  return c.json(result);
});

// GET /pipeline/stats — 단계별 통계
pipelineRoute.get("/pipeline/stats", async (c) => {
  const orgId = c.get("orgId");
  const svc = new PipelineService(c.env.DB);
  const stats = await svc.getStats(orgId);
  return c.json(stats);
});

// GET /pipeline/kanban — 칸반 뷰 데이터
pipelineRoute.get("/pipeline/kanban", async (c) => {
  const orgId = c.get("orgId");
  const svc = new PipelineService(c.env.DB);
  const data = await svc.getKanbanData(orgId);
  return c.json(data);
});
