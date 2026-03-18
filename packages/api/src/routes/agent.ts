import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  AgentProfileSchema,
  ConstraintCheckRequestSchema,
  ConstraintCheckResultSchema,
  AgentTaskSchema,
  CreateTaskRequestSchema,
  AgentCapabilityDefinitionSchema,
} from "../schemas/agent.js";
import type { AgentProfile, AgentActivity } from "@foundry-x/shared";
import { getDb } from "../db/index.js";
import { agentSessions } from "../db/schema.js";
import { SSEManager } from "../services/sse-manager.js";
import { AgentOrchestrator } from "../services/agent-orchestrator.js";
import type { Env } from "../env.js";

export const agentRoute = new OpenAPIHono<{ Bindings: Env }>();

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
  const sseManager = new SSEManager(c.env.DB);
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
