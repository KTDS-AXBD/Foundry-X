// ─── F146: Custom Agent Roles REST API (packages/api scope) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { CustomRoleManager } from "../../core/harness/services/custom-role-manager.js";
import type { Env } from "../../env.js";

// ─── Schemas ───

const CreateCustomRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1).max(10000),
  allowedTools: z.array(z.string()).optional(),
  preferredModel: z.string().optional(),
  preferredRunnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]).optional(),
  taskType: z.string().optional(),
  orgId: z.string().optional(),
}).openapi("CreateCustomRole");

const UpdateCustomRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(1).max(10000).optional(),
  allowedTools: z.array(z.string()).optional(),
  preferredModel: z.string().nullable().optional(),
  preferredRunnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]).optional(),
  taskType: z.string().optional(),
  enabled: z.boolean().optional(),
}).openapi("UpdateCustomRole");

const CustomRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  allowedTools: z.array(z.string()),
  preferredModel: z.string().nullable(),
  preferredRunnerType: z.string(),
  taskType: z.string(),
  orgId: z.string(),
  isBuiltin: z.boolean(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi("CustomRole");

// ─── Route ───

export const agentRoute = new OpenAPIHono<{ Bindings: Env }>();

const createCustomRole = createRoute({
  method: "post",
  path: "/agents/roles",
  tags: ["Agents"],
  summary: "커스텀 에이전트 역할 생성",
  request: { body: { content: { "application/json": { schema: CreateCustomRoleSchema } } } },
  responses: { 201: { content: { "application/json": { schema: CustomRoleSchema } }, description: "역할 생성 완료" } },
});

agentRoute.openapi(createCustomRole, async (c) => {
  const body = c.req.valid("json");
  const mgr = new CustomRoleManager(c.env.DB);
  const role = await mgr.createRole(body);
  return c.json(role, 201);
});

const listCustomRoles = createRoute({
  method: "get",
  path: "/agents/roles",
  tags: ["Agents"],
  summary: "에이전트 역할 목록 조회 (빌트인 + 커스텀)",
  request: { query: z.object({ orgId: z.string().optional(), includeDisabled: z.coerce.boolean().optional() }) },
  responses: { 200: { content: { "application/json": { schema: z.array(CustomRoleSchema) } }, description: "역할 목록" } },
});

agentRoute.openapi(listCustomRoles, async (c) => {
  const { orgId, includeDisabled } = c.req.valid("query");
  const mgr = new CustomRoleManager(c.env.DB);
  const roles = await mgr.listRoles(orgId, includeDisabled);
  return c.json(roles);
});

const getCustomRole = createRoute({
  method: "get",
  path: "/agents/roles/{id}",
  tags: ["Agents"],
  summary: "에이전트 역할 상세 조회",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { "application/json": { schema: CustomRoleSchema } }, description: "역할 상세" },
    404: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "역할을 찾을 수 없음" },
  },
});

agentRoute.openapi(getCustomRole, async (c) => {
  const { id } = c.req.valid("param");
  const mgr = new CustomRoleManager(c.env.DB);
  const role = await mgr.getRole(id);
  if (!role) return c.json({ error: "Role not found" }, 404);
  return c.json(role);
});

const updateCustomRole = createRoute({
  method: "put",
  path: "/agents/roles/{id}",
  tags: ["Agents"],
  summary: "에이전트 역할 수정 (빌트인 불가)",
  request: { params: z.object({ id: z.string() }), body: { content: { "application/json": { schema: UpdateCustomRoleSchema } } } },
  responses: {
    200: { content: { "application/json": { schema: CustomRoleSchema } }, description: "수정 완료" },
    403: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "빌트인 역할 수정 불가" },
    404: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "역할을 찾을 수 없음" },
  },
});

agentRoute.openapi(updateCustomRole, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const mgr = new CustomRoleManager(c.env.DB);
  try {
    const role = await mgr.updateRole(id, body);
    return c.json(role);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("builtin")) return c.json({ error: msg }, 403);
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    throw err;
  }
});

const deleteCustomRole = createRoute({
  method: "delete",
  path: "/agents/roles/{id}",
  tags: ["Agents"],
  summary: "에이전트 역할 삭제 (빌트인 불가)",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    204: { description: "삭제 완료" },
    403: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "빌트인 역할 삭제 불가" },
    404: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "역할을 찾을 수 없음" },
  },
});

agentRoute.openapi(deleteCustomRole, async (c) => {
  const { id } = c.req.valid("param");
  const mgr = new CustomRoleManager(c.env.DB);
  try {
    await mgr.deleteRole(id);
    return c.body(null, 204);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("builtin")) return c.json({ error: msg }, 403);
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    throw err;
  }
});
