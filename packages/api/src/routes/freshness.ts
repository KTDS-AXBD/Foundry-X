import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { FreshnessSchema } from "../schemas/freshness.js";
import type { FreshnessReport } from "@foundry-x/shared";

export const freshnessRoute = new OpenAPIHono();

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

freshnessRoute.openapi(getFreshness, (c) => {
  return c.json(MOCK_FRESHNESS);
});
