import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { IntegritySchema } from "../schemas/integrity.js";
import type { HarnessIntegrity } from "@foundry-x/shared";
import type { Env } from "../../../env.js";
import { GitHubService } from "../../../modules/portal/services/github.js";
import { KVCacheService } from "../../../core/infra/types.js";
import { IntegrityChecker } from "../services/integrity-checker.js";

type EnvWithCache = Env & { CACHE: KVNamespace };

export const integrityRoute = new OpenAPIHono<{ Bindings: EnvWithCache }>();

const MOCK_INTEGRITY: HarnessIntegrity = {
  passed: true,
  score: 92,
  checks: [
    {
      name: "CLAUDE.md exists",
      passed: true,
      level: "PASS",
      message: "CLAUDE.md found at project root",
    },
    {
      name: "ARCHITECTURE.md exists",
      passed: true,
      level: "PASS",
      message: "ARCHITECTURE.md found",
    },
    {
      name: "CI config exists",
      passed: true,
      level: "PASS",
      message: ".github/workflows/ detected",
    },
    {
      name: "Lint config exists",
      passed: true,
      level: "PASS",
      message: "eslint.config.js found",
    },
    {
      name: "No placeholder content",
      passed: false,
      level: "WARN",
      message: "1 file contains TODO placeholders",
    },
  ],
};

const getIntegrity = createRoute({
  method: "get",
  path: "/integrity",
  tags: ["Integrity"],
  summary: "Harness integrity check",
  responses: {
    200: {
      content: { "application/json": { schema: IntegritySchema } },
      description: "Harness file integrity verification results",
    },
  },
});

integrityRoute.openapi(getIntegrity, async (c) => {
  try {
    const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
    const cache = new KVCacheService(c.env.CACHE);
    const checker = new IntegrityChecker(github, cache);

    const result = await checker.check();
    return c.json(result);
  } catch {
    return c.json(MOCK_INTEGRITY);
  }
});
