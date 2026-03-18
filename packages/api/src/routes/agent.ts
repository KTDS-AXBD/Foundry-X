import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  AgentProfileSchema,
  ConstraintCheckRequestSchema,
  ConstraintCheckResultSchema,
  AgentTaskSchema,
  CreateTaskRequestSchema,
  AgentCapabilityDefinitionSchema,
  AgentExecuteRequestSchema,
  AgentExecutionResultSchema,
  AgentRunnerInfoSchema,
} from "../schemas/agent.js";
import type { AgentProfile, AgentActivity } from "@foundry-x/shared";
import type { AgentRunnerInfo } from "../services/execution-types.js";
import { createAgentRunner } from "../services/agent-runner.js";
import { getDb } from "../db/index.js";
import { agentSessions } from "../db/schema.js";
import { SSEManager } from "../services/sse-manager.js";
import { AgentOrchestrator } from "../services/agent-orchestrator.js";
import type { Env } from "../env.js";

export const agentRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── F55: SSEManager 공유 인스턴스 (Workers isolate 내 싱글턴) ───
let sharedSSEManager: SSEManager | null = null;

function getSSEManager(db: D1Database): SSEManager {
  if (!sharedSSEManager) {
    sharedSSEManager = new SSEManager(db);
  }
  return sharedSSEManager;
}

// ─── Mock Data (fallback when DB is empty) ───

const MOCK_AGENTS: AgentProfile[] = [
  {
    id: "agent-code-review",
    name: "Code Review Agent",
    capabilities: [
      { action: "review", scope: "pull-request", tools: ["eslint", "prettier"] },
      { action: "suggest", scope: "refactoring", tools: ["ast-grep", "jscodeshift"] },
    ],
    constraints: [
      { tier: "always", rule: "Run lint before review", reason: "Catches trivial issues early" },
      { tier: "ask", rule: "Auto-fix formatting", reason: "May conflict with team style preferences" },
      { tier: "never", rule: "Push directly to main", reason: "Branch protection policy" },
    ],
    activity: { status: "idle" },
  },
  {
    id: "agent-test-writer",
    name: "Test Writer Agent",
    capabilities: [
      { action: "generate", scope: "unit-test", tools: ["vitest", "testing-library"] },
      { action: "analyze", scope: "coverage", tools: ["v8", "istanbul"] },
    ],
    constraints: [
      { tier: "always", rule: "Match existing test patterns", reason: "Consistency with codebase conventions" },
      { tier: "ask", rule: "Add snapshot tests", reason: "Snapshots can be brittle and noisy" },
      { tier: "never", rule: "Delete existing tests", reason: "May remove intentional regression guards" },
    ],
    activity: {
      status: "running",
      currentTask: "Generating tests for harness/builders",
      startedAt: "2026-03-17T09:00:00Z",
      progress: 65,
      tokenUsed: 2400,
    },
  },
];

const SESSION_STATUS_MAP: Record<string, AgentActivity["status"]> = {
  active: "running",
  completed: "completed",
  failed: "error",
  escalated: "waiting",
};

// ─── OpenAPI Routes ───

const getAgents = createRoute({
  method: "get",
  path: "/agents",
  tags: ["Agents"],
  summary: "List all agents",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(AgentProfileSchema) } },
      description: "Agent profiles with capabilities, constraints, and activity",
    },
  },
});

agentRoute.openapi(getAgents, async (c) => {
  // Try D1 agents table first (Sprint 9 orchestration)
  try {
    if (c.env?.DB) {
      const orchestrator = new AgentOrchestrator(c.env.DB);
      const registeredAgents = await orchestrator.listAgents();

      if (registeredAgents.length > 0) {
        const profiles: AgentProfile[] = [];
        for (const agent of registeredAgents) {
          const caps = await orchestrator.getCapabilities(agent.id);
          profiles.push({
            id: agent.id,
            name: agent.name,
            capabilities: caps.map((cap) => ({
              action: cap.name,
              scope: cap.description,
              tools: cap.tools,
            })),
            constraints: [],
            activity: { status: "idle" },
          });
        }
        return c.json(profiles);
      }
    }
  } catch {
    // agents table may not exist yet — fall through
  }

  // Fallback: check agent_sessions table
  let sessions: (typeof agentSessions.$inferSelect)[] = [];
  try {
    if (c.env?.DB) {
      const db = getDb(c.env.DB);
      sessions = await db.select().from(agentSessions);
    }
  } catch {
    // D1 not available — fall through to mock
  }

  if (sessions.length === 0) {
    return c.json(MOCK_AGENTS);
  }

  // Group by agentName, keep latest session per agent
  const latestByAgent = new Map<string, (typeof sessions)[number]>();
  for (const s of sessions) {
    const prev = latestByAgent.get(s.agentName);
    if (!prev || s.startedAt > prev.startedAt) {
      latestByAgent.set(s.agentName, s);
    }
  }

  const profiles: AgentProfile[] = [];
  for (const [name, session] of latestByAgent) {
    profiles.push({
      id: name,
      name: name
        .replace(/^agent-/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (ch) => ch.toUpperCase()) + " Agent",
      capabilities: [],
      constraints: [],
      activity: {
        status: SESSION_STATUS_MAP[session.status] ?? "idle",
        currentTask: session.status === "active" ? session.branch ?? undefined : undefined,
        startedAt: session.startedAt,
      },
    });
  }

  return c.json(profiles);
});

// ─── SSE Stream (non-OpenAPI — SSE is not well-represented in OpenAPI) ───

agentRoute.get("/agents/stream", (c) => {
  const sseManager = getSSEManager(c.env.DB);
  const stream = sseManager.createStream();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// ─── Sprint 9: Orchestration Endpoints (F50) ───

const getCapabilities = createRoute({
  method: "get",
  path: "/agents/capabilities",
  tags: ["Agents"],
  summary: "List all agent capabilities",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(AgentCapabilityDefinitionSchema),
        },
      },
      description: "All agent capabilities across all agents",
    },
  },
});

agentRoute.openapi(getCapabilities, async (c) => {
  const orchestrator = new AgentOrchestrator(c.env.DB);
  const capabilities = await orchestrator.listAllCapabilities();
  return c.json(capabilities);
});

const getAgentTasks = createRoute({
  method: "get",
  path: "/agents/{id}/tasks",
  tags: ["Agents"],
  summary: "List tasks for an agent",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(AgentTaskSchema) } },
      description: "Tasks assigned to the agent",
    },
  },
});

agentRoute.openapi(getAgentTasks, async (c) => {
  const { id } = c.req.valid("param");
  const orchestrator = new AgentOrchestrator(c.env.DB);
  const tasks = await orchestrator.listTasks(id);
  return c.json(tasks);
});

const createAgentTask = createRoute({
  method: "post",
  path: "/agents/{id}/tasks",
  tags: ["Agents"],
  summary: "Create a task for an agent",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": { schema: CreateTaskRequestSchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: AgentTaskSchema } },
      description: "Created task",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Agent session not found",
    },
  },
});

agentRoute.openapi(createAgentTask, async (c) => {
  const { id } = c.req.valid("param");
  const { branch } = c.req.valid("json");

  // Find latest session for this agent
  const { results } = await c.env.DB.prepare(
    "SELECT id FROM agent_sessions WHERE agent_name = ? ORDER BY started_at DESC LIMIT 1",
  )
    .bind(id)
    .all<{ id: string }>();

  if (results.length === 0) {
    return c.json({ error: `No session found for agent '${id}'` }, 404);
  }

  const orchestrator = new AgentOrchestrator(c.env.DB);
  const task = await orchestrator.createTask(results[0]!.id, branch);
  return c.json(task, 201);
});

const checkConstraint = createRoute({
  method: "post",
  path: "/agents/constraints/check",
  tags: ["Agents"],
  summary: "Check if an action is allowed by constraints",
  request: {
    body: {
      content: {
        "application/json": { schema: ConstraintCheckRequestSchema },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: ConstraintCheckResultSchema },
      },
      description: "Constraint check result",
    },
  },
});

agentRoute.openapi(checkConstraint, async (c) => {
  const { action } = c.req.valid("json");
  const orchestrator = new AgentOrchestrator(c.env.DB);
  const result = await orchestrator.checkConstraint(action);
  return c.json(result);
});

// ─── Sprint 10: Agent Execution Endpoints (F53) ───

const executeAgentTask = createRoute({
  method: "post",
  path: "/agents/{id}/execute",
  tags: ["Agents"],
  summary: "에이전트 작업 실행 요청",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: AgentExecuteRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "실행 결과",
      content: { "application/json": { schema: AgentExecutionResultSchema } },
    },
    503: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "실행 환경 불가",
    },
  },
});

agentRoute.openapi(executeAgentTask, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const sseManager = getSSEManager(c.env.DB);
  const orchestrator = new AgentOrchestrator(c.env.DB, sseManager);
  const runner = createAgentRunner({ ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY });

  if (!(await runner.isAvailable())) {
    return c.json({ error: "No agent runner available" }, 503);
  }

  const result = await orchestrator.executeTask(
    id,
    body.taskType,
    body.context,
    runner,
  );

  return c.json(result);
});

const getRunners = createRoute({
  method: "get",
  path: "/agents/runners",
  tags: ["Agents"],
  summary: "사용 가능한 AgentRunner 목록",
  responses: {
    200: {
      description: "Runner 목록",
      content: {
        "application/json": {
          schema: z.array(AgentRunnerInfoSchema),
        },
      },
    },
  },
});

agentRoute.openapi(getRunners, async (c) => {
  const runners: AgentRunnerInfo[] = [
    {
      type: "claude-api",
      available: !!c.env.ANTHROPIC_API_KEY,
      model: "claude-haiku-4-5-20250714",
      description: "Anthropic Claude API — 코드 리뷰, 생성, 분석",
    },
    {
      type: "mcp",
      available: false,
      description: "MCP Protocol — Sprint 11+ 구현 예정",
    },
    {
      type: "mock",
      available: true,
      description: "Mock Runner — 테스트/데모용",
    },
  ];

  return c.json(runners);
});

const getTaskResult = createRoute({
  method: "get",
  path: "/agents/tasks/{taskId}/result",
  tags: ["Agents"],
  summary: "작업 실행 결과 조회",
  request: {
    params: z.object({ taskId: z.string() }),
  },
  responses: {
    200: {
      description: "작업 결과",
      content: {
        "application/json": {
          schema: z.object({
            task: AgentTaskSchema,
            result: z.unknown().nullable(),
          }),
        },
      },
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "작업을 찾을 수 없음",
    },
  },
});

agentRoute.openapi(getTaskResult, async (c) => {
  const { taskId } = c.req.valid("param");
  const orchestrator = new AgentOrchestrator(c.env.DB);
  const taskResult = await orchestrator.getTaskResult(taskId);

  if (!taskResult) {
    return c.json({ error: "Task not found" }, 404);
  }

  return c.json(taskResult);
});
