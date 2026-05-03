import { z } from "@hono/zod-openapi";

// ─── F225: Command Registry Schemas ───

export const CommandCreateSchema = z
  .object({
    namespace: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    argsSchema: z.record(z.unknown()).default({}),
    handler: z.string().min(1).max(10000),
    requiredPermissions: z.array(z.string().max(100)).max(20).default([]),
    enabled: z.boolean().default(true),
  })
  .openapi("CommandCreate");

export const CommandResponseSchema = z
  .object({
    id: z.string(),
    namespace: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    argsSchema: z.record(z.unknown()),
    handler: z.string(),
    requiredPermissions: z.array(z.string()),
    enabled: z.boolean(),
    orgId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("CommandResponse");

export const CommandExecuteSchema = z
  .object({
    args: z.record(z.unknown()).default({}),
  })
  .openapi("CommandExecute");

export const CommandResultSchema = z
  .object({
    success: z.boolean(),
    output: z.string(),
    error: z.string().optional(),
    durationMs: z.number(),
  })
  .openapi("CommandResult");
