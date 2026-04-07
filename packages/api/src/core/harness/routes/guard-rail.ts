// ─── F357+F358: Guard Rail API Routes (Sprint 161, Phase 17) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  DiagnosticResultSchema,
  DetectRequestSchema,
  DetectResultSchema,
  ProposalSchema,
  ProposalListSchema,
  ProposalUpdateSchema,
  GenerateResultSchema,
  DeployResultSchema,
} from "../schemas/guard-rail-schema.js";
import { DataDiagnosticService } from "../services/data-diagnostic-service.js";
import { PatternDetectorService } from "../services/pattern-detector-service.js";
import { RuleGeneratorService } from "../services/rule-generator-service.js";
import { GuardRailDeployService, DeployError } from "../services/guard-rail-deploy-service.js";
import { RuleEffectivenessService } from "../services/rule-effectiveness-service.js";
import { RuleEffectivenessResponseSchema } from "../../../modules/portal/schemas/metrics-schema.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";

export const guardRailRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// ── GET /guard-rail/diagnostic — F357: 데이터 진단 ────────────────────

const diagnosticRoute = createRoute({
  method: "get",
  path: "/guard-rail/diagnostic",
  tags: ["GuardRail"],
  responses: {
    200: {
      description: "Data diagnostic result",
      content: { "application/json": { schema: DiagnosticResultSchema } },
    },
  },
});

guardRailRoute.openapi(diagnosticRoute, async (c) => {
  const tenantId = c.get("orgId");
  const svc = new DataDiagnosticService(c.env.DB);
  const result = await svc.diagnose(tenantId);
  return c.json(result, 200);
});

// ── POST /guard-rail/detect — F358: 패턴 감지 ────────────────────

const detectRoute = createRoute({
  method: "post",
  path: "/guard-rail/detect",
  tags: ["GuardRail"],
  request: {
    body: {
      content: { "application/json": { schema: DetectRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Pattern detection result",
      content: { "application/json": { schema: DetectResultSchema } },
    },
  },
});

guardRailRoute.openapi(detectRoute, async (c) => {
  const tenantId = c.get("orgId");
  const body = c.req.valid("json");
  const svc = new PatternDetectorService(c.env.DB);
  const result = await svc.detect(tenantId, {
    minOccurrences: body.minOccurrences,
    sinceDays: body.sinceDays,
  });
  return c.json(result, 200);
});

// ── POST /guard-rail/generate — F358: Rule 초안 생성 ────────────────────

const generateRoute = createRoute({
  method: "post",
  path: "/guard-rail/generate",
  tags: ["GuardRail"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            patternIds: z.array(z.string()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Rule generation result",
      content: { "application/json": { schema: GenerateResultSchema } },
    },
    500: {
      description: "Server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

guardRailRoute.openapi(generateRoute, async (c) => {
  const tenantId = c.get("orgId");
  const body = c.req.valid("json");
  const apiKey = c.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  const svc = new RuleGeneratorService(c.env.DB, apiKey);
  const result = await svc.generate(tenantId, body.patternIds);
  return c.json(result, 200);
});

// ── GET /guard-rail/proposals — F358: 제안 목록 조회 ────────────────────

const proposalsListRoute = createRoute({
  method: "get",
  path: "/guard-rail/proposals",
  tags: ["GuardRail"],
  request: {
    query: z.object({
      status: z.enum(["pending", "approved", "rejected", "modified"]).optional(),
      limit: z.coerce.number().min(1).max(100).optional().default(20),
      offset: z.coerce.number().min(0).optional().default(0),
    }),
  },
  responses: {
    200: {
      description: "Proposal list",
      content: { "application/json": { schema: ProposalListSchema } },
    },
  },
});

guardRailRoute.openapi(proposalsListRoute, async (c) => {
  const tenantId = c.get("orgId");
  const query = c.req.valid("query");
  const { status, limit, offset } = query;

  const where = status
    ? "WHERE tenant_id = ? AND status = ?"
    : "WHERE tenant_id = ?";
  const binds = status ? [tenantId, status] : [tenantId];

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM guard_rail_proposals ${where}`,
  )
    .bind(...binds)
    .first<{ total: number }>();

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM guard_rail_proposals ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...binds, limit, offset)
    .all();

  const items = (results ?? []).map((r) => ({
    id: r.id as string,
    tenantId: r.tenant_id as string,
    patternId: r.pattern_id as string,
    ruleContent: r.rule_content as string,
    ruleFilename: r.rule_filename as string,
    rationale: r.rationale as string,
    llmModel: r.llm_model as string,
    status: r.status as "pending" | "approved" | "rejected" | "modified",
    reviewedAt: (r.reviewed_at as string) || null,
    reviewedBy: (r.reviewed_by as string) || null,
    createdAt: r.created_at as string,
  }));

  return c.json({ items, total: countRow?.total ?? 0 }, 200);
});

// ── PATCH /guard-rail/proposals/:id — F358: 제안 승인/거부 ────────────────────

const proposalUpdateRoute = createRoute({
  method: "patch",
  path: "/guard-rail/proposals/{id}",
  tags: ["GuardRail"],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: ProposalUpdateSchema } },
    },
  },
  responses: {
    200: {
      description: "Updated proposal",
      content: { "application/json": { schema: ProposalSchema } },
    },
    404: {
      description: "Proposal not found",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

guardRailRoute.openapi(proposalUpdateRoute, async (c) => {
  const tenantId = c.get("orgId");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const now = new Date().toISOString();

  // 기존 확인
  const existing = await c.env.DB.prepare(
    "SELECT * FROM guard_rail_proposals WHERE id = ? AND tenant_id = ?",
  )
    .bind(id, tenantId)
    .first();

  if (!existing) {
    return c.json({ error: "Proposal not found" }, 404);
  }

  // 업데이트
  const ruleContent = body.ruleContent ?? (existing.rule_content as string);
  await c.env.DB.prepare(
    `UPDATE guard_rail_proposals SET status = ?, rule_content = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
  )
    .bind(body.status, ruleContent, now, body.reviewedBy ?? null, id)
    .run();

  // 승인 시 패턴 status → resolved
  if (body.status === "approved") {
    await c.env.DB.prepare(
      "UPDATE failure_patterns SET status = 'resolved', updated_at = ? WHERE id = ?",
    )
      .bind(now, existing.pattern_id as string)
      .run();
  }

  return c.json(
    {
      id,
      tenantId,
      patternId: existing.pattern_id as string,
      ruleContent,
      ruleFilename: existing.rule_filename as string,
      rationale: existing.rationale as string,
      llmModel: existing.llm_model as string,
      status: body.status,
      reviewedAt: now,
      reviewedBy: body.reviewedBy ?? null,
      createdAt: existing.created_at as string,
    },
    200,
  );
});

// ── POST /guard-rail/proposals/:id/deploy — F359: Rule 배치 ────────────────────

const proposalDeployRoute = createRoute({
  method: "post",
  path: "/guard-rail/proposals/{id}/deploy",
  tags: ["GuardRail"],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Deploy result with file content",
      content: { "application/json": { schema: DeployResultSchema } },
    },
    400: {
      description: "Proposal not in approved state",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    404: {
      description: "Proposal not found",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

guardRailRoute.openapi(proposalDeployRoute, async (c) => {
  const tenantId = c.get("orgId");
  const { id } = c.req.valid("param");

  try {
    const svc = new GuardRailDeployService(c.env.DB);
    const result = await svc.generateRuleFile(id, tenantId);
    return c.json(result, 200);
  } catch (err) {
    if (err instanceof DeployError) {
      return c.json(
        { error: err.message },
        err.statusCode as 400 | 404,
      );
    }
    throw err;
  }
});

// ── GET /guard-rail/effectiveness — F361: Rule 효과 측정 (Sprint 164) ──

const effectivenessRoute = createRoute({
  method: "get",
  path: "/guard-rail/effectiveness",
  tags: ["GuardRail"],
  request: {
    query: z.object({
      windowDays: z.coerce.number().min(1).max(90).optional().default(14),
    }),
  },
  responses: {
    200: {
      description: "Rule effectiveness scores",
      content: { "application/json": { schema: RuleEffectivenessResponseSchema } },
    },
  },
});

guardRailRoute.openapi(effectivenessRoute, async (c) => {
  const tenantId = c.get("orgId");
  const { windowDays } = c.req.valid("query");
  const svc = new RuleEffectivenessService(c.env.DB);
  const items = await svc.measureAll(tenantId, windowDays);

  const measured = items.filter((i) => i.status === "measured");
  const averageScore =
    measured.length > 0
      ? Math.round(
          measured.reduce((sum, i) => sum + i.effectivenessScore, 0) /
            measured.length,
        )
      : 0;

  return c.json(
    {
      items,
      averageScore,
      totalRules: items.length,
      measuredRules: measured.length,
    },
    200,
  );
});
