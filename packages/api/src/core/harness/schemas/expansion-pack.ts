import { z } from "@hono/zod-openapi";

export const PackManifestSchema = z
  .object({
    agentRoles: z.array(z.string()).default([]),
    workflows: z.array(z.string()).default([]),
    commands: z.array(z.string()).default([]),
    dependencies: z.array(z.string()).default([]),
    config: z.record(z.unknown()).default({}),
  })
  .openapi("PackManifest");

export const ExpansionPackCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).default(""),
    domain: z.enum(["security", "data", "devops", "testing", "custom"]).default("custom"),
    version: z.string().default("1.0.0"),
    manifest: PackManifestSchema.default({
      agentRoles: [],
      workflows: [],
      commands: [],
      dependencies: [],
      config: {},
    }),
  })
  .openapi("ExpansionPackCreate");

export const ExpansionPackResponseSchema = z
  .object({
    id: z.string(),
    orgId: z.string(),
    name: z.string(),
    description: z.string(),
    domain: z.enum(["security", "data", "devops", "testing", "custom"]),
    version: z.string(),
    manifest: PackManifestSchema,
    status: z.enum(["draft", "published", "archived"]),
    author: z.string(),
    installCount: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("ExpansionPackResponse");

export const ExpansionPackUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    domain: z.enum(["security", "data", "devops", "testing", "custom"]).optional(),
    version: z.string().optional(),
    manifest: PackManifestSchema.optional(),
  })
  .openapi("ExpansionPackUpdate");

export const PackInstallSchema = z
  .object({
    config: z.record(z.unknown()).optional(),
  })
  .openapi("PackInstall");

export const PackInstallationResponseSchema = z
  .object({
    id: z.string(),
    packId: z.string(),
    orgId: z.string(),
    installedBy: z.string(),
    installedAt: z.string(),
    config: z.record(z.unknown()),
  })
  .openapi("PackInstallationResponse");
