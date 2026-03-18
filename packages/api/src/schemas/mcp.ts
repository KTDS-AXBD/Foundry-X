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

// ─── Sprint 13: MCP Prompts Schemas (F64) ───

export const McpPromptSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    arguments: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          required: z.boolean().optional(),
        }),
      )
      .optional(),
  })
  .openapi("McpPrompt");

export const McpPromptMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.union([
      z.object({ type: z.literal("text"), text: z.string() }),
      z.object({
        type: z.literal("resource"),
        resource: z.object({
          uri: z.string(),
          text: z.string(),
          mimeType: z.string().optional(),
        }),
      }),
    ]),
  })
  .openapi("McpPromptMessage");

// ─── Sprint 13: MCP Sampling Schemas (F64) ───

export const McpSamplingRequestSchema = z
  .object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([
          z.object({ type: z.literal("text"), text: z.string() }),
          z.object({
            type: z.literal("image"),
            data: z.string(),
            mimeType: z.string(),
          }),
        ]),
      }),
    ),
    modelPreferences: z
      .object({
        hints: z.array(z.object({ name: z.string().optional() })).optional(),
        costPriority: z.number().optional(),
        speedPriority: z.number().optional(),
        intelligencePriority: z.number().optional(),
      })
      .optional(),
    systemPrompt: z.string().optional(),
    maxTokens: z.number().int().min(1).max(8192),
  })
  .openapi("McpSamplingRequest");

export const McpSamplingResponseSchema = z
  .object({
    role: z.literal("assistant"),
    content: z.object({ type: z.literal("text"), text: z.string() }),
    model: z.string(),
    stopReason: z.string().optional(),
  })
  .openapi("McpSamplingResponse");

export const McpSamplingLogSchema = z
  .object({
    id: z.string(),
    serverId: z.string(),
    model: z.string(),
    maxTokens: z.number(),
    tokensUsed: z.number().nullable(),
    durationMs: z.number().nullable(),
    status: z.string(),
    createdAt: z.string(),
  })
  .openapi("McpSamplingLog");
