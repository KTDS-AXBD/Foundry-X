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
import type { AgentRunnerInfo } from "../services/execution-types.js";
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
    return c.json({ error: "Task result not found" }, 404);
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
import type { AgentTaskType } from "../services/execution-types.js";
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
