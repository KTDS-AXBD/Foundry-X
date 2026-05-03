// ─── F336: Agent Adapter REST API (Sprint 151) ───

import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  AgentAdapterListResponseSchema,
  AgentAdapterResponseSchema,
  AgentAdapterExecuteRequestSchema,
  AgentAdapterExecuteResponseSchema,
} from "../schemas/agent-adapter.js";
import { AgentAdapterRegistry } from "../services/agent-adapter-registry.js";
import { AgentAdapterFactory } from "../services/agent-adapter-factory.js";
import { ClaudeApiRunner } from "../services/claude-api-runner.js";
import type { Env } from "../../env.js";
import type { TenantVariables } from "../../middleware/tenant.js";

export const agentAdaptersRoute = new OpenAPIHono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

/**
 * 레지스트리 초기화 — YAML 에이전트 + 서비스 에이전트 등록
 * 요청마다 생성하지 않고 lazy singleton 패턴
 */
let registryInstance: AgentAdapterRegistry | null = null;

function getRegistry(env: Env): AgentAdapterRegistry {
  if (registryInstance) return registryInstance;

  const registry = new AgentAdapterRegistry();

  // YAML 에이전트 등록 (메타데이터 용도)
  const yamlAgents: Array<{
    name: string;
    role: "generator" | "discriminator" | "orchestrator";
    desc: string;
    model?: string;
  }> = [
    { name: "ogd-generator", role: "generator", desc: "O-G-D 산출물 생성자", model: "sonnet" },
    { name: "ogd-discriminator", role: "discriminator", desc: "O-G-D 산출물 판별자", model: "sonnet" },
    { name: "ogd-orchestrator", role: "orchestrator", desc: "O-G-D 루프 조율자", model: "sonnet" },
    { name: "shaping-generator", role: "generator", desc: "BD 형상화 PRD 생성자", model: "sonnet" },
    { name: "shaping-discriminator", role: "discriminator", desc: "BD 형상화 품질 검증", model: "sonnet" },
    { name: "shaping-orchestrator", role: "orchestrator", desc: "BD 형상화 루프 조율자", model: "sonnet" },
    { name: "spec-checker", role: "discriminator", desc: "SPEC/MEMORY/CLAUDE 정합성 검증", model: "haiku" },
    { name: "build-validator", role: "discriminator", desc: "빌드+테스트+타입체크 검증", model: "haiku" },
    { name: "deploy-verifier", role: "discriminator", desc: "배포 상태 검증", model: "haiku" },
    { name: "auto-reviewer", role: "discriminator", desc: "AI 자가 리뷰 3 페르소나", model: "sonnet" },
    { name: "expert-ta", role: "generator", desc: "Technical Architect 분석", model: "sonnet" },
    { name: "expert-aa", role: "generator", desc: "Application Architect 분석", model: "sonnet" },
    { name: "expert-ca", role: "generator", desc: "Cloud Architect 분석", model: "sonnet" },
    { name: "expert-da", role: "generator", desc: "Data Architect 분석", model: "sonnet" },
    { name: "expert-qa", role: "generator", desc: "Quality Assurance 분석", model: "sonnet" },
    { name: "six-hats-moderator", role: "orchestrator", desc: "Six Hats 토론 진행자", model: "sonnet" },
  ];

  for (const def of yamlAgents) {
    registry.register(
      AgentAdapterFactory.fromYamlDefinition(def.name, def.role, def.desc, def.model),
    );
  }

  // 서비스 기반 에이전트 — API key가 있을 때만 등록
  if (env.ANTHROPIC_API_KEY) {
    const runner = new ClaudeApiRunner(env.ANTHROPIC_API_KEY);
    registry.register(
      AgentAdapterFactory.wrapRunner(runner, "claude-api", "generator", "code-generation"),
    );
  }

  registryInstance = registry;
  return registry;
}

// ─── GET /agent-adapters — 목록 ───

const listRoute = createRoute({
  method: "get",
  path: "/agent-adapters",
  tags: ["AgentAdapter"],
  summary: "등록된 에이전트 어댑터 목록",
  request: {
    query: z.object({
      role: z.enum(["generator", "discriminator", "orchestrator"]).optional(),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: AgentAdapterListResponseSchema } },
      description: "어댑터 목록",
    },
  },
});

agentAdaptersRoute.openapi(listRoute, async (c) => {
  const registry = getRegistry(c.env);
  const { role } = c.req.valid("query");

  const items = role ? registry.getByRole(role) : registry.list();

  return c.json({
    items: items.map((a) => ({
      name: a.name,
      role: a.role,
      metadata: a.metadata,
    })),
    total: items.length,
  });
});

// ─── GET /agent-adapters/:name — 상세 ───

const getRoute = createRoute({
  method: "get",
  path: "/agent-adapters/{name}",
  tags: ["AgentAdapter"],
  summary: "에이전트 어댑터 상세",
  request: {
    params: z.object({ name: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: AgentAdapterResponseSchema } },
      description: "어댑터 상세",
    },
    404: { description: "Not found" },
  },
});

agentAdaptersRoute.openapi(getRoute, async (c) => {
  const registry = getRegistry(c.env);
  const { name } = c.req.valid("param");
  const adapter = registry.get(name);

  if (!adapter) {
    return c.json({ error: `Adapter '${name}' not found` }, 404);
  }

  return c.json({
    name: adapter.name,
    role: adapter.role,
    metadata: adapter.metadata,
  });
});

// ─── POST /agent-adapters/:name/execute — 실행 ───

const executeRoute = createRoute({
  method: "post",
  path: "/agent-adapters/{name}/execute",
  tags: ["AgentAdapter"],
  summary: "에이전트 어댑터 실행",
  request: {
    params: z.object({ name: z.string() }),
    body: {
      content: { "application/json": { schema: AgentAdapterExecuteRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: AgentAdapterExecuteResponseSchema } },
      description: "실행 결과",
    },
    404: { description: "Not found" },
  },
});

agentAdaptersRoute.openapi(executeRoute, async (c) => {
  const registry = getRegistry(c.env);
  const { name } = c.req.valid("param");
  const body = c.req.valid("json");
  const adapter = registry.get(name);

  if (!adapter) {
    return c.json({ error: `Adapter '${name}' not found` }, 404);
  }

  const result = await adapter.execute({
    taskId: body.taskId,
    tenantId: body.tenantId,
    round: 1,
    loopMode: body.loopMode ?? "retry",
    previousFeedback: [],
    metadata: body.metadata,
  });

  return c.json(result);
});

// 테스트용 레지스트리 리셋
export function resetRegistry(): void {
  registryInstance = null;
}
