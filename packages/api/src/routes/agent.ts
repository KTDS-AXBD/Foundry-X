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
  CreateAgentPrRequestSchema,
  AgentPrResultSchema,
  AgentPrRecordSchema,
  PrReviewResultSchema,
  MergeQueueEntrySchema,
  ConflictReportSchema,
  ParallelExecuteRequestSchema,
  UpdatePriorityRequestSchema,
} from "../schemas/agent.js";
import type { AgentProfile, AgentActivity, PrReviewResult } from "@foundry-x/shared";
import type { AgentRunnerInfo, AgentTaskType } from "../services/execution-types.js";
import { createAgentRunner } from "../services/agent-runner.js";
import { getDb } from "../db/index.js";
import { agentSessions } from "../db/schema.js";
import { SSEManager } from "../services/sse-manager.js";
import { AgentOrchestrator } from "../services/agent-orchestrator.js";
import { GitHubService } from "../services/github.js";
import { ReviewerAgent } from "../services/reviewer-agent.js";
import { PrPipelineService } from "../services/pr-pipeline.js";
import { MergeQueueService } from "../services/merge-queue.js";
import { LLMService } from "../services/llm.js";
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
      const orgId = (c.get("jwtPayload") as Record<string, unknown> | undefined)?.orgId as string | undefined;
      if (orgId) {
        // Tenant-filtered: sessions from projects belonging to this org
        const { results } = await c.env.DB.prepare(
          "SELECT s.* FROM agent_sessions s JOIN projects p ON s.project_id = p.id WHERE p.org_id = ?"
        ).bind(orgId).all();
        sessions = (results ?? []) as (typeof agentSessions.$inferSelect)[];
        // Fallback: if no projects linked yet, show all sessions (migration transition)
        if (sessions.length === 0) {
          sessions = await db.select().from(agentSessions);
        }
      } else {
        sessions = await db.select().from(agentSessions);
      }
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
    return c.json({ error: `No session found for agent '${id}'`, errorCode: "RESOURCE_001" }, 404);
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
    return c.json({ error: "No agent runner available", errorCode: "INTEGRATION_003" }, 503);
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
    return c.json({ error: "Task not found", errorCode: "RESOURCE_001" }, 404);
  }

  return c.json(taskResult);
});

// ─── Sprint 13: Agent PR Pipeline Endpoints (F65) ───

function createPrPipeline(env: Env, sseManager?: SSEManager) {
  const github = new GitHubService(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const llm = new LLMService(env.AI, env.ANTHROPIC_API_KEY);
  const reviewer = new ReviewerAgent(llm);
  return new PrPipelineService(github, reviewer, env.DB, sseManager);
}

const createAgentPr = createRoute({
  method: "post",
  path: "/agents/pr",
  tags: ["Agents"],
  summary: "에이전트 PR 생성 파이프라인 실행",
  request: {
    body: {
      content: { "application/json": { schema: CreateAgentPrRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "PR 파이프라인 결과",
      content: { "application/json": { schema: AgentPrResultSchema } },
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "잘못된 요청",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "작업 결과를 찾을 수 없음",
    },
  },
});

agentRoute.openapi(createAgentPr, async (c) => {
  const { agentId, taskId } = c.req.valid("json");

  // Get task result from DB
  const taskRow = await c.env.DB
    .prepare("SELECT result FROM agent_tasks WHERE id = ?")
    .bind(taskId)
    .first<{ result: string | null }>();

  if (!taskRow?.result) {
    return c.json({ error: "Task result not found", errorCode: "RESOURCE_001" }, 404);
  }

  const taskResult = JSON.parse(taskRow.result);
  const sseManager = getSSEManager(c.env.DB);
  const pipeline = createPrPipeline(c.env, sseManager);

  try {
    const result = await pipeline.createAgentPr(agentId, taskId, taskResult);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Pipeline failed" }, 400);
  }
});

const getAgentPr = createRoute({
  method: "get",
  path: "/agents/pr/{id}",
  tags: ["Agents"],
  summary: "에이전트 PR 레코드 조회",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "PR 레코드",
      content: { "application/json": { schema: AgentPrRecordSchema } },
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "PR을 찾을 수 없음",
    },
  },
});

agentRoute.openapi(getAgentPr, async (c) => {
  const { id } = c.req.valid("param");
  const row = await c.env.DB
    .prepare("SELECT * FROM agent_prs WHERE id = ?")
    .bind(id)
    .first();

  if (!row) {
    return c.json({ error: "PR not found" } as const, 404);
  }

  return c.json(row as Record<string, unknown> as z.infer<typeof AgentPrRecordSchema>);
});

const reviewAgentPr = createRoute({
  method: "post",
  path: "/agents/pr/{id}/review",
  tags: ["Agents"],
  summary: "에이전트 PR 재리뷰",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "리뷰 결과",
      content: { "application/json": { schema: PrReviewResultSchema } },
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "PR을 찾을 수 없음",
    },
  },
});

agentRoute.openapi(reviewAgentPr, async (c) => {
  const { id } = c.req.valid("param");
  const row = await c.env.DB
    .prepare("SELECT pr_number FROM agent_prs WHERE id = ?")
    .bind(id)
    .first<{ pr_number: number | null }>();

  if (!row?.pr_number) {
    return c.json({ error: "PR not found or not yet created" }, 404);
  }

  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const reviewer = new ReviewerAgent(llm);

  const diff = await github.getPrDiff(row.pr_number);
  const result = await reviewer.reviewPullRequest(diff, {
    agentId: "reviewer-agent",
    taskId: id,
    taskType: "code-review",
    prNumber: row.pr_number,
  });

  return c.json(result);
});

const mergeAgentPr = createRoute({
  method: "post",
  path: "/agents/pr/{id}/merge",
  tags: ["Agents"],
  summary: "에이전트 PR 수동 머지",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "머지 결과",
      content: {
        "application/json": {
          schema: z.object({
            merged: z.boolean(),
            needsHuman: z.boolean(),
            reason: z.string().optional(),
          }),
        },
      },
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "PR을 찾을 수 없음",
    },
  },
});

agentRoute.openapi(mergeAgentPr, async (c) => {
  const { id } = c.req.valid("param");
  const row = await c.env.DB
    .prepare("SELECT pr_number, review_decision, sdd_score, quality_score, security_issues FROM agent_prs WHERE id = ?")
    .bind(id)
    .first<{
      pr_number: number | null;
      review_decision: string | null;
      sdd_score: number | null;
      quality_score: number | null;
      security_issues: string | null;
    }>();

  if (!row?.pr_number) {
    return c.json({ error: "PR not found or not yet created" }, 404);
  }

  const reviewResult: PrReviewResult = {
    decision: (row.review_decision as "approve" | "request_changes" | "comment") ?? "comment",
    summary: "",
    comments: [],
    sddScore: row.sdd_score ?? 0,
    qualityScore: row.quality_score ?? 0,
    securityIssues: row.security_issues ? JSON.parse(row.security_issues) : [],
  };

  const sseManager = getSSEManager(c.env.DB);
  const pipeline = createPrPipeline(c.env, sseManager);
  const result = await pipeline.checkAndMerge(id, row.pr_number, reviewResult);

  return c.json(result);
});

// ─── Sprint 14: Parallel Execution + Merge Queue Endpoints (F68) ───

function createMergeQueue(env: Env, sseManager?: SSEManager): MergeQueueService {
  const github = new GitHubService(env.GITHUB_TOKEN, env.GITHUB_REPO);
  return new MergeQueueService(github, env.DB, sseManager);
}

const executeParallel = createRoute({
  method: "post",
  path: "/agents/parallel",
  tags: ["Agents"],
  summary: "에이전트 병렬 실행",
  request: {
    body: {
      content: { "application/json": { schema: ParallelExecuteRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "병렬 실행 결과",
      content: { "application/json": { schema: z.object({ executionId: z.string(), results: z.array(z.unknown()), durationMs: z.number() }) } },
    },
    503: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "실행 환경 불가",
    },
  },
});

agentRoute.openapi(executeParallel, async (c) => {
  const { tasks, createPrs } = c.req.valid("json");
  const sseManager = getSSEManager(c.env.DB);
  const orchestrator = new AgentOrchestrator(c.env.DB, sseManager);
  const runner = createAgentRunner({ ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY });

  if (!(await runner.isAvailable())) {
    return c.json({ error: "No agent runner available" }, 503);
  }

  if (createPrs) {
    const pipeline = createPrPipeline(c.env, sseManager);
    orchestrator.setPrPipeline(pipeline);
    const mergeQueue = createMergeQueue(c.env, sseManager);
    orchestrator.setMergeQueue(mergeQueue);
    const result = await orchestrator.executeParallelWithPr(tasks, runner);
    return c.json(result);
  }

  const result = await orchestrator.executeParallel(tasks, runner);
  return c.json(result);
});

const getParallelExecution = createRoute({
  method: "get",
  path: "/agents/parallel/{id}",
  tags: ["Agents"],
  summary: "병렬 실행 상태 조회",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "병렬 실행 상태",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
            taskIds: z.array(z.string()),
            agentIds: z.array(z.string()),
            status: z.string(),
            totalTasks: z.number(),
            completedTasks: z.number(),
            failedTasks: z.number(),
            durationMs: z.number().nullable(),
            createdAt: z.string(),
            completedAt: z.string().nullable(),
          }),
        },
      },
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "실행을 찾을 수 없음",
    },
  },
});

agentRoute.openapi(getParallelExecution, async (c) => {
  const { id } = c.req.valid("param");
  const row = await c.env.DB
    .prepare("SELECT * FROM parallel_executions WHERE id = ?")
    .bind(id)
    .first<{
      id: string;
      task_ids: string;
      agent_ids: string;
      status: string;
      total_tasks: number;
      completed_tasks: number;
      failed_tasks: number;
      duration_ms: number | null;
      created_at: string;
      completed_at: string | null;
    }>();

  if (!row) {
    return c.json({ error: "Parallel execution not found" }, 404);
  }

  return c.json({
    id: row.id,
    taskIds: JSON.parse(row.task_ids),
    agentIds: JSON.parse(row.agent_ids),
    status: row.status,
    totalTasks: row.total_tasks,
    completedTasks: row.completed_tasks,
    failedTasks: row.failed_tasks,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  });
});

const getQueueStatus = createRoute({
  method: "get",
  path: "/agents/queue",
  tags: ["Agents"],
  summary: "Merge Queue 상태 + 충돌 감지",
  responses: {
    200: {
      description: "큐 상태",
      content: {
        "application/json": {
          schema: z.object({
            entries: z.array(MergeQueueEntrySchema),
            conflicts: ConflictReportSchema,
          }),
        },
      },
    },
  },
});

agentRoute.openapi(getQueueStatus, async (c) => {
  const sseManager = getSSEManager(c.env.DB);
  const mergeQueue = createMergeQueue(c.env, sseManager);
  const entries = await mergeQueue.getQueueStatus();
  const conflicts = await mergeQueue.detectConflicts();
  return c.json({ entries, conflicts });
});

const updateQueuePriority = createRoute({
  method: "patch",
  path: "/agents/queue/{id}/priority",
  tags: ["Agents"],
  summary: "Merge Queue 우선순위 변경",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: UpdatePriorityRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "우선순위 변경 완료",
      content: { "application/json": { schema: z.object({ updated: z.boolean() }) } },
    },
  },
});

agentRoute.openapi(updateQueuePriority, async (c) => {
  const { id } = c.req.valid("param");
  const { priority } = c.req.valid("json");
  const sseManager = getSSEManager(c.env.DB);
  const mergeQueue = createMergeQueue(c.env, sseManager);
  await mergeQueue.updatePriority(id, priority);
  return c.json({ updated: true });
});

const processQueue = createRoute({
  method: "post",
  path: "/agents/queue/process",
  tags: ["Agents"],
  summary: "다음 PR merge 실행",
  responses: {
    200: {
      description: "처리 결과",
      content: {
        "application/json": {
          schema: z.object({
            merged: z.boolean(),
            entryId: z.string().optional(),
            prNumber: z.number().optional(),
            commitSha: z.string().optional(),
            error: z.string().optional(),
          }),
        },
      },
    },
  },
});

agentRoute.openapi(processQueue, async (c) => {
  const sseManager = getSSEManager(c.env.DB);
  const mergeQueue = createMergeQueue(c.env, sseManager);
  const result = await mergeQueue.processNext();
  return c.json(result);
});

// ─── Sprint 15: PlannerAgent Endpoints (F70) ───

import { PlannerAgent } from "../services/planner-agent.js";
import { createPlanSchema, rejectPlanSchema } from "../schemas/plan.js";

agentRoute.post("/plan", async (c) => {
  const body = createPlanSchema.parse(await c.req.json());
  const sseManager = getSSEManager(c.env.DB);
  const githubSvc = c.env.GITHUB_TOKEN ? new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO) : undefined;
  const planner = new PlannerAgent({ db: c.env.DB, sse: sseManager, apiKey: c.env.ANTHROPIC_API_KEY, githubService: githubSvc });
  const context = { ...body.context, spec: body.context.spec ? { title: "", description: body.context.spec, acceptanceCriteria: [] } : undefined };
  const plan = await planner.createPlan(body.agentId, body.taskType as AgentTaskType, context, body.model);
  return c.json(plan, 201);
});

agentRoute.post("/plan/:id/approve", async (c) => {
  const planId = c.req.param("id");
  const sseManager = getSSEManager(c.env.DB);
  const planner = new PlannerAgent({ db: c.env.DB, sse: sseManager });
  const plan = await planner.approvePlan(planId);
  return c.json(plan);
});

agentRoute.post("/plan/:id/reject", async (c) => {
  const planId = c.req.param("id");
  const body = rejectPlanSchema.parse(await c.req.json());
  const sseManager = getSSEManager(c.env.DB);
  const planner = new PlannerAgent({ db: c.env.DB, sse: sseManager });
  const plan = await planner.rejectPlan(planId, body.reason);
  return c.json(plan);
});

// F82: Plan 조회 + 실행
agentRoute.get("/plan/:id", async (c) => {
  const planId = c.req.param("id");
  const planner = new PlannerAgent({ db: c.env.DB });
  const plan = await planner.getPlan(planId);
  if (!plan) return c.json({ error: "Plan not found" }, 404);
  return c.json({ plan });
});

agentRoute.post("/plan/:id/execute", async (c) => {
  const planId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { repoUrl, branch, projectId } = body as { repoUrl?: string; branch?: string; projectId?: string };

  let resolvedRepoUrl = repoUrl || "";
  if (!resolvedRepoUrl && projectId) {
    const row = await c.env.DB.prepare("SELECT repo_url FROM projects WHERE id = ?").bind(projectId).first<{ repo_url: string }>();
    if (row) resolvedRepoUrl = row.repo_url;
  }

  const sseManager = getSSEManager(c.env.DB);
  const planner = new PlannerAgent({ db: c.env.DB, sse: sseManager });
  const orchestrator = new AgentOrchestrator(c.env.DB, sseManager);
  orchestrator.setPlannerAgent(planner);
  const { MockRunner } = await import("../services/claude-api-runner.js");
  const result = await orchestrator.executePlan(planId, new MockRunner(), {
    repoUrl: resolvedRepoUrl,
    branch: branch || "master",
  });
  const plan = await planner.getPlan(planId);
  return c.json({ plan, result });
});

// ─── Sprint 15: Worktree Endpoint (F72) ───

import { WorktreeManager } from "../services/worktree-manager.js";

agentRoute.get("/worktrees", async (c) => {
  const manager = new WorktreeManager({ db: c.env.DB });
  const worktrees = manager.list();
  return c.json({ worktrees });
});

// ─── Sprint 36: Model Routing (F136) ───

import { ModelRouter, DEFAULT_MODEL_MAP } from "../services/model-router.js";
import {
  RoutingRulesResponseSchema,
  UpdateRoutingRuleRequestSchema,
  RoutingRuleSchema,
  EvaluateOptimizeRequestSchema,
  EvaluationLoopResultSchema,
} from "../schemas/agent.js";

const getRoutingRules = createRoute({
  method: "get",
  path: "/agents/routing-rules",
  summary: "모델 라우팅 규칙 조회",
  tags: ["Agent"],
  responses: {
    200: { content: { "application/json": { schema: RoutingRulesResponseSchema } }, description: "라우팅 규칙 목록" },
  },
});

agentRoute.openapi(getRoutingRules, async (c) => {
  const router = new ModelRouter(c.env.DB);
  const rules = await router.listRules();
  return c.json({ rules, defaults: DEFAULT_MODEL_MAP }, 200);
});

const updateRoutingRule = createRoute({
  method: "put",
  path: "/agents/routing-rules/{taskType}",
  summary: "모델 라우팅 규칙 변경",
  tags: ["Agent"],
  request: {
    params: z.object({ taskType: z.string() }),
    body: { content: { "application/json": { schema: UpdateRoutingRuleRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: RoutingRuleSchema } }, description: "갱신된 규칙" },
    400: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "잘못된 taskType" },
  },
});

agentRoute.openapi(updateRoutingRule, async (c) => {
  const { taskType } = c.req.valid("param");
  const validTypes = ["code-review", "code-generation", "spec-analysis", "test-generation", "policy-evaluation", "skill-query", "ontology-lookup"];
  if (!validTypes.includes(taskType)) {
    return c.json({ error: `Invalid taskType: ${taskType}` }, 400);
  }
  const body = c.req.valid("json");
  const router = new ModelRouter(c.env.DB);
  const rule = await router.upsertRule(taskType as any, body);
  return c.json(rule, 200);
});

// ─── Sprint 37: ArchitectAgent Endpoints (F138) ───

import { ArchitectAgent } from "../services/architect-agent.js";
import {
  ArchitectAnalyzeRequestSchema,
  DesignReviewRequestSchema,
} from "../schemas/agent.js";

const architectAnalyze = createRoute({
  method: "post",
  path: "/agents/architect/analyze",
  tags: ["Agents"],
  summary: "아키텍처 영향 분석",
  request: {
    body: { content: { "application/json": { schema: ArchitectAnalyzeRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ impactSummary: z.string(), designScore: z.number(), tokensUsed: z.number(), model: z.string(), duration: z.number() }).passthrough() } }, description: "분석 결과" },
    400: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "잘못된 요청" },
  },
});

agentRoute.openapi(architectAnalyze, async (c) => {
  const body = c.req.valid("json");
  const agent = new ArchitectAgent({
    env: { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    db: c.env.DB,
  });

  const request = {
    taskId: `arch_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    agentId: "architect-agent",
    taskType: body.taskType as "spec-analysis",
    context: {
      repoUrl: body.context.repoUrl,
      branch: body.context.branch,
      targetFiles: body.context.targetFiles,
      spec: body.context.spec,
      instructions: body.context.instructions,
      fileContents: body.context.fileContents,
    },
    constraints: [],
  };

  const result = await agent.analyzeArchitecture(request);
  return c.json(result);
});

const architectReviewDesign = createRoute({
  method: "post",
  path: "/agents/architect/review-design",
  tags: ["Agents"],
  summary: "설계 문서 품질 리뷰",
  request: {
    body: { content: { "application/json": { schema: DesignReviewRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ completenessScore: z.number(), consistencyScore: z.number(), feasibilityScore: z.number(), overallScore: z.number() }).passthrough() } }, description: "리뷰 결과" },
  },
});

agentRoute.openapi(architectReviewDesign, async (c) => {
  const { document, title } = c.req.valid("json");
  const agent = new ArchitectAgent({
    env: { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    db: c.env.DB,
  });

  const result = await agent.reviewDesignDoc(document, title);
  return c.json(result);
});

// ─── Sprint 36: Evaluator-Optimizer (F137) ───

import { EvaluatorOptimizer } from "../services/evaluator-optimizer.js";
import { CodeReviewCriteria, TestCoverageCriteria, SpecComplianceCriteria } from "../services/evaluation-criteria.js";
import { createRoutedRunner } from "../services/agent-runner.js";

const CRITERIA_MAP: Record<string, () => import("../services/evaluation-criteria.js").EvaluationCriteria> = {
  "code-review": () => new CodeReviewCriteria(),
  "test-coverage": () => new TestCoverageCriteria(),
  "spec-compliance": () => new SpecComplianceCriteria(),
};

const evaluateOptimize = createRoute({
  method: "post",
  path: "/agents/evaluate-optimize",
  summary: "Evaluator-Optimizer 루프 실행",
  tags: ["Agent"],
  request: {
    body: { content: { "application/json": { schema: EvaluateOptimizeRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: EvaluationLoopResultSchema } }, description: "E-O 루프 결과" },
    400: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "잘못된 요청" },
  },
});

agentRoute.openapi(evaluateOptimize, async (c) => {
  const body = c.req.valid("json");
  const { taskType, context, config } = body;

  const criteria = config.criteria
    .map((name) => CRITERIA_MAP[name]?.())
    .filter(Boolean) as import("../services/evaluation-criteria.js").EvaluationCriteria[];

  if (criteria.length === 0) {
    return c.json({ error: "No valid criteria specified" }, 400);
  }

  const runner = await createRoutedRunner(
    { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    taskType as any,
    c.env.DB,
  );

  const optimizer = new EvaluatorOptimizer({
    maxIterations: config.maxIterations ?? 3,
    qualityThreshold: config.qualityThreshold ?? 80,
    criteria,
    generatorRunner: runner,
  });

  const request = {
    taskId: `eo_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    agentId: "evaluator-optimizer",
    taskType: taskType as any,
    context: {
      repoUrl: context.repoUrl,
      branch: context.branch,
      targetFiles: context.targetFiles,
      spec: context.spec,
      instructions: context.instructions,
    },
    constraints: [],
  };

  const result = await optimizer.run(request);

  return c.json({
    finalResult: result.finalResult,
    finalScore: result.finalScore,
    iterations: result.iterations,
    converged: result.converged,
    totalTokensUsed: result.totalTokensUsed,
    totalDuration: result.totalDuration,
    history: result.history.map((h) => ({
      iteration: h.iteration,
      aggregateScore: h.aggregateScore,
      feedback: h.feedback,
    })),
  }, 200);
});

// ─── Sprint 37: TestAgent Endpoints (F139) ───

import { TestAgent } from "../services/test-agent.js";
import {
  testGenerateSchema,
  coverageGapsSchema,
} from "../schemas/agent.js";

const testGenerate = createRoute({
  method: "post",
  path: "/agents/test/generate",
  tags: ["Agents"],
  summary: "vitest 테스트 자동 생성",
  request: {
    body: { content: { "application/json": { schema: testGenerateSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ testFiles: z.array(z.any()), totalTestCount: z.number(), coverageEstimate: z.number(), edgeCases: z.array(z.any()), tokensUsed: z.number(), model: z.string(), duration: z.number() }) } }, description: "테스트 생성 결과" },
    400: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "잘못된 요청" },
  },
});

agentRoute.openapi(testGenerate, async (c) => {
  const body = c.req.valid("json");
  const agent = new TestAgent({
    env: { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    db: c.env.DB,
  });

  const request = {
    taskId: body.taskId,
    agentId: body.agentId ?? "test-agent",
    taskType: "test-generation" as const,
    context: {
      repoUrl: body.context.repoUrl,
      branch: body.context.branch,
      targetFiles: body.context.targetFiles,
      spec: body.context.spec,
      instructions: body.context.instructions,
      fileContents: body.context.fileContents,
    },
    constraints: body.constraints ?? [],
  };

  const result = await agent.generateTests(request);
  return c.json(result);
});

const testCoverageGaps = createRoute({
  method: "post",
  path: "/agents/test/coverage-gaps",
  tags: ["Agents"],
  summary: "테스트 커버리지 갭 분석",
  request: {
    body: { content: { "application/json": { schema: coverageGapsSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ analyzedFiles: z.number(), uncoveredFunctions: z.array(z.any()), missingEdgeCases: z.array(z.any()), overallCoverage: z.number(), tokensUsed: z.number(), model: z.string() }) } }, description: "커버리지 갭 분석 결과" },
  },
});

agentRoute.openapi(testCoverageGaps, async (c) => {
  const body = c.req.valid("json");
  const agent = new TestAgent({
    env: { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    db: c.env.DB,
  });

  const result = await agent.analyzeCoverage(body.sourceFiles, body.testFiles);
  return c.json(result);
});

// ─── Sprint 38: SecurityAgent Endpoints (F140) ───

import { SecurityAgent } from "../services/security-agent.js";
import {
  SecurityScanRequestSchema,
  SecurityPRDiffRequestSchema,
} from "../schemas/agent.js";

const securityScan = createRoute({
  method: "post",
  path: "/agents/security/scan",
  tags: ["Agents"],
  summary: "OWASP 취약점 스캔",
  request: {
    body: { content: { "application/json": { schema: SecurityScanRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ riskScore: z.number(), vulnerabilities: z.array(z.any()), securePatterns: z.array(z.string()), recommendations: z.array(z.any()), tokensUsed: z.number(), model: z.string(), duration: z.number() }) } }, description: "보안 스캔 결과" },
  },
});

agentRoute.openapi(securityScan, async (c) => {
  const body = c.req.valid("json");
  const agent = new SecurityAgent({
    env: { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    db: c.env.DB,
  });

  const request = {
    taskId: `sec_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    agentId: "security-agent",
    taskType: body.taskType as "security-review",
    context: {
      repoUrl: body.context.repoUrl,
      branch: body.context.branch,
      targetFiles: body.context.targetFiles,
      spec: body.context.spec,
      instructions: body.context.instructions,
      fileContents: body.context.fileContents,
    },
    constraints: [],
  };

  const result = await agent.scanVulnerabilities(request);
  return c.json(result);
});

const securityPRDiff = createRoute({
  method: "post",
  path: "/agents/security/pr-diff",
  tags: ["Agents"],
  summary: "PR diff 보안 분석",
  request: {
    body: { content: { "application/json": { schema: SecurityPRDiffRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ riskLevel: z.string(), findings: z.array(z.any()), summary: z.string(), tokensUsed: z.number(), model: z.string(), duration: z.number() }) } }, description: "PR diff 보안 분석 결과" },
  },
});

agentRoute.openapi(securityPRDiff, async (c) => {
  const { diff, context } = c.req.valid("json");
  const agent = new SecurityAgent({
    env: { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    db: c.env.DB,
  });

  const result = await agent.analyzePRDiff(diff, context ?? undefined);
  return c.json(result);
});

// ─── Sprint 38: QAAgent Endpoints (F141) ───

import { QAAgent } from "../services/qa-agent.js";
import {
  QABrowserTestRequestSchema,
  QAAcceptanceRequestSchema,
} from "../schemas/agent.js";

const qaBrowserTest = createRoute({
  method: "post",
  path: "/agents/qa/browser-test",
  tags: ["Agents"],
  summary: "브라우저 테스트 시나리오 생성",
  request: {
    body: { content: { "application/json": { schema: QABrowserTestRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ scenarios: z.array(z.any()), coverageEstimate: z.number(), tokensUsed: z.number(), model: z.string(), duration: z.number() }) } }, description: "브라우저 테스트 시나리오" },
  },
});

agentRoute.openapi(qaBrowserTest, async (c) => {
  const body = c.req.valid("json");
  const agent = new QAAgent({
    env: { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    db: c.env.DB,
  });

  const result = await agent.runBrowserTest({
    taskId: body.taskId,
    agentId: body.agentId,
    taskType: "qa-testing",
    context: body.context,
    constraints: body.constraints ?? [],
  });
  return c.json(result);
});

const qaAcceptance = createRoute({
  method: "post",
  path: "/agents/qa/acceptance",
  tags: ["Agents"],
  summary: "수용 기준 검증",
  request: {
    body: { content: { "application/json": { schema: QAAcceptanceRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ overallStatus: z.string(), criteria: z.array(z.any()), completenessScore: z.number(), tokensUsed: z.number(), model: z.string(), duration: z.number() }) } }, description: "수용 기준 검증 결과" },
  },
});

agentRoute.openapi(qaAcceptance, async (c) => {
  const { spec, files } = c.req.valid("json");
  const agent = new QAAgent({
    env: { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY, ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY },
    db: c.env.DB,
  });

  const result = await agent.validateAcceptanceCriteria(spec, files);
  return c.json(result);
});

// ─── Sprint 39: Fallback Chain Endpoints (F144) ───

import { FallbackChainService } from "../services/fallback-chain.js";
import {
  FallbackChainResponseSchema,
  FallbackEventsResponseSchema,
  SanitizeRequestSchema,
  SanitizeResponseSchema,
  SanitizationRulesResponseSchema,
  FeedbackSubmitSchema,
  FeedbackResponseSchema,
} from "../schemas/agent.js";

const fallbackChainGet = createRoute({
  method: "get",
  path: "/agents/fallback/chain/{taskType}",
  tags: ["Agents"],
  summary: "Fallback 체인 조회",
  request: { params: z.object({ taskType: z.string() }) },
  responses: {
    200: { content: { "application/json": { schema: FallbackChainResponseSchema } }, description: "폴백 체인 목록" },
  },
});

agentRoute.openapi(fallbackChainGet, async (c) => {
  const { taskType } = c.req.valid("param");
  const router = new ModelRouter(c.env.DB);
  const chain = await router.getFallbackChain(taskType as AgentTaskType);
  return c.json({
    chain: chain.map((r) => ({
      id: r.id,
      taskType: r.taskType,
      modelId: r.modelId,
      runnerType: r.runnerType,
      priority: r.priority,
    })),
  });
});

const fallbackEventsGet = createRoute({
  method: "get",
  path: "/agents/fallback/events",
  tags: ["Agents"],
  summary: "최근 폴백 이벤트 목록",
  responses: {
    200: { content: { "application/json": { schema: FallbackEventsResponseSchema } }, description: "폴백 이벤트" },
  },
});

agentRoute.openapi(fallbackEventsGet, async (c) => {
  const router = new ModelRouter(c.env.DB);
  const service = new FallbackChainService(router, c.env.DB);
  const events = await service.listEvents(20);
  return c.json({ events });
});

// ─── Sprint 39: Prompt Gateway Endpoints (F149) ───

import { PromptGatewayService } from "../services/prompt-gateway.js";

const gatewaySanitize = createRoute({
  method: "post",
  path: "/agents/gateway/sanitize",
  tags: ["Agents"],
  summary: "프롬프트 정규화 (dry-run)",
  request: {
    body: { content: { "application/json": { schema: SanitizeRequestSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: SanitizeResponseSchema } }, description: "정규화 결과" },
  },
});

agentRoute.openapi(gatewaySanitize, async (c) => {
  const { content } = c.req.valid("json");
  const gateway = new PromptGatewayService(c.env.DB);
  const result = await gateway.sanitizePrompt(content);
  return c.json(result);
});

const gatewayRulesGet = createRoute({
  method: "get",
  path: "/agents/gateway/rules",
  tags: ["Agents"],
  summary: "정규화 규칙 목록",
  responses: {
    200: { content: { "application/json": { schema: SanitizationRulesResponseSchema } }, description: "규칙 목록" },
  },
});

agentRoute.openapi(gatewayRulesGet, async (c) => {
  const gateway = new PromptGatewayService(c.env.DB);
  const rules = await gateway.listRules();
  return c.json({
    rules: rules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      replacement: r.replacement,
      category: r.category,
      enabled: r.enabled,
    })),
  });
});

// ─── Sprint 39: Agent Feedback Loop Endpoints (F150) ───

import { AgentFeedbackLoopService } from "../services/agent-feedback-loop.js";

const feedbackSubmit = createRoute({
  method: "post",
  path: "/agents/feedback",
  tags: ["Agents"],
  summary: "에이전트 실패 피드백 제출",
  request: {
    body: { content: { "application/json": { schema: FeedbackSubmitSchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: z.object({ id: z.string(), status: z.string() }) } }, description: "피드백 저장 완료" },
  },
});

agentRoute.openapi(feedbackSubmit, async (c) => {
  const { failureId, feedback, expectedOutcome } = c.req.valid("json");
  const service = new AgentFeedbackLoopService(c.env.DB);
  const record = await service.submitHumanFeedback(failureId, feedback, expectedOutcome);
  return c.json({ id: record.id, status: record.status });
});

const feedbackGet = createRoute({
  method: "get",
  path: "/agents/feedback/{executionId}",
  tags: ["Agents"],
  summary: "실행별 피드백 조회",
  request: { params: z.object({ executionId: z.string() }) },
  responses: {
    200: { content: { "application/json": { schema: FeedbackResponseSchema } }, description: "피드백 목록" },
  },
});

agentRoute.openapi(feedbackGet, async (c) => {
  const { executionId } = c.req.valid("param");
  const service = new AgentFeedbackLoopService(c.env.DB);
  const records = await service.listByExecution(executionId);
  return c.json({ feedback: records });
});
