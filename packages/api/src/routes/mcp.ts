/**
 * MCP Server Management Routes — Sprint 12
 * CRUD + test connection + tools cache
 */
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  CreateMcpServerSchema,
  McpServerResponseSchema,
  McpTestResultSchema,
} from "../schemas/mcp.js";
import { McpServerRegistry } from "../services/mcp-registry.js";
import { createTransport } from "../services/mcp-transport.js";
import { McpRunner } from "../services/mcp-runner.js";
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
  const servers = await registry.listServers();
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
  const server = await registry.getServer(id);
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
  const server = await registry.getServer(id);
  if (!server) {
    return c.json({ error: "Server not found" }, 404);
  }

  try {
    const apiKey = server.apiKeyEncrypted
      ? registry.decryptApiKey(server.apiKeyEncrypted)
      : undefined;
    const transport = createTransport(server.transportType, {
      serverUrl: server.serverUrl,
      apiKey,
    });
    const runner = new McpRunner(transport, server.name);
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
  const server = await registry.getServer(id);
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
    const apiKey = server.apiKeyEncrypted
      ? registry.decryptApiKey(server.apiKeyEncrypted)
      : undefined;
    const transport = createTransport(server.transportType, {
      serverUrl: server.serverUrl,
      apiKey,
    });
    const runner = new McpRunner(transport, server.name);
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

export default app;
