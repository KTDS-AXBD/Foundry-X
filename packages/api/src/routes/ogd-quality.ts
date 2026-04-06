// ─── F355: O-G-D Quality Routes (Sprint 160) ───

import { Hono } from "hono";
import { OgdEvaluateRequestSchema } from "../schemas/ogd-quality-schema.js";
import { OgdOrchestratorService } from "../services/ogd-orchestrator-service.js";
import { OgdGeneratorService } from "../services/ogd-generator-service.js";
import { OgdDiscriminatorService } from "../services/ogd-discriminator-service.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const ogdQualityRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ogd/evaluate — O-G-D 루프 실행
ogdQualityRoute.post("/ogd/evaluate", async (c) => {
  const orgId = c.get("orgId");
  const raw = await c.req.json();
  const parsed = OgdEvaluateRequestSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const generator = new OgdGeneratorService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const discriminator = new OgdDiscriminatorService(c.env.AI);
  const orchestrator = new OgdOrchestratorService(c.env.DB, generator, discriminator);

  try {
    const summary = await orchestrator.runLoop(orgId, parsed.data.jobId, parsed.data.prdContent);
    return c.json({ summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// GET /ogd/rounds/:jobId — 라운드 히스토리
ogdQualityRoute.get("/ogd/rounds/:jobId", async (c) => {
  const orgId = c.get("orgId");
  const jobId = c.req.param("jobId");
  const generator = new OgdGeneratorService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const discriminator = new OgdDiscriminatorService(c.env.AI);
  const orchestrator = new OgdOrchestratorService(c.env.DB, generator, discriminator);

  const rounds = await orchestrator.getRounds(jobId, orgId);
  return c.json({ rounds });
});

// GET /ogd/summary/:jobId — O-G-D 요약
ogdQualityRoute.get("/ogd/summary/:jobId", async (c) => {
  const orgId = c.get("orgId");
  const jobId = c.req.param("jobId");
  const generator = new OgdGeneratorService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const discriminator = new OgdDiscriminatorService(c.env.AI);
  const orchestrator = new OgdOrchestratorService(c.env.DB, generator, discriminator);

  const summary = await orchestrator.getSummary(jobId, orgId);
  if (!summary) return c.json({ error: "No OGD data for this job" }, 404);
  return c.json({ summary });
});
