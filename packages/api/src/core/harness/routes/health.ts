import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { HealthResponseSchema, DetailedHealthSchema } from "../schemas/health.js";
import type { HealthScore } from "@foundry-x/shared";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { GitHubService } from "../../../modules/portal/services/github.js";
import { KVCacheService } from "../../../core/infra/types.js";
import { HealthCalculator } from "../services/health-calc.js";
import { MonitoringService } from "../services/monitoring.js";

type EnvWithCache = Env & { CACHE: KVNamespace };

export const healthRoute = new OpenAPIHono<{ Bindings: EnvWithCache }>();

const MOCK_HEALTH: HealthScore = {
  overall: 82,
  specToCode: 85,
  codeToTest: 78,
  specToTest: 80,
  grade: "B",
};

// ─── SDD Triangle Health (original) ───

const getHealth = createRoute({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "SDD Triangle Health Score",
  responses: {
    200: {
      content: { "application/json": { schema: HealthResponseSchema } },
      description: "Triangle health score (Spec↔Code↔Test)",
    },
  },
});

healthRoute.openapi(getHealth, async (c) => {
  try {
    const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
    const cache = new KVCacheService(c.env.CACHE);
    const calculator = new HealthCalculator(github, cache);

    const score = await calculator.calculate();
    return c.json(score);
  } catch {
    return c.json(MOCK_HEALTH);
  }
});

// ─── Detailed Infrastructure Health (Sprint 9 F51) ───

const getDetailedHealth = createRoute({
  method: "get",
  path: "/health/detailed",
  tags: ["Health"],
  summary: "Detailed infrastructure health check",
  responses: {
    200: {
      content: { "application/json": { schema: DetailedHealthSchema } },
      description: "Infrastructure health with D1/KV/GitHub status",
    },
  },
});

healthRoute.openapi(getDetailedHealth, async (c) => {
  const checks: Record<string, { status: "ok" | "error"; latency?: number; error?: string; rateLimit?: { remaining: number; limit: number } }> = {};

  // D1 check
  try {
    const start = Date.now();
    await c.env.DB.prepare("SELECT 1").first();
    checks.d1 = { status: "ok", latency: Date.now() - start };
  } catch (e) {
    checks.d1 = { status: "error", error: e instanceof Error ? e.message : "Unknown" };
  }

  // KV check
  try {
    const start = Date.now();
    await c.env.CACHE.get("__health_check__");
    checks.kv = { status: "ok", latency: Date.now() - start };
  } catch (e) {
    checks.kv = { status: "error", error: e instanceof Error ? e.message : "Unknown" };
  }

  // GitHub API check
  try {
    const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
    const rateLimit = await github.getRateLimit();
    checks.github = { status: "ok", rateLimit };
  } catch (e) {
    checks.github = { status: "error", error: e instanceof Error ? e.message : "Unknown" };
  }

  const hasError = Object.values(checks).some((ch) => ch.status === "error");

  return c.json({
    status: hasError ? "degraded" : "ok",
    version: "0.9.0",
    checks,
  });
});

// ─── Worker Stats (Sprint 24 F100) ───

const WorkerStatsSchema = z.object({
  requestsPerMinute: z.number(),
  avgResponseTimeMs: z.number(),
  errorRate: z.number(),
  activeConnections: z.number(),
  cpuTimeMs: z.number(),
  timestamp: z.string(),
});

const getMonitoringStats = createRoute({
  method: "get",
  path: "/orgs/{orgId}/monitoring/stats",
  tags: ["Health"],
  summary: "Workers 통계 (KV 캐시)",
  request: {
    params: z.object({ orgId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: WorkerStatsSchema } },
      description: "Worker performance stats (cached 5min)",
    },
  },
});

healthRoute.openapi(getMonitoringStats, async (c) => {
  const monitoring = new MonitoringService(c.env.CACHE, c.env.DB);
  const stats = await monitoring.getWorkerStats();
  return c.json(stats);
});
