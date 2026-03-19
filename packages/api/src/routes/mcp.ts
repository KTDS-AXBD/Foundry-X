/**
 * MCP Server Management Routes — Sprint 12 + Sprint 13 (F64)
 * CRUD + test connection + tools cache + prompts + sampling
 */
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  CreateMcpServerSchema,
  McpServerResponseSchema,
  McpTestResultSchema,
  McpPromptSchema,
  McpPromptMessageSchema,
  McpSamplingRequestSchema,
  McpSamplingResponseSchema,
  McpSamplingLogSchema,
  McpResourceSchema,
  McpResourceTemplateSchema,
  McpResourceContentSchema,
  ReadResourceRequestSchema,
  SubscribeResourceRequestSchema,
} from "../schemas/mcp.js";
import { McpServerRegistry } from "../services/mcp-registry.js";
import { createTransport } from "../services/mcp-transport.js";
import { McpRunner } from "../services/mcp-runner.js";
import { McpSamplingHandler } from "../services/mcp-sampling.js";
import { McpResourcesClient } from "../services/mcp-resources.js";
import { SSEManager } from "../services/sse-manager.js";
import { LLMService } from "../services/llm.js";
import type { Env } from "../env.js";

const app = new OpenAPIHono<{ Bindings: Env }>();

// ─── Helper: strip sensitive fields + add toolCount ───

function toResponse(server: Awaited<ReturnType<McpServerRegistry["getServer"]>>) {
  if (!server) return null;
  let toolCount = 0;
  if (server.toolsCache) {
    try {
      toolCount = JSON.parse(server.toolsCache).length;
    } catch {
      // invalid cache
    }
  }
  return {
    id: server.id,
    name: server.name,
    serverUrl: server.serverUrl,
    transportType: server.transportType,
    status: server.status,
    lastConnectedAt: server.lastConnectedAt,
    errorMessage: server.errorMessage,
    toolCount,
    createdAt: server.createdAt,
  };
}

// ─── Helper: get server or 404 ───

async function getServerOrNull(registry: McpServerRegistry, id: string) {
  return registry.getServer(id);
}

// ─── Helper: create McpRunner from server record ───

function createRunnerFromServer(
  server: NonNullable<Awaited<ReturnType<McpServerRegistry["getServer"]>>>,
  registry: McpServerRegistry,
) {
  const apiKey = server.apiKeyEncrypted
    ? registry.decryptApiKey(server.apiKeyEncrypted)
    : undefined;
  const transport = createTransport(server.transportType, {
    serverUrl: server.serverUrl,
    apiKey,
  });
  return new McpRunner(transport, server.name);
}

// ─── GET /mcp/servers ───

const listServers = createRoute({
  method: "get",
  path: "/mcp/servers",
  tags: ["MCP"],
  summary: "등록된 MCP 서버 목록 조회",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(McpServerResponseSchema) } },
      description: "MCP 서버 목록",
    },
  },
});

app.openapi(listServers, async (c) => {
  const registry = new McpServerRegistry(c.env.DB);
  const orgId = (c.get("jwtPayload") as Record<string, unknown> | undefined)?.orgId as string | undefined;
  const servers = await registry.listServers(orgId);
  return c.json(servers.map((s) => toResponse(s)!));
});

// ─── POST /mcp/servers ───

const createServer = createRoute({
  method: "post",
  path: "/mcp/servers",
  tags: ["MCP"],
  summary: "MCP 서버 등록",
  request: {
    body: { content: { "application/json": { schema: CreateMcpServerSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: McpServerResponseSchema } },
      description: "생성된 MCP 서버",
    },
  },
});

app.openapi(createServer, async (c) => {
  const body = c.req.valid("json");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await registry.createServer(body);
  return c.json(toResponse(server)!, 201);
});

// ─── DELETE /mcp/servers/:id ───

const deleteServer = createRoute({
  method: "delete",
  path: "/mcp/servers/{id}",
  tags: ["MCP"],
  summary: "MCP 서버 삭제",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ deleted: z.boolean() }) } },
      description: "삭제 결과",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
  },
});

app.openapi(deleteServer, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }
  const deleted = await registry.deleteServer(id);
  return c.json({ deleted });
});

// ─── POST /mcp/servers/:id/test ───

const testConnection = createRoute({
  method: "post",
  path: "/mcp/servers/{id}/test",
  tags: ["MCP"],
  summary: "MCP 서버 연결 테스트",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: McpTestResultSchema } },
      description: "연결 테스트 결과",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
  },
});

app.openapi(testConnection, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  try {
    const runner = createRunnerFromServer(server, registry);
    const tools = await runner.listTools();

    await registry.updateStatus(id, "active");
    await registry.cacheTools(id, tools);

    return c.json({
      status: "connected" as const,
      tools,
      toolCount: tools.length,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await registry.updateStatus(id, "error", errorMessage);
    return c.json({
      status: "error" as const,
      error: errorMessage,
    });
  }
});

// ─── GET /mcp/servers/:id/tools ───

const TOOLS_CACHE_TTL_MS = 5 * 60 * 1000; // 5분

const getServerTools = createRoute({
  method: "get",
  path: "/mcp/servers/{id}/tools",
  tags: ["MCP"],
  summary: "MCP 서버 도구 목록 조회 (캐시 5분 TTL)",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            tools: z.array(z.object({ name: z.string(), description: z.string() })),
            cached: z.boolean(),
            cachedAt: z.string().nullable(),
          }),
        },
      },
      description: "도구 목록",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
  },
});

app.openapi(getServerTools, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  // Check if cache is still valid
  if (server.toolsCache && server.toolsCachedAt) {
    const cachedAt = new Date(server.toolsCachedAt).getTime();
    const now = Date.now();
    if (now - cachedAt < TOOLS_CACHE_TTL_MS) {
      try {
        const tools = JSON.parse(server.toolsCache);
        return c.json({ tools, cached: true, cachedAt: server.toolsCachedAt });
      } catch {
        // parse fail — fall through to live fetch
      }
    }
  }

  // Try live fetch
  try {
    const runner = createRunnerFromServer(server, registry);
    const tools = await runner.listTools();
    await registry.cacheTools(id, tools);
    return c.json({ tools, cached: false, cachedAt: new Date().toISOString() });
  } catch {
    // Fallback to stale cache
    if (server.toolsCache) {
      try {
        const tools = JSON.parse(server.toolsCache);
        return c.json({ tools, cached: true, cachedAt: server.toolsCachedAt });
      } catch {
        // no valid cache at all
      }
    }
    return c.json({ tools: [], cached: false, cachedAt: null });
  }
});

// ─── GET /mcp/servers/:id/prompts ─── (Sprint 13 F64)

const listPrompts = createRoute({
  method: "get",
  path: "/mcp/servers/{id}/prompts",
  tags: ["MCP"],
  summary: "MCP 서버 프롬프트 목록 조회",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ prompts: z.array(McpPromptSchema) }),
        },
      },
      description: "프롬프트 목록",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
  },
});

app.openapi(listPrompts, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  try {
    const runner = createRunnerFromServer(server, registry);
    const prompts = await runner.listPrompts();
    return c.json({ prompts });
  } catch (err) {
    return c.json({ prompts: [] });
  }
});

// ─── POST /mcp/servers/:id/prompts/:name ─── (Sprint 13 F64)

const getPrompt = createRoute({
  method: "post",
  path: "/mcp/servers/{id}/prompts/{name}",
  tags: ["MCP"],
  summary: "MCP 프롬프트 실행 (인자 포함)",
  request: {
    params: z.object({ id: z.string(), name: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            arguments: z.record(z.string()).optional(),
          }),
        },
      },
      required: false,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ messages: z.array(McpPromptMessageSchema) }),
        },
      },
      description: "프롬프트 실행 결과 메시지",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
    500: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "프롬프트 실행 실패",
    },
  },
});

app.openapi(getPrompt, async (c) => {
  const { id, name } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  try {
    const body = await c.req.json().catch(() => ({})) as { arguments?: Record<string, string> };
    const runner = createRunnerFromServer(server, registry);
    const messages = await runner.getPrompt(name, body.arguments);
    return c.json({ messages });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: errorMessage }, 500);
  }
});

// ─── POST /mcp/servers/:id/sampling ─── (Sprint 13 F64)

const handleSampling = createRoute({
  method: "post",
  path: "/mcp/servers/{id}/sampling",
  tags: ["MCP"],
  summary: "MCP Sampling — 서버 대신 LLM 추론 수행",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: McpSamplingRequestSchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: McpSamplingResponseSchema },
      },
      description: "LLM 추론 결과",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "유효성 검증 실패",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
    429: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "요청 제한 초과",
    },
  },
});

app.openapi(handleSampling, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  const body = c.req.valid("json");
  const llmService = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const handler = new McpSamplingHandler(llmService, c.env.DB);

  try {
    const result = await handler.handleSamplingRequest(id, body);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Rate limit")) {
      return c.json({ error: message }, 429);
    }
    if (message.includes("maxTokens") || message.includes("Image content")) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

// ─── GET /mcp/sampling/log ─── (Sprint 13 F64)

const getSamplingLog = createRoute({
  method: "get",
  path: "/mcp/sampling/log",
  tags: ["MCP"],
  summary: "MCP Sampling 이력 조회",
  request: {
    query: z.object({
      serverId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ logs: z.array(McpSamplingLogSchema) }),
        },
      },
      description: "Sampling 이력",
    },
  },
});

app.openapi(getSamplingLog, async (c) => {
  const { serverId, limit } = c.req.valid("query");

  let query: string;
  const bindings: unknown[] = [];

  if (serverId) {
    query =
      "SELECT id, server_id, model, max_tokens, tokens_used, duration_ms, status, created_at FROM mcp_sampling_log WHERE server_id = ? ORDER BY created_at DESC LIMIT ?";
    bindings.push(serverId, limit);
  } else {
    query =
      "SELECT id, server_id, model, max_tokens, tokens_used, duration_ms, status, created_at FROM mcp_sampling_log ORDER BY created_at DESC LIMIT ?";
    bindings.push(limit);
  }

  const { results } = await c.env.DB.prepare(query).bind(...bindings).all<{
    id: string;
    server_id: string;
    model: string;
    max_tokens: number;
    tokens_used: number | null;
    duration_ms: number | null;
    status: string;
    created_at: string;
  }>();

  const logs = results.map((r) => ({
    id: r.id,
    serverId: r.server_id,
    model: r.model,
    maxTokens: r.max_tokens,
    tokensUsed: r.tokens_used,
    durationMs: r.duration_ms,
    status: r.status,
    createdAt: r.created_at,
  }));

  return c.json({ logs });
});

// ─── GET /mcp/servers/:id/resources ─── (Sprint 14 F67)

const listResources = createRoute({
  method: "get",
  path: "/mcp/servers/{id}/resources",
  tags: ["MCP"],
  summary: "MCP 서버 리소스 목록 조회",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ resources: z.array(McpResourceSchema) }),
        },
      },
      description: "리소스 목록",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
  },
});

app.openapi(listResources, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  const client = new McpResourcesClient(registry);
  const resources = await client.listResources(id);
  return c.json({ resources });
});

// ─── GET /mcp/servers/:id/resources/templates ─── (Sprint 14 F67)

const listResourceTemplates = createRoute({
  method: "get",
  path: "/mcp/servers/{id}/resources/templates",
  tags: ["MCP"],
  summary: "MCP 서버 리소스 템플릿 목록 조회",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ resourceTemplates: z.array(McpResourceTemplateSchema) }),
        },
      },
      description: "리소스 템플릿 목록",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
  },
});

app.openapi(listResourceTemplates, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  const client = new McpResourcesClient(registry);
  const resourceTemplates = await client.listResourceTemplates(id);
  return c.json({ resourceTemplates });
});

// ─── POST /mcp/servers/:id/resources/read ─── (Sprint 14 F67)

const readResource = createRoute({
  method: "post",
  path: "/mcp/servers/{id}/resources/read",
  tags: ["MCP"],
  summary: "MCP 리소스 내용 읽기",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: ReadResourceRequestSchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ contents: z.array(McpResourceContentSchema) }),
        },
      },
      description: "리소스 내용",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
    500: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "리소스 읽기 실패",
    },
  },
});

app.openapi(readResource, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  const body = c.req.valid("json");
  const client = new McpResourcesClient(registry);
  try {
    const contents = await client.readResource(id, body.uri);
    return c.json({ contents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// ─── POST /mcp/servers/:id/resources/subscribe ─── (Sprint 14 F67)

const subscribeResource = createRoute({
  method: "post",
  path: "/mcp/servers/{id}/resources/subscribe",
  tags: ["MCP"],
  summary: "MCP 리소스 구독 (변경 알림)",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: SubscribeResourceRequestSchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ subscribed: z.boolean(), uri: z.string() }),
        },
      },
      description: "구독 결과",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "서버를 찾을 수 없음",
    },
    500: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "구독 실패",
    },
  },
});

app.openapi(subscribeResource, async (c) => {
  const { id } = c.req.valid("param");
  const registry = new McpServerRegistry(c.env.DB);
  const server = await getServerOrNull(registry, id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  const body = c.req.valid("json");
  const sse = new SSEManager(c.env.DB);
  const client = new McpResourcesClient(registry, sse);
  try {
    await client.subscribeResource(id, body.uri);
    return c.json({ subscribed: true, uri: body.uri });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
