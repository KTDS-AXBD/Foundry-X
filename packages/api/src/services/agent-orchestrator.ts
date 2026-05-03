import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentTaskType,
} from "./agent/execution-types.js";
import type { AgentRunner } from "./agent/agent-runner.js";
import type { SSEManager } from "./sse-manager.js";
import type { McpServerRegistry } from "../core/agent/services/mcp-registry.js";
import type { MergeQueueService } from "./merge-queue.js";
import type { PlannerAgent } from "../core/agent/services/planner-agent.js";
import type { WorktreeManager } from "./worktree-manager.js";
import type { AutoFixService } from "../core/harness/services/auto-fix.js";
import type { ArchitectAgent } from "../core/agent/services/architect-agent.js";
import type { TestAgent } from "../core/agent/services/test-agent.js";
import type { SecurityAgent } from "../core/agent/services/security-agent.js";
import type { QAAgent } from "../core/agent/services/qa-agent.js";
import type { InfraAgent } from "../core/agent/services/infra-agent.js";
import type { CustomRoleManager } from "../core/harness/services/custom-role-manager.js";
import type { ParallelExecutionResult, ParallelPrResult, ConflictReport, AgentPlan } from "@foundry-x/shared";

export class PlanTimeoutError extends Error {
  constructor(public readonly planId: string, public readonly timeoutMs: number) {
    super(`Plan ${planId} approval timed out after ${timeoutMs}ms`);
    this.name = "PlanTimeoutError";
  }
}
export class PlanRejectedError extends Error {
  constructor(public readonly planId: string, public readonly reason?: string) {
    super(`Plan ${planId} was rejected${reason ? `: ${reason}` : ""}`);
    this.name = "PlanRejectedError";
  }
}
export class PlanCancelledError extends Error {
  constructor(public readonly planId: string, public readonly reason?: string) {
    super(`Plan ${planId} was cancelled${reason ? `: ${reason}` : ""}`);
    this.name = "PlanCancelledError";
  }
}
import { OpenRouterRunner } from "../core/agent/services/openrouter-runner.js";
import { createRoutedRunner } from "./agent/agent-runner.js";
import { McpRunner } from "../core/agent/services/mcp-runner.js";
import { createTransport } from "../core/agent/services/mcp-transport.js";
import { TASK_TYPE_TO_MCP_TOOL } from "../core/agent/services/mcp-adapter.js";

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
  private plannerAgent?: PlannerAgent;
  private worktreeManager?: WorktreeManager;
  private autoFix?: AutoFixService;
  private architectAgent?: ArchitectAgent;
  private testAgent?: TestAgent;
  private securityAgent?: SecurityAgent;
  private qaAgent?: QAAgent;
  private infraAgent?: InfraAgent;
  private customRoleManager?: CustomRoleManager;

  constructor(
    private db: D1Database,
    private sse?: SSEManager,
    private mcpRegistry?: McpServerRegistry,
  ) {}

  /** F68: Merge Queue 서비스 주입 */
  setMergeQueue(queue: MergeQueueService): void {
    this.mergeQueue = queue;
  }

  /** F70: PlannerAgent 서비스 주입 */
  setPlannerAgent(planner: PlannerAgent): void {
    this.plannerAgent = planner;
  }

  /** F72: WorktreeManager 서비스 주입 */
  setWorktreeManager(manager: WorktreeManager): void {
    this.worktreeManager = manager;
  }

  /** F138: ArchitectAgent 서비스 주입 */
  setArchitectAgent(agent: ArchitectAgent): void {
    this.architectAgent = agent;
  }

  /** F139: TestAgent 서비스 주입 */
  setTestAgent(agent: TestAgent): void {
    this.testAgent = agent;
  }

  /** F140: SecurityAgent 서비스 주입 */
  setSecurityAgent(agent: SecurityAgent): void {
    this.securityAgent = agent;
  }

  /** F141: QAAgent 서비스 주입 */
  setQAAgent(agent: QAAgent): void {
    this.qaAgent = agent;
  }

  /** F145: InfraAgent 서비스 주입 */
  setInfraAgent(agent: InfraAgent): void {
    this.infraAgent = agent;
  }

  /** F146: CustomRoleManager 서비스 주입 */
  setCustomRoleManager(mgr: CustomRoleManager): void {
    this.customRoleManager = mgr;
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
    taskType: AgentTaskType | string,
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

    // 3.4 F146: custom:* 역할 위임
    if (typeof taskType === "string" && taskType.startsWith("custom:") && this.customRoleManager) {
      const roleId = taskType.slice("custom:".length);
      const role = await this.customRoleManager.getRole(roleId);
      if (!role) {
        const failedResult: AgentExecutionResult = {
          status: "failed",
          output: { analysis: `Custom role not found: ${roleId}` },
          tokensUsed: 0,
          model: "none",
          duration: 0,
        };
        await this.recordTaskResult(taskId, sessionId, agentId, failedResult);
        return failedResult;
      }
      if (!role.enabled) {
        const failedResult: AgentExecutionResult = {
          status: "failed",
          output: { analysis: `Custom role is disabled: ${role.name}` },
          tokensUsed: 0,
          model: "none",
          duration: 0,
        };
        await this.recordTaskResult(taskId, sessionId, agentId, failedResult);
        return failedResult;
      }
      let customRunner: AgentRunner;
      if (role.preferredModel) {
        const apiKey = (runner as unknown as { apiKey?: string }).apiKey ?? "";
        customRunner = new OpenRouterRunner(apiKey, role.preferredModel);
      } else {
        customRunner = await createRoutedRunner(
          {} as { OPENROUTER_API_KEY?: string; ANTHROPIC_API_KEY?: string },
          role.taskType as AgentTaskType,
          this.db,
        );
      }
      const customRequest: AgentExecutionRequest = {
        taskId,
        agentId,
        taskType: role.taskType as AgentTaskType,
        context: { ...context, systemPromptOverride: role.systemPrompt },
        constraints,
      };
      const customResult = await customRunner.execute(customRequest);
      await this.recordTaskResult(taskId, sessionId, agentId, customResult);
      return customResult;
    }

    // 3.5a F138/F139: 역할 에이전트 위임
    const delegateRequest: AgentExecutionRequest = {
      taskId, agentId, taskType: taskType as AgentTaskType, context, constraints,
    };
    if (taskType === "spec-analysis" && this.architectAgent) {
      const analysisResult = await this.architectAgent.analyzeArchitecture(delegateRequest);
      const delegatedResult: AgentExecutionResult = {
        status: "success",
        output: { analysis: JSON.stringify(analysisResult) },
        tokensUsed: analysisResult.tokensUsed,
        model: analysisResult.model,
        duration: analysisResult.duration,
      };
      await this.recordTaskResult(taskId, sessionId, agentId, delegatedResult);
      return delegatedResult;
    }
    if (taskType === "test-generation" && this.testAgent) {
      const testResult = await this.testAgent.generateTests(delegateRequest);
      const delegatedResult: AgentExecutionResult = {
        status: "success",
        output: {
          analysis: JSON.stringify(testResult),
          generatedCode: testResult.testFiles.map((f: { path: string; content: string }) => ({
            path: f.path,
            content: f.content,
            action: "create" as const,
          })),
        },
        tokensUsed: testResult.tokensUsed,
        model: testResult.model,
        duration: testResult.duration,
      };
      await this.recordTaskResult(taskId, sessionId, agentId, delegatedResult);
      return delegatedResult;
    }
    if (taskType === "security-review" && this.securityAgent) {
      const scanResult = await this.securityAgent.scanVulnerabilities(delegateRequest);
      const delegatedResult: AgentExecutionResult = {
        status: "success",
        output: { analysis: JSON.stringify(scanResult) },
        tokensUsed: scanResult.tokensUsed,
        model: scanResult.model,
        duration: scanResult.duration,
      };
      await this.recordTaskResult(taskId, sessionId, agentId, delegatedResult);
      return delegatedResult;
    }
    if (taskType === "qa-testing" && this.qaAgent) {
      const qaResult = await this.qaAgent.runBrowserTest(delegateRequest);
      const delegatedResult: AgentExecutionResult = {
        status: "success",
        output: {
          analysis: JSON.stringify(qaResult),
          generatedCode: qaResult.scenarios.map((s: { name: string; playwrightCode: string }) => ({
            path: `e2e/${s.name.replace(/\s+/g, "-").toLowerCase()}.spec.ts`,
            content: s.playwrightCode,
            action: "create" as const,
          })),
        },
        tokensUsed: qaResult.tokensUsed,
        model: qaResult.model,
        duration: qaResult.duration,
      };
      await this.recordTaskResult(taskId, sessionId, agentId, delegatedResult);
      return delegatedResult;
    }
    if (taskType === "infra-analysis" && this.infraAgent) {
      const infraResult = await this.infraAgent.analyzeInfra(delegateRequest);
      const delegatedResult: AgentExecutionResult = {
        status: "success",
        output: { analysis: JSON.stringify(infraResult) },
        tokensUsed: infraResult.tokensUsed,
        model: infraResult.model,
        duration: infraResult.duration,
      };
      await this.recordTaskResult(taskId, sessionId, agentId, delegatedResult);
      return delegatedResult;
    }

    // 3.5 F61: MCP runner 자동 선택
    const selectedRunner = await this.selectRunner(taskType as AgentTaskType, runner);

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
      taskType: taskType as AgentTaskType,
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

  /** F138/F139: 역할 에이전트 위임 결과 기록 헬퍼 */
  private async recordTaskResult(
    taskId: string,
    sessionId: string,
    agentId: string,
    result: AgentExecutionResult,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE agent_tasks SET result = ?, tokens_used = ?, duration_ms = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(JSON.stringify(result.output), result.tokensUsed, result.duration, now, taskId)
      .run();
    const sessionStatus = result.status === "failed" ? "failed" : "completed";
    await this.db
      .prepare(`UPDATE agent_sessions SET status = ?, ended_at = ? WHERE id = ?`)
      .bind(sessionStatus, now, sessionId)
      .run();
    this.sse?.pushEvent({
      event: "agent.task.completed",
      data: {
        taskId,
        agentId,
        status: result.status,
        tokensUsed: result.tokensUsed,
        durationMs: result.duration,
        resultSummary: result.output.analysis?.slice(0, 200),
        completedAt: now,
      },
    });
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

  /**
   * F82: 계획 수립 후 승인 대기 — polling loop
   */
  async createPlanAndWait(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
    options?: { pollIntervalMs?: number; timeoutMs?: number; signal?: AbortSignal },
  ): Promise<AgentPlan> {
    if (!this.plannerAgent) {
      throw new Error("PlannerAgent not configured — call setPlannerAgent() first");
    }
    const pollInterval = options?.pollIntervalMs ?? 1000;
    const timeout = options?.timeoutMs ?? 300_000;
    const plan = await this.plannerAgent.createPlan(agentId, taskType, context);
    this.sse?.pushEvent({
      event: "agent.plan.waiting",
      data: { planId: plan.id, taskId: plan.taskId, agentId, stepsCount: plan.proposedSteps.length, timeoutMs: timeout },
    });
    const startTime = Date.now();
    while (true) {
      if (options?.signal?.aborted) throw new PlanCancelledError(plan.id);
      if (Date.now() - startTime > timeout) {
        await this.plannerAgent.rejectPlan(plan.id, "Timeout: 승인 대기 시간 초과");
        throw new PlanTimeoutError(plan.id, timeout);
      }
      const current = await this.plannerAgent.getPlan(plan.id);
      if (!current) throw new Error(`Plan ${plan.id} not found during polling`);
      if (current.status === "approved") return current;
      if (current.status === "rejected") throw new PlanRejectedError(plan.id, current.humanFeedback);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * F82: 승인된 계획 실행 — executing→completed/failed 라이프사이클
   */
  async executePlan(
    planId: string,
    runner: AgentRunner,
    options?: { repoUrl?: string; branch?: string },
  ): Promise<AgentExecutionResult> {
    if (!this.plannerAgent) throw new Error("PlannerAgent not configured");
    const plan = await this.plannerAgent.getPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    if (plan.status !== "approved" && plan.status !== "failed") {
      throw new Error(`Plan ${planId} cannot be executed (status: ${plan.status})`);
    }
    const now = new Date().toISOString();
    await this.db.prepare(
      `UPDATE agent_plans SET status = 'executing', execution_status = 'executing', execution_started_at = ?, execution_error = NULL WHERE id = ?`,
    ).bind(now, planId).run();
    this.sse?.pushEvent({ event: "agent.plan.executing", data: { planId, startedAt: now } });
    try {
      const context: AgentExecutionRequest["context"] = {
        repoUrl: options?.repoUrl || "", branch: options?.branch || "master",
        targetFiles: plan.proposedSteps.filter((s: { targetFile?: string }) => s.targetFile).map((s: { targetFile?: string }) => s.targetFile!),
        instructions: plan.proposedSteps.map((s: { type: string; description: string }, i: number) => `Step ${i + 1} (${s.type}): ${s.description}`).join("\n"),
      };
      const result = await this.executeTask(plan.agentId, "code-generation", context, runner);
      const completedAt = new Date().toISOString();
      await this.db.prepare(
        `UPDATE agent_plans SET status = 'completed', execution_status = 'completed', execution_completed_at = ?, execution_result = ? WHERE id = ?`,
      ).bind(completedAt, JSON.stringify(result), planId).run();
      this.sse?.pushEvent({ event: "agent.plan.completed", data: { planId, completedAt, tokensUsed: result.tokensUsed, duration: result.duration } });
      return result;
    } catch (err) {
      const failedAt = new Date().toISOString();
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.db.prepare(
        `UPDATE agent_plans SET status = 'failed', execution_status = 'failed', execution_completed_at = ?, execution_error = ? WHERE id = ?`,
      ).bind(failedAt, errorMsg, planId).run();
      this.sse?.pushEvent({ event: "agent.plan.failed", data: { planId, failedAt, error: errorMsg } });
      throw err;
    }
  }

  /**
   * F72: worktree 격리 모드 실행
   */
  async executeTaskIsolated(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
    runner: AgentRunner,
  ): Promise<AgentExecutionResult> {
    if (!this.worktreeManager) {
      return this.executeTask(agentId, taskType, context, runner);
    }

    const branchName = `agent/${agentId}/${Date.now()}`;
    await this.worktreeManager.create(agentId, branchName, context.branch);

    try {
      const isolatedContext = { ...context, branch: branchName };
      return await this.executeTask(agentId, taskType, isolatedContext, runner);
    } finally {
      await this.worktreeManager.cleanup(agentId);
    }
  }

  /** F101: AutoFix 서비스 주입 */
  setAutoFix(service: AutoFixService): void {
    this.autoFix = service;
  }

  /**
   * F101: 작업 실행 + Hook 실패 시 AutoFix 재시도
   * executeTask() 완료 후 result.status=failed이고 hook 관련 에러면 autoFix.retryWithFix 호출
   */
  async executeTaskWithAutoFix(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
    runner: AgentRunner,
  ): Promise<{ result: AgentExecutionResult; autoFixResult?: { fixed: boolean; attempts: number; escalated: boolean } }> {
    const result = await this.executeTask(agentId, taskType, context, runner);

    if (
      result.status === "failed" &&
      this.autoFix &&
      result.output.analysis?.toLowerCase().includes("hook")
    ) {
      const taskId = `task-${agentId}-${Date.now()}`;
      const fileContext = context.targetFiles?.join(", ") ?? "";
      const fixResult = await this.autoFix.retryWithFix(
        taskId,
        "pre-commit",
        result.output.analysis ?? "Hook failure",
        fileContext,
        context.targetFiles,
      );

      return {
        result,
        autoFixResult: {
          fixed: fixResult.fixed,
          attempts: fixResult.attempts.length,
          escalated: fixResult.escalated,
        },
      };
    }

    return { result };
  }
}
