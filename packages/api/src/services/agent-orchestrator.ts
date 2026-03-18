import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentTaskType,
} from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";
import type { SSEManager } from "./sse-manager.js";
import type { McpServerRegistry } from "./mcp-registry.js";
import type { MergeQueueService } from "./merge-queue.js";
import type { ParallelExecutionResult, ParallelPrResult, ConflictReport } from "@foundry-x/shared";
import { McpRunner } from "./mcp-runner.js";
import { createTransport } from "./mcp-transport.js";
import { TASK_TYPE_TO_MCP_TOOL } from "./mcp-adapter.js";

// Local types — mirrors @foundry-x/shared F50 types (will import from shared once exported)
interface AgentRegistration {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
}

interface AgentCapabilityDefinition {
  id: string;
  agentId: string;
  name: string;
  description: string;
  tools: string[];
  allowedPaths: string[];
  maxConcurrency: number;
}

interface AgentConstraintRule {
  id: string;
  tier: "always" | "ask" | "never";
  action: string;
  description: string;
  enforcementMode: "block" | "warn" | "log";
}

interface ConstraintCheckResult {
  allowed: boolean;
  tier: "always" | "ask" | "never";
  rule: AgentConstraintRule;
  reason: string;
}

interface AgentTask {
  id: string;
  agentSessionId: string;
  branch: string;
  prNumber?: number;
  prStatus: "draft" | "open" | "merged" | "closed";
  sddVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type {
  AgentRegistration,
  AgentCapabilityDefinition,
  AgentConstraintRule,
  ConstraintCheckResult,
  AgentTask,
};

export class AgentOrchestrator {
  private prPipeline?: { createAgentPr: (agentId: string, taskId: string, result: AgentExecutionResult) => Promise<unknown> };
  private mergeQueue?: MergeQueueService;

  constructor(
    private db: D1Database,
    private sse?: SSEManager,
    private mcpRegistry?: McpServerRegistry,
  ) {}

  /** F68: Merge Queue 서비스 주입 */
  setMergeQueue(queue: MergeQueueService): void {
    this.mergeQueue = queue;
  }

  /** F65: PR Pipeline 서비스 주입 (옵셔널 — 설정 시 executeTaskWithPr 활성화) */
  setPrPipeline(pipeline: { createAgentPr: (agentId: string, taskId: string, result: AgentExecutionResult) => Promise<unknown> }): void {
    this.prPipeline = pipeline;
  }

  /**
   * F65: 작업 실행 + PR 생성 (전체 파이프라인)
   * executeTask() 완료 후 generatedCode가 있으면 자동으로 PR 생성
   */
  async executeTaskWithPr(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
    runner: AgentRunner,
  ): Promise<{ result: AgentExecutionResult; pr?: unknown }> {
    const result = await this.executeTask(agentId, taskType, context, runner);

    if (result.output.generatedCode?.length && this.prPipeline) {
      try {
        const taskId = `task-${agentId}-${Date.now()}`;
        const pr = await this.prPipeline.createAgentPr(agentId, taskId, result);
        return { result, pr };
      } catch {
        return { result };
      }
    }

    return { result };
  }

  /**
   * F61: MCP 서버가 해당 taskType의 tool을 지원하면 McpRunner 사용,
   * 아니면 fallback runner(ClaudeApiRunner/MockRunner) 반환.
   */
  async selectRunner(
    taskType: AgentTaskType,
    fallbackRunner: AgentRunner,
  ): Promise<AgentRunner> {
    if (!this.mcpRegistry) return fallbackRunner;

    const toolName = TASK_TYPE_TO_MCP_TOOL[taskType];
    if (!toolName) return fallbackRunner;

    const server = await this.mcpRegistry.findServerForTool(toolName);
    if (!server) return fallbackRunner;

    try {
      const apiKey = server.apiKeyEncrypted
        ? await this.mcpRegistry.decryptApiKey(server.apiKeyEncrypted)
        : undefined;
      const transport = createTransport(
        server.transportType as "sse" | "http",
        { serverUrl: server.serverUrl, apiKey },
      );
      return new McpRunner(transport, server.name);
    } catch {
      return fallbackRunner;
    }
  }

  async checkConstraint(action: string): Promise<ConstraintCheckResult> {
    const { results } = await this.db
      .prepare("SELECT * FROM agent_constraints WHERE action = ?")
      .bind(action)
      .all<{
        id: string;
        tier: "always" | "ask" | "never";
        action: string;
        description: string;
        enforcement_mode: "block" | "warn" | "log";
      }>();

    if (results.length === 0) {
      // Unknown action — default allow
      return {
        allowed: true,
        tier: "always",
        rule: {
          id: "default",
          tier: "always",
          action,
          description: "No constraint defined — allowed by default",
          enforcementMode: "log",
        },
        reason: "No constraint defined for this action",
      };
    }

    const row = results[0]!;
    const rule: AgentConstraintRule = {
      id: row.id,
      tier: row.tier,
      action: row.action,
      description: row.description,
      enforcementMode: row.enforcement_mode,
    };

    const allowed = row.tier !== "never";
    const reason =
      row.tier === "always"
        ? `Action '${action}' is always allowed`
        : row.tier === "ask"
          ? `Action '${action}' requires human approval`
          : `Action '${action}' is forbidden`;

    return { allowed, tier: row.tier, rule, reason };
  }

  async listAgents(): Promise<AgentRegistration[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM agents WHERE status = 'active' ORDER BY name")
      .all<{
        id: string;
        name: string;
        description: string;
        status: "active" | "inactive";
        created_at: string;
      }>();

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  async getCapabilities(agentId: string): Promise<AgentCapabilityDefinition[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM agent_capabilities WHERE agent_id = ? ORDER BY name",
      )
      .bind(agentId)
      .all<{
        id: string;
        agent_id: string;
        name: string;
        description: string;
        tools: string;
        allowed_paths: string;
        max_concurrency: number;
        created_at: string;
      }>();

    return results.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      name: r.name,
      description: r.description ?? "",
      tools: JSON.parse(r.tools || "[]"),
      allowedPaths: JSON.parse(r.allowed_paths || "[]"),
      maxConcurrency: r.max_concurrency,
    }));
  }

  async createTask(
    agentSessionId: string,
    branch: string,
  ): Promise<AgentTask> {
    const id = `task-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO agent_tasks (id, agent_session_id, branch, pr_status, sdd_verified, created_at, updated_at)
         VALUES (?, ?, ?, 'draft', 0, ?, ?)`,
      )
      .bind(id, agentSessionId, branch, now, now)
      .run();

    return {
      id,
      agentSessionId,
      branch,
      prStatus: "draft",
      sddVerified: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  async listTasks(agentName: string): Promise<AgentTask[]> {
    const { results } = await this.db
      .prepare(
        `SELECT t.* FROM agent_tasks t
         JOIN agent_sessions s ON t.agent_session_id = s.id
         WHERE s.agent_name = ?
         ORDER BY t.created_at DESC`,
      )
      .bind(agentName)
      .all<{
        id: string;
        agent_session_id: string;
        branch: string;
        pr_number: number | null;
        pr_status: "draft" | "open" | "merged" | "closed";
        sdd_verified: number;
        created_at: string;
        updated_at: string;
      }>();

    return results.map((r) => ({
      id: r.id,
      agentSessionId: r.agent_session_id,
      branch: r.branch,
      prNumber: r.pr_number ?? undefined,
      prStatus: r.pr_status,
      sddVerified: r.sdd_verified === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async listAllCapabilities(): Promise<AgentCapabilityDefinition[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM agent_capabilities ORDER BY agent_id, name")
      .all<{
        id: string;
        agent_id: string;
        name: string;
        description: string;
        tools: string;
        allowed_paths: string;
        max_concurrency: number;
        created_at: string;
      }>();

    return results.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      name: r.name,
      description: r.description ?? "",
      tools: JSON.parse(r.tools || "[]"),
      allowedPaths: JSON.parse(r.allowed_paths || "[]"),
      maxConcurrency: r.max_concurrency,
    }));
  }

  async executeTask(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
    runner: AgentRunner,
  ): Promise<AgentExecutionResult> {
    // 1. agent_sessions 생성 (status: active)
    const sessionId = `sess-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO agent_sessions (id, project_id, agent_name, status, started_at)
         VALUES (?, ?, ?, 'active', ?)`,
      )
      .bind(sessionId, "default", agentId, now)
      .run();

    // 2. agent_tasks 생성 (task_type, runner_type 포함)
    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const branch = `feature/${agentId}/${taskId}`;

    await this.db
      .prepare(
        `INSERT INTO agent_tasks
         (id, agent_session_id, branch, task_type, runner_type, pr_status, sdd_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', 0, ?, ?)`,
      )
      .bind(taskId, sessionId, branch, taskType, runner.type, now, now)
      .run();

    // 3. Constraint 수집
    const { results: constraintRows } = await this.db
      .prepare("SELECT * FROM agent_constraints")
      .all<{
        id: string;
        tier: "always" | "ask" | "never";
        action: string;
        description: string;
        enforcement_mode: "block" | "warn" | "log";
      }>();

    const constraints = constraintRows.map((r) => ({
      id: r.id,
      tier: r.tier,
      action: r.action,
      description: r.description,
      enforcementMode: r.enforcement_mode,
    }));

    // 3.5 F61: MCP runner 자동 선택
    const selectedRunner = await this.selectRunner(taskType, runner);

    // 3.6 SSE: task started
    this.sse?.pushEvent({
      event: "agent.task.started",
      data: {
        taskId,
        agentId,
        taskType,
        runnerType: selectedRunner.type,
        startedAt: now,
      },
    });

    // 4. Runner 실행
    const request: AgentExecutionRequest = {
      taskId,
      agentId,
      taskType,
      context,
      constraints,
    };

    const result = await selectedRunner.execute(request);

    // 5. 결과 기록
    await this.db
      .prepare(
        `UPDATE agent_tasks
         SET result = ?, tokens_used = ?, duration_ms = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        JSON.stringify(result.output),
        result.tokensUsed,
        result.duration,
        new Date().toISOString(),
        taskId,
      )
      .run();

    // 6. session 상태 업데이트
    const sessionStatus = result.status === "failed" ? "failed" : "completed";
    await this.db
      .prepare(
        `UPDATE agent_sessions
         SET status = ?, ended_at = ?
         WHERE id = ?`,
      )
      .bind(sessionStatus, new Date().toISOString(), sessionId)
      .run();

    // 6.5 SSE: task completed
    this.sse?.pushEvent({
      event: "agent.task.completed",
      data: {
        taskId,
        agentId,
        status: result.status,
        tokensUsed: result.tokensUsed,
        durationMs: result.duration,
        resultSummary: result.output.analysis?.slice(0, 200)
          ?? result.output.reviewComments?.map(c => c.comment).join('; ').slice(0, 200),
        completedAt: new Date().toISOString(),
      },
    });

    return result;
  }

  /**
   * F68: 여러 에이전트 작업을 병렬로 실행
   */
  async executeParallel(
    tasks: Array<{ agentId: string; taskType: AgentTaskType; context: AgentExecutionRequest["context"] }>,
    runner: AgentRunner,
  ): Promise<ParallelExecutionResult> {
    const executionId = `pexec-${crypto.randomUUID().slice(0, 8)}`;
    const startTime = Date.now();

    // Record parallel execution
    await this.db
      .prepare(
        `INSERT INTO parallel_executions (id, task_ids, agent_ids, status, total_tasks, created_at)
         VALUES (?, '[]', ?, 'running', ?, ?)`,
      )
      .bind(executionId, JSON.stringify(tasks.map((t) => t.agentId)), tasks.length, new Date().toISOString())
      .run();

    // Execute all tasks in parallel
    const settled = await Promise.allSettled(
      tasks.map((t) => this.executeTask(t.agentId, t.taskType, t.context, runner)),
    );

    const results: ParallelExecutionResult["results"] = [];
    const taskIds: string[] = [];
    let completedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i]!;
      const task = tasks[i]!;

      if (outcome.status === "fulfilled") {
        completedCount++;
        results.push({
          agentId: task.agentId,
          taskId: `task-${task.agentId}-${i}`,
          status: "success",
          result: outcome.value,
        });
        taskIds.push(`task-${task.agentId}-${i}`);
      } else {
        failedCount++;
        results.push({
          agentId: task.agentId,
          taskId: `task-${task.agentId}-${i}`,
          status: "failed",
          error: outcome.reason instanceof Error ? outcome.reason.message : "Unknown error",
        });
        taskIds.push(`task-${task.agentId}-${i}`);
      }
    }

    const durationMs = Date.now() - startTime;
    const status = failedCount === 0 ? "completed" : failedCount === tasks.length ? "partially_failed" : "partially_failed";

    await this.db
      .prepare(
        `UPDATE parallel_executions
         SET task_ids = ?, status = ?, completed_tasks = ?, failed_tasks = ?, duration_ms = ?, completed_at = ?
         WHERE id = ?`,
      )
      .bind(JSON.stringify(taskIds), status, completedCount, failedCount, durationMs, new Date().toISOString(), executionId)
      .run();

    return { executionId, results, durationMs };
  }

  /**
   * F68: 병렬 실행 + PR 생성 + Merge Queue 등록
   */
  async executeParallelWithPr(
    tasks: Array<{ agentId: string; taskType: AgentTaskType; context: AgentExecutionRequest["context"] }>,
    runner: AgentRunner,
  ): Promise<ParallelPrResult> {
    const execResult = await this.executeParallel(tasks, runner);

    const prs: ParallelPrResult["prs"] = [];
    let conflicts: ConflictReport = { conflicting: [], suggestedOrder: [], autoResolvable: true };

    for (const result of execResult.results) {
      if (result.status === "success" && result.result?.output.generatedCode?.length && this.prPipeline) {
        try {
          const prResult = await this.prPipeline.createAgentPr(result.agentId, result.taskId, result.result) as {
            id: string;
            prNumber: number | null;
            prUrl: string | null;
          };

          let queuePosition = 0;
          if (this.mergeQueue && prResult.prNumber) {
            const entry = await this.mergeQueue.enqueue(prResult.id, prResult.prNumber, result.agentId);
            queuePosition = entry.position;
          }

          prs.push({
            agentId: result.agentId,
            prNumber: prResult.prNumber,
            prUrl: prResult.prUrl,
            queuePosition,
          });
        } catch {
          prs.push({ agentId: result.agentId, prNumber: null, prUrl: null, queuePosition: 0 });
        }
      } else {
        prs.push({ agentId: result.agentId, prNumber: null, prUrl: null, queuePosition: 0 });
      }
    }

    if (this.mergeQueue) {
      conflicts = await this.mergeQueue.detectConflicts();
    }

    return { ...execResult, prs, conflicts };
  }

  async getTaskResult(taskId: string): Promise<{
    task: AgentTask;
    result: AgentExecutionResult["output"] | null;
  } | null> {
    const row = await this.db
      .prepare("SELECT * FROM agent_tasks WHERE id = ?")
      .bind(taskId)
      .first<{
        id: string;
        agent_session_id: string;
        branch: string;
        pr_number: number | null;
        pr_status: "draft" | "open" | "merged" | "closed";
        sdd_verified: number;
        task_type: string | null;
        result: string | null;
        tokens_used: number | null;
        duration_ms: number | null;
        runner_type: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!row) return null;

    return {
      task: {
        id: row.id,
        agentSessionId: row.agent_session_id,
        branch: row.branch,
        prNumber: row.pr_number ?? undefined,
        prStatus: row.pr_status,
        sddVerified: row.sdd_verified === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      result: row.result ? JSON.parse(row.result) : null,
    };
  }
}
