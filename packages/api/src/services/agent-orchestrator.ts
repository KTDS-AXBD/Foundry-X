import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentTaskType,
} from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";
import type { SSEManager } from "./sse-manager.js";

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
  constructor(private db: D1Database, private sse?: SSEManager) {}

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

    // 3.5 SSE: task started
    this.sse?.pushEvent({
      event: "agent.task.started",
      data: {
        taskId,
        agentId,
        taskType,
        runnerType: runner.type,
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

    const result = await runner.execute(request);

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
