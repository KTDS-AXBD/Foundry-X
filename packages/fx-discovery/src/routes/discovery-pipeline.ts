/**
 * F539c Group B: discovery-pipeline GET 2 라우트 (FX-REQ-578)
 * GET /api/discovery-pipeline/runs
 * GET /api/discovery-pipeline/runs/:id
 */
import { Hono } from "hono";
import type { DiscoveryEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryPipelineReadService } from "../services/discovery-pipeline-read.service.js";
import { listPipelineRunsSchema } from "../schemas/discovery-pipeline.js";

export const discoveryPipelineRoute = new Hono<{ Bindings: DiscoveryEnv; Variables: TenantVariables }>();

// GET /discovery-pipeline/runs
discoveryPipelineRoute.get("/discovery-pipeline/runs", async (c) => {
  const parsed = listPipelineRunsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new DiscoveryPipelineReadService(c.env.DB);
  const result = await svc.listRuns(c.get("orgId"), parsed.data);
  return c.json(result);
});

// GET /discovery-pipeline/runs/:id
discoveryPipelineRoute.get("/discovery-pipeline/runs/:id", async (c) => {
  const svc = new DiscoveryPipelineReadService(c.env.DB);
  const detail = await svc.getRun(c.req.param("id"), c.get("orgId"));

  if (!detail) {
    return c.json({ error: "Pipeline run not found" }, 404);
  }
  return c.json(detail);
});
