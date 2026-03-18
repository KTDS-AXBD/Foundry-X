import { z } from "@hono/zod-openapi";

export const CreateMcpServerSchema = z
  .object({
    name: z.string().min(1).max(100),
    serverUrl: z.string().url(),
    transportType: z.enum(["sse", "http"]).default("sse"),
    apiKey: z.string().optional(),
  })
  .openapi("CreateMcpServer");

export const McpServerResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    serverUrl: z.string(),
    transportType: z.enum(["sse", "http"]),
    status: z.enum(["active", "inactive", "error"]),
    lastConnectedAt: z.string().nullable(),
    errorMessage: z.string().nullable(),
    toolCount: z.number(),
    createdAt: z.string(),
  })
  .openapi("McpServerResponse");

export const McpTestResultSchema = z
  .object({
    status: z.enum(["connected", "error"]),
    tools: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
    toolCount: z.number().optional(),
    error: z.string().optional(),
  })
  .openapi("McpTestResult");
