import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { SkillMetricsService } from "../services/skill-metrics.js";
import {
  skillMetricsQuerySchema,
  skillDetailQuerySchema,
  auditLogQuerySchema,
  recordSkillExecutionSchema,
} from "../schemas/skill-metrics.js";

export const skillMetricsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /skills/metrics/record — 스킬 실행 기록 (F305)
skillMetricsRoute.post("/skills/metrics/record", async (c) => {
  const body = await c.req.json();
  const parsed = recordSkillExecutionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillMetricsService(c.env.DB);
  const result = await svc.recordExecution({
    tenantId: c.get("orgId"),
    skillId: parsed.data.skillId,
    version: parsed.data.version,
    bizItemId: parsed.data.bizItemId,
    artifactId: parsed.data.artifactId,
    model: parsed.data.model,
    status: parsed.data.status,
    inputTokens: parsed.data.inputTokens,
    outputTokens: parsed.data.outputTokens,
    costUsd: parsed.data.costUsd,
    durationMs: parsed.data.durationMs,
    executedBy: c.get("userId"),
    errorMessage: parsed.data.errorMessage,
  });

  return c.json(result, 201);
});

// GET /skills/metrics — 전체 스킬 메트릭 요약
skillMetricsRoute.get("/skills/metrics", async (c) => {
  const parsed = skillMetricsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillMetricsService(c.env.DB);
  const skills = await svc.getSkillMetricsSummary(c.get("orgId"), parsed.data);
  return c.json({ skills, total: skills.length, period: { days: parsed.data.days } });
});

// GET /skills/:skillId/metrics — 특정 스킬 상세 메트릭
skillMetricsRoute.get("/skills/:skillId/metrics", async (c) => {
  const skillId = c.req.param("skillId");
  const parsed = skillDetailQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillMetricsService(c.env.DB);
  const metrics = await svc.getSkillDetailMetrics(c.get("orgId"), skillId, parsed.data);
  return c.json(metrics);
});

// GET /skills/:skillId/versions — 스킬 버전 이력
skillMetricsRoute.get("/skills/:skillId/versions", async (c) => {
  const skillId = c.req.param("skillId");
  const svc = new SkillMetricsService(c.env.DB);
  const versions = await svc.getSkillVersions(c.get("orgId"), skillId);
  return c.json({ versions, total: versions.length });
});

// GET /skills/:skillId/lineage — 스킬 파생 관계
skillMetricsRoute.get("/skills/:skillId/lineage", async (c) => {
  const skillId = c.req.param("skillId");
  const svc = new SkillMetricsService(c.env.DB);
  const lineage = await svc.getSkillLineage(c.get("orgId"), skillId);
  return c.json(lineage);
});

// GET /skills/audit-log — 감사 로그 조회
skillMetricsRoute.get("/skills/audit-log", async (c) => {
  const parsed = auditLogQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillMetricsService(c.env.DB);
  const entries = await svc.getAuditLog(c.get("orgId"), parsed.data);
  return c.json({ entries, total: entries.length });
});
