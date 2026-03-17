import { z } from "@hono/zod-openapi";

const MarkerFileSchema = z.object({
  path: z.string(),
  type: z.string(),
});

const ModuleInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  role: z.string(),
});

export const RepoProfileSchema = z
  .object({
    mode: z.enum(["brownfield", "greenfield"]),
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    buildTools: z.array(z.string()),
    testFrameworks: z.array(z.string()),
    ci: z.string().nullable(),
    packageManager: z.string().nullable(),
    markers: z.array(MarkerFileSchema),
    entryPoints: z.array(z.string()),
    modules: z.array(ModuleInfoSchema),
    architecturePattern: z.string(),
    scripts: z.record(z.string()).optional(),
  })
  .openapi("RepoProfile");
