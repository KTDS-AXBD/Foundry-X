/**
 * Sprint 56: Discovery 진행률 대시보드 라우트 (F189)
 */
import { Hono } from "hono";
import type { DiscoveryEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryProgressService } from "../services/discovery-progress.js";

export const discoveryRoute = new Hono<{ Bindings: DiscoveryEnv; Variables: TenantVariables }>();

// ─── GET /discovery/progress — 전체 Discovery 진행률 (F189) ───

discoveryRoute.get("/discovery/progress", async (c) => {
  const orgId = c.get("orgId");
  const service = new DiscoveryProgressService(c.env.DB);
  const progress = await service.getProgress(orgId);
  return c.json(progress);
});

// ─── GET /discovery/progress/summary — 요약 통계 (F189) ───

discoveryRoute.get("/discovery/progress/summary", async (c) => {
  const orgId = c.get("orgId");
  const service = new DiscoveryProgressService(c.env.DB);
  const summary = await service.getSummary(orgId);
  return c.json(summary);
});
