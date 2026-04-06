import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { RepoProfileSchema } from "../schemas/profile.js";
import type { RepoProfile } from "@foundry-x/shared";

export const profileRoute = new OpenAPIHono();

const MOCK_PROFILE: RepoProfile = {
  mode: "brownfield",
  languages: ["TypeScript", "Python"],
  frameworks: ["Hono", "Ink", "Vitest"],
  buildTools: ["tsc", "turborepo"],
  testFrameworks: ["vitest"],
  ci: "github-actions",
  packageManager: "pnpm",
  markers: [
    { path: "package.json", type: "node" },
    { path: "pyproject.toml", type: "python" },
  ],
  entryPoints: ["packages/cli/src/index.ts", "packages/api/src/index.ts"],
  modules: [
    { name: "cli", path: "packages/cli", role: "CLI application" },
    { name: "api", path: "packages/api", role: "API server" },
    { name: "shared", path: "packages/shared", role: "Shared types" },
  ],
  architecturePattern: "monorepo",
};

const getProfile = createRoute({
  method: "get",
  path: "/profile",
  tags: ["Profile"],
  summary: "Repository profile",
  responses: {
    200: {
      content: { "application/json": { schema: RepoProfileSchema } },
      description: "Detected repository profile (languages, frameworks, etc.)",
    },
  },
});

profileRoute.openapi(getProfile, (c) => {
  return c.json(MOCK_PROFILE);
});
