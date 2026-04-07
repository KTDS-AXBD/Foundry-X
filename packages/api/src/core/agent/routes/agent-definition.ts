/**
 * F221: Agent-as-Code — YAML/JSON import/export 라우트
 */

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  ImportAgentDefinitionSchema,
  AgentDefinitionResponseSchema,
  AgentDefinitionSchema,
} from "../schemas/agent-definition.js";
import { CustomRoleManager } from "../../harness/services/custom-role-manager.js";
import type { Env } from "../../../env.js";

export const agentDefinitionRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── POST /agent-definitions/import ───

const importRoute = createRoute({
  method: "post",
  path: "/agent-definitions/import",
  request: {
    body: { content: { "application/json": { schema: ImportAgentDefinitionSchema } } },
  },
  responses: {
    201: {
      description: "Imported agent definition",
      content: { "application/json": { schema: AgentDefinitionResponseSchema } },
    },
    400: { description: "Invalid definition" },
  },
  tags: ["Agent Definition"],
});

agentDefinitionRoute.openapi(importRoute, async (c) => {
  const body = c.req.valid("json");
  const mgr = new CustomRoleManager(c.env.DB);

  try {
    const role = await mgr.importFromDefinition(body.content, body.format, body.orgId);
    return c.json(role, 201);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

// ─── GET /agent-definitions/:roleId/export ───

const exportRoute = createRoute({
  method: "get",
  path: "/agent-definitions/{roleId}/export",
  request: {
    params: z.object({ roleId: z.string() }),
    query: z.object({ format: z.enum(["yaml", "json"]).optional().default("yaml") }),
  },
  responses: {
    200: {
      description: "Exported agent definition",
      content: { "text/plain": { schema: z.string() } },
    },
    404: { description: "Role not found" },
  },
  tags: ["Agent Definition"],
});

agentDefinitionRoute.openapi(exportRoute, async (c) => {
  const { roleId } = c.req.valid("param");
  const { format } = c.req.valid("query");
  const mgr = new CustomRoleManager(c.env.DB);

  try {
    const content = format === "json"
      ? await mgr.exportAsJson(roleId)
      : await mgr.exportAsYaml(roleId);

    const contentType = format === "json" ? "application/json" : "text/yaml";
    return c.text(content, 200, { "Content-Type": contentType });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 404);
  }
});

// ─── GET /agent-definitions/schema ───

const schemaRoute = createRoute({
  method: "get",
  path: "/agent-definitions/schema",
  responses: {
    200: {
      description: "Agent definition schema info",
      content: { "application/json": { schema: z.object({ schema: AgentDefinitionSchema }) } },
    },
  },
  tags: ["Agent Definition"],
});

agentDefinitionRoute.openapi(schemaRoute, async (c) => {
  return c.json({
    schema: {
      name: "AgentDefinition",
      description: "YAML/JSON agent definition format for Agent-as-Code",
      fields: {
        name: { required: true, type: "string", description: "역할 식별자" },
        systemPrompt: { required: true, type: "string", description: "기본 시스템 프롬프트" },
        persona: { required: false, type: "string", description: "상세 성격/역할 프롬프트" },
        dependencies: { required: false, type: "string[]", description: "필요 도구/패키지" },
        customization: { required: false, type: "Record", description: "사용자 설정 가능 파라미터" },
        menu: { required: false, type: "MenuItem[]", description: "에이전트 액션 메뉴" },
      },
    },
  } as any);
});
