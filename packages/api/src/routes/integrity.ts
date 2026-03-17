import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { IntegritySchema } from "../schemas/integrity.js";
import type { HarnessIntegrity } from "@foundry-x/shared";

export const integrityRoute = new OpenAPIHono();

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

integrityRoute.openapi(getIntegrity, (c) => {
  return c.json(MOCK_INTEGRITY);
});
