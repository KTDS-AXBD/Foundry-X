import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  ReconciliationRunRequestSchema,
  ReconciliationRunResponseSchema,
  ReconciliationStatusResponseSchema,
  ReconciliationHistoryResponseSchema,
} from "../schemas/reconciliation.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { GitHubService } from "../services/github.js";
import { ReconciliationService } from "../services/reconciliation.js";
import { parseSpecRequirements } from "../../../services/spec-parser.js";

// ─── F99: Reconciliation Routes ───

export const reconciliationRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// ─── POST /api/reconciliation/run ───

const postRun = createRoute({
  method: "post",
  path: "/reconciliation/run",
  tags: ["Reconciliation"],
  summary: "Git↔D1 Reconciliation 실행",
  request: {
    body: {
      content: { "application/json": { schema: ReconciliationRunRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ReconciliationRunResponseSchema } },
      description: "Reconciliation 실행 결과",
    },
    403: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "권한 없음",
    },
  },
});

reconciliationRoute.openapi(postRun, async (c) => {
  const tenantId = c.get("tenantId" as never) as string | undefined;
  const userRole = c.get("userRole" as never) as string | undefined;

  if (userRole !== "admin") {
    return c.json({ error: "Admin only" }, 403);
  }

  const { strategy } = c.req.valid("json");
  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const specParser = { parseContent: parseSpecRequirements };
  const service = new ReconciliationService(c.env.DB, github, specParser);

  const result = await service.run(tenantId ?? "default", "manual", strategy);
  return c.json(result);
});

// ─── GET /api/reconciliation/status ───

const getStatus = createRoute({
  method: "get",
  path: "/reconciliation/status",
  tags: ["Reconciliation"],
  summary: "최근 Reconciliation 상태",
  responses: {
    200: {
      content: { "application/json": { schema: ReconciliationStatusResponseSchema } },
      description: "최근 실행 상태",
    },
  },
});

reconciliationRoute.openapi(getStatus, async (c) => {
  const tenantId = c.get("tenantId" as never) as string | undefined;
  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const specParser = { parseContent: parseSpecRequirements };
  const service = new ReconciliationService(c.env.DB, github, specParser);

  const result = await service.getStatus(tenantId ?? "default");
  return c.json(result);
});

// ─── GET /api/reconciliation/history ───

const getHistory = createRoute({
  method: "get",
  path: "/reconciliation/history",
  tags: ["Reconciliation"],
  summary: "Reconciliation 실행 이력",
  request: {
    query: z.object({
      limit: z.coerce.number().default(10).optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: ReconciliationHistoryResponseSchema } },
      description: "실행 이력",
    },
  },
});

reconciliationRoute.openapi(getHistory, async (c) => {
  const tenantId = c.get("tenantId" as never) as string | undefined;
  const { limit } = c.req.valid("query");
  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const specParser = { parseContent: parseSpecRequirements };
  const service = new ReconciliationService(c.env.DB, github, specParser);

  const result = await service.getHistory(tenantId ?? "default", limit ?? 10);
  return c.json(result);
});
