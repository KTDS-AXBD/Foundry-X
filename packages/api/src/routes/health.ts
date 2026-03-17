import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { HealthResponseSchema } from "../schemas/health.js";
import type { HealthScore } from "@foundry-x/shared";
import type { Env } from "../env.js";
import { GitHubService } from "../services/github.js";
import { KVCacheService } from "../services/kv-cache.js";
import { HealthCalculator } from "../services/health-calc.js";

type EnvWithCache = Env & { CACHE: KVNamespace };

export const healthRoute = new OpenAPIHono<{ Bindings: EnvWithCache }>();

const MOCK_HEALTH: HealthScore = {
  overall: 82,
  specToCode: 85,
  codeToTest: 78,
  specToTest: 80,
  grade: "B",
};

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
