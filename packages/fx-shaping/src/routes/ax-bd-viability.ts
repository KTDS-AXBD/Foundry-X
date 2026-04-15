/**
 * Sprint 69: 사업성 체크포인트 + Commit Gate 라우트 (F213)
 */
import { Hono } from "hono";
import type { ShapingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { ViabilityCheckpointService } from "../services/viability-checkpoint-service.js";
import { CommitGateService } from "../services/commit-gate-service.js";
import { CreateCheckpointSchema, UpdateCheckpointSchema } from "../schemas/viability-checkpoint.schema.js";
import { CreateCommitGateSchema } from "../schemas/commit-gate.schema.js";

export const axBdViabilityRoute = new Hono<{
  Bindings: ShapingEnv;
  Variables: TenantVariables;
}>();

// ─── POST /ax-bd/viability/checkpoints — 체크포인트 기록 ───

axBdViabilityRoute.post("/ax-bd/viability/checkpoints", async (c) => {
  const body = await c.req.json();
  const parsed = CreateCheckpointSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new ViabilityCheckpointService(c.env.DB);
  const checkpoint = await svc.create(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(checkpoint, 201);
});

// ─── GET /ax-bd/viability/checkpoints/:bizItemId — 아이템별 전체 조회 ───

axBdViabilityRoute.get("/ax-bd/viability/checkpoints/:bizItemId", async (c) => {
  const svc = new ViabilityCheckpointService(c.env.DB);
  const checkpoints = await svc.listByItem(c.req.param("bizItemId"));
  return c.json({ checkpoints });
});

// ─── PUT /ax-bd/viability/checkpoints/:bizItemId/:stage — 수정 ───

axBdViabilityRoute.put("/ax-bd/viability/checkpoints/:bizItemId/:stage", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateCheckpointSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new ViabilityCheckpointService(c.env.DB);
  const checkpoint = await svc.update(c.req.param("bizItemId"), c.req.param("stage"), parsed.data);
  if (!checkpoint) {
    return c.json({ error: "Checkpoint not found" }, 404);
  }
  return c.json(checkpoint);
});

// ─── DELETE /ax-bd/viability/checkpoints/:bizItemId/:stage — 삭제 ───

axBdViabilityRoute.delete("/ax-bd/viability/checkpoints/:bizItemId/:stage", async (c) => {
  const svc = new ViabilityCheckpointService(c.env.DB);
  const ok = await svc.delete(c.req.param("bizItemId"), c.req.param("stage"));
  if (!ok) {
    return c.json({ error: "Checkpoint not found" }, 404);
  }
  return c.json({ success: true });
});

// ─── GET /ax-bd/viability/traffic-light/:bizItemId — 누적 신호등 ───

axBdViabilityRoute.get("/ax-bd/viability/traffic-light/:bizItemId", async (c) => {
  const svc = new ViabilityCheckpointService(c.env.DB);
  const trafficLight = await svc.getTrafficLight(c.req.param("bizItemId"));
  return c.json(trafficLight);
});

// ─── POST /ax-bd/viability/commit-gate — Commit Gate 기록 ───

axBdViabilityRoute.post("/ax-bd/viability/commit-gate", async (c) => {
  const body = await c.req.json();
  const parsed = CreateCommitGateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new CommitGateService(c.env.DB);
  const gate = await svc.create(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(gate, 201);
});

// ─── GET /ax-bd/viability/commit-gate/:bizItemId — Commit Gate 조회 ───

axBdViabilityRoute.get("/ax-bd/viability/commit-gate/:bizItemId", async (c) => {
  const svc = new CommitGateService(c.env.DB);
  const gate = await svc.getByItem(c.req.param("bizItemId"));
  if (!gate) {
    return c.json({ error: "Commit gate not found" }, 404);
  }
  return c.json(gate);
});
