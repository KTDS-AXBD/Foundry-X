import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { harnessCheckResultSchema, violationHistorySchema } from "../schemas/harness.js";
import { HarnessRulesService } from "../services/harness-rules.js";
import { SSEManager } from "../services/sse-manager.js";
import type { Env } from "../env.js";
import type { JwtPayload } from "../middleware/auth.js";

export const harnessRoute = new OpenAPIHono<{ Bindings: Env }>();

function getTenantId(c: { get: (key: string) => unknown }): string {
  try {
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    return payload?.orgId || "default";
  } catch {
    return "default";
  }
}

// ─── GET /harness/rules/:projectId — 규칙 검사 실행 ───

const checkRulesRoute = createRoute({
  method: "get",
  path: "/harness/rules/{projectId}",
  tags: ["Harness"],
  summary: "Run harness evolution rules check",
  request: {
    params: z.object({ projectId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: harnessCheckResultSchema } },
      description: "Harness check result with score and violations",
    },
  },
});

harnessRoute.openapi(checkRulesRoute, async (c) => {
  const { projectId } = c.req.valid("param");
  const tenantId = getTenantId(c);
  const sseManager = new SSEManager(c.env.DB);
  const service = new HarnessRulesService(c.env.DB, sseManager);
  const result = await service.checkRules(tenantId, projectId);
  return c.json(result, 200);
});

// ─── GET /harness/violations/:projectId — 위반 이력 조회 ───

const violationHistoryRoute = createRoute({
  method: "get",
  path: "/harness/violations/{projectId}",
  tags: ["Harness"],
  summary: "Get harness violation history",
  request: {
    params: z.object({ projectId: z.string() }),
    query: z.object({ limit: z.coerce.number().default(20) }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: violationHistorySchema } },
      description: "Violation event history",
    },
  },
});

harnessRoute.openapi(violationHistoryRoute, async (c) => {
  const { projectId } = c.req.valid("param");
  const { limit } = c.req.valid("query");
  const tenantId = getTenantId(c);
  const service = new HarnessRulesService(c.env.DB, new SSEManager(c.env.DB));
  const result = await service.getViolationHistory(tenantId, projectId, limit);
  return c.json(result, 200);
});
