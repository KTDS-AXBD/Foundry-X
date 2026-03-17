import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { HealthResponseSchema } from "../schemas/health.js";
import type { HealthScore } from "@foundry-x/shared";

export const healthRoute = new OpenAPIHono();

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

healthRoute.openapi(getHealth, (c) => {
  return c.json(MOCK_HEALTH);
});
