/**
 * F223: 문서 Sharding 라우트 — shard CRUD + 에이전트별 조회
 */

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  ShardDocumentRequestSchema,
  DocumentShardSchema,
  ShardQuerySchema,
} from "../schemas/shard-doc.js";
import { ShardDocService } from "../services/shard-doc.js";
import type { Env } from "../env.js";

export const shardDocRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── POST /shard-doc ───

const shardRoute = createRoute({
  method: "post",
  path: "/shard-doc",
  request: {
    body: { content: { "application/json": { schema: ShardDocumentRequestSchema } } },
  },
  responses: {
    201: {
      description: "Document sharded successfully",
      content: { "application/json": { schema: z.object({ shards: z.array(DocumentShardSchema), count: z.number() }) } },
    },
    400: { description: "Invalid input" },
  },
  tags: ["Document Sharding"],
});

shardDocRoute.openapi(shardRoute, async (c) => {
  const body = c.req.valid("json");
  const svc = new ShardDocService(c.env.DB);

  try {
    const shards = await svc.shardDocument({
      documentId: body.documentId,
      title: body.title,
      content: body.content,
      orgId: body.orgId,
    });
    return c.json({ shards, count: shards.length }, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// ─── GET /shard-doc/:documentId ───

const listShardsRoute = createRoute({
  method: "get",
  path: "/shard-doc/{documentId}",
  request: {
    params: z.object({ documentId: z.string() }),
    query: ShardQuerySchema,
  },
  responses: {
    200: {
      description: "Document shards list",
      content: { "application/json": { schema: z.object({ shards: z.array(DocumentShardSchema) }) } },
    },
  },
  tags: ["Document Sharding"],
});

shardDocRoute.openapi(listShardsRoute, async (c) => {
  const { documentId } = c.req.valid("param");
  const { limit, offset } = c.req.valid("query");
  const svc = new ShardDocService(c.env.DB);

  const shards = await svc.listShards(documentId, limit, offset);
  return c.json({ shards });
});

// ─── GET /shard-doc/agent/:agentRole ───

const agentShardsRoute = createRoute({
  method: "get",
  path: "/shard-doc/agent/{agentRole}",
  request: {
    params: z.object({ agentRole: z.string() }),
    query: z.object({ documentId: z.string().optional() }),
  },
  responses: {
    200: {
      description: "Shards matching agent role",
      content: { "application/json": { schema: z.object({ shards: z.array(DocumentShardSchema), role: z.string() }) } },
    },
  },
  tags: ["Document Sharding"],
});

shardDocRoute.openapi(agentShardsRoute, async (c) => {
  const { agentRole } = c.req.valid("param");
  const { documentId } = c.req.valid("query");
  const svc = new ShardDocService(c.env.DB);

  const shards = await svc.getShardsForAgent(agentRole, documentId);
  return c.json({ shards, role: agentRole });
});

// ─── DELETE /shard-doc/:documentId ───

const deleteShardsRoute = createRoute({
  method: "delete",
  path: "/shard-doc/{documentId}",
  request: {
    params: z.object({ documentId: z.string() }),
  },
  responses: {
    200: { description: "Shards deleted" },
  },
  tags: ["Document Sharding"],
});

shardDocRoute.openapi(deleteShardsRoute, async (c) => {
  const { documentId } = c.req.valid("param");
  const svc = new ShardDocService(c.env.DB);

  await svc.deleteShards(documentId);
  return c.json({ deleted: true, documentId });
});
