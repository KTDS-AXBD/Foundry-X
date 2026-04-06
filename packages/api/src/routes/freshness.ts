import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { FreshnessSchema } from "../schemas/freshness.js";
import type { FreshnessReport } from "@foundry-x/shared";
import type { Env } from "../env.js";
import { GitHubService } from "../modules/portal/services/github.js";
import { KVCacheService } from "../services/kv-cache.js";
import { FreshnessChecker } from "../services/freshness-checker.js";

type EnvWithCache = Env & { CACHE: KVNamespace };

export const freshnessRoute = new OpenAPIHono<{ Bindings: EnvWithCache }>();

const MOCK_FRESHNESS: FreshnessReport = {
  documents: [
    {
      file: "CLAUDE.md",
      lastModified: "2026-03-17T00:00:00Z",
      codeLastCommit: "2026-03-17T00:00:00Z",
      stale: false,
      staleDays: 0,
    },
    {
      file: "ARCHITECTURE.md",
      lastModified: "2026-03-15T00:00:00Z",
      codeLastCommit: "2026-03-17T00:00:00Z",
      stale: true,
      staleDays: 2,
    },
  ],
  overallStale: true,
  checkedAt: new Date().toISOString(),
};

const getFreshness = createRoute({
  method: "get",
  path: "/freshness",
  tags: ["Freshness"],
  summary: "Harness freshness report",
  responses: {
    200: {
      content: { "application/json": { schema: FreshnessSchema } },
      description: "Harness document freshness check results",
    },
  },
});

freshnessRoute.openapi(getFreshness, async (c) => {
  try {
    const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
    const cache = new KVCacheService(c.env.CACHE);
    const checker = new FreshnessChecker(github, cache);

    const report = await checker.check();
    return c.json(report);
  } catch {
    return c.json(MOCK_FRESHNESS);
  }
});
