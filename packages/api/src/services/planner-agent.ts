import type {
  AgentPlan,
  AgentPlanStatus,
  ProposedStep,
} from "@foundry-x/shared";
import type { AgentTaskType, AgentExecutionRequest } from "./execution-types.js";
import type { SSEManager } from "./sse-manager.js";

interface ExternalToolInfo {
  serverId: string;
  serverName: string;
  tools: { name: string; description: string }[];
}

interface PlannerAgentDeps {
  db: D1Database;
  sse?: SSEManager;
  apiKey?: string;
  model?: string;
  mcpRegistry?: import("./mcp-registry.js").McpServerRegistry;
}

interface PlanRow {
  id: string;
  task_id: string;
  agent_id: string;
  codebase_analysis: string;
  proposed_steps: string;
  estimated_files: number;
  risks: string;
  estimated_tokens: number;
  status: string;
  human_feedback: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  execution_status: string | null;
  execution_started_at: string | null;
  execution_completed_at: string | null;
  execution_result: string | null;
  execution_error: string | null;
}

function mapRow(r: PlanRow): AgentPlan {
  return {
    id: r.id,
    taskId: r.task_id,
    agentId: r.agent_id,
    codebaseAnalysis: r.codebase_analysis,
    proposedSteps: JSON.parse(r.proposed_steps),
    estimatedFiles: r.estimated_files,
    risks: JSON.parse(r.risks || "[]"),
    estimatedTokens: r.estimated_tokens,
    status: r.status as AgentPlanStatus,
    humanFeedback: r.human_feedback ?? undefined,
    createdAt: r.created_at,
    approvedAt: r.approved_at ?? undefined,
    rejectedAt: r.rejected_at ?? undefined,
    executionStatus: (r.execution_status as AgentPlan["executionStatus"]) ?? undefined,
    executionStartedAt: r.execution_started_at ?? undefined,
    executionCompletedAt: r.execution_completed_at ?? undefined,
    executionResult: r.execution_result ? JSON.parse(r.execution_result) : undefined,
    executionError: r.execution_error ?? undefined,
  };
}

const PLANNER_SYSTEM_PROMPT = `You are a PlannerAgent for the Foundry-X project.
Your job is to analyze the given codebase context and create an execution plan.

You MUST respond with valid JSON in this exact schema:
{
  "codebaseAnalysis": "2-3 sentence analysis of the target codebase area",
  "proposedSteps": [
    {
      "description": "What to do in this step",
      "type": "create" | "modify" | "delete" | "test" | "external_tool",
      "targetFile": "optional/file/path.ts",
      "estimatedLines": 20,
      "externalTool": {
        "serverId": "server-id (from Available External Tools)",
        "toolName": "tool-name (from Available External Tools)",
        "arguments": { "key": "value" }
      }
    }
  ],
  "risks": ["Risk description 1"],
  "estimatedTokens": 5000
}

Guidelines:
- Analyze the target files and their relationships
- Break down the task into atomic, ordered steps
- Each step should modify at most 1-2 files
- Identify risks: dependency changes, breaking changes, test coverage gaps
- Estimate tokens conservatively (lines * 10 + overhead)
- Respond in Korean for analysis text, English for technical terms
- For "external_tool" type: ONLY use when the task cannot be accomplished by code changes alone.
  Include the externalTool field with serverId and toolName from the Available External Tools list.
  If no external tools are available or relevant, do NOT use this type.`;

export class PlannerAgent {
  constructor(private deps: PlannerAgentDeps) {}

  private mockAnalysis(
    _taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
  ): { codebaseAnalysis: string; proposedSteps: ProposedStep[]; risks: string[]; estimatedTokens: number } {
    const targetFiles = context.targetFiles ?? [];
    const codebaseAnalysis = targetFiles.length > 0
      ? `대상 파일 ${targetFiles.length}개 분석: ${targetFiles.join(", ")}`
      : `${context.repoUrl} 리포지토리 ${context.branch} 브랜치 분석`;

    const proposedSteps: ProposedStep[] = targetFiles.map((file) => ({
      description: `${file} 수정`,
      type: "modify" as const,
      targetFile: file,
      estimatedLines: 20,
    }));

    if (context.instructions) {
      proposedSteps.push({
        description: context.instructions,
        type: "create" as const,
        estimatedLines: 50,
      });
    }

    const risks: string[] = [];
    if (targetFiles.length > 5) {
      risks.push(`영향 범위가 넓음: ${targetFiles.length}개 파일 수정`);
    }

    const estimatedTokens = (targetFiles.length || 1) * 2000;

    return { codebaseAnalysis, proposedSteps, risks, estimatedTokens };
  }

  parseAnalysisResponse(
    text: string,
    context: AgentExecutionRequest["context"],
  ): { codebaseAnalysis: string; proposedSteps: ProposedStep[]; risks: string[]; estimatedTokens: number } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.mockAnalysis("code-generation", context);
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        codebaseAnalysis: parsed.codebaseAnalysis ?? "",
        proposedSteps: Array.isArray(parsed.proposedSteps) ? parsed.proposedSteps : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        estimatedTokens: typeof parsed.estimatedTokens === "number" ? parsed.estimatedTokens : 2000,
      };
    } catch {
      return this.mockAnalysis("code-generation", context);
    }
  }

  async gatherExternalToolInfo(): Promise<ExternalToolInfo[]> {
    if (!this.deps.mcpRegistry) return [];

    try {
      const servers = await this.deps.mcpRegistry.listServers();
      const result: ExternalToolInfo[] = [];

      for (const server of servers) {
        if (server.status !== "active" || !server.toolsCache) continue;
        try {
          const tools = JSON.parse(server.toolsCache) as { name: string; description?: string }[];
          const limited = tools.slice(0, 10).map((t) => ({
            name: t.name,
            description: (t.description ?? "").slice(0, 80),
          }));
          if (limited.length > 0) {
            result.push({
              serverId: server.id,
              serverName: server.name,
              tools: limited,
            });
          }
        } catch {
          // invalid toolsCache JSON — skip this server
        }
      }

      return result;
    } catch {
      return [];
    }
  }

  private buildPlannerPrompt(
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
  ): string {
    const lines = [
      `Task Type: ${taskType}`,
      `Repository: ${context.repoUrl}`,
      `Branch: ${context.branch}`,
    ];
    if (context.targetFiles?.length) {
      lines.push(`Target Files: ${context.targetFiles.join(", ")}`);
    }
    if (context.instructions) {
      lines.push(`Instructions: ${context.instructions}`);
    }
    if (context.spec) {
      lines.push(`Spec Context: ${context.spec}`);
    }
    return lines.join("\n");
  }

  private async analyzeCodebase(
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
  ): Promise<{ codebaseAnalysis: string; proposedSteps: ProposedStep[]; risks: string[]; estimatedTokens: number }> {
    if (!this.deps.apiKey) {
      return this.mockAnalysis(taskType, context);
    }

    const externalTools = await this.gatherExternalToolInfo();

    try {
      let prompt = this.buildPlannerPrompt(taskType, context);

      if (externalTools.length > 0) {
        prompt += "\n\nAvailable External Tools:";
        for (const server of externalTools) {
          prompt += `\n[Server: ${server.serverName} (id: ${server.serverId})]`;
          for (const tool of server.tools) {
            prompt += `\n  - ${tool.name}: ${tool.description}`;
          }
        }
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.deps.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.deps.model ?? "claude-haiku-4-5-20250714",
          max_tokens: 4096,
          system: PLANNER_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        return this.mockAnalysis(taskType, context);
      }

      const body = await res.json() as { content: Array<{ type: string; text?: string }> };
      const text = body.content?.find((c) => c.type === "text")?.text ?? "";
      return this.parseAnalysisResponse(text, context);
    } catch {
      return this.mockAnalysis(taskType, context);
    }
  }

  async createPlan(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
  ): Promise<AgentPlan> {
    const id = `plan-${crypto.randomUUID().slice(0, 8)}`;
    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const analysis = await this.analyzeCodebase(taskType, context);
    const estimatedFiles = analysis.proposedSteps.filter((s) => s.targetFile).length
      || context.targetFiles?.length || 1;

    const { codebaseAnalysis, proposedSteps, risks, estimatedTokens } = analysis;

    await this.deps.db
      .prepare(
        `INSERT INTO agent_plans
         (id, task_id, agent_id, codebase_analysis, proposed_steps,
          estimated_files, risks, estimated_tokens, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)`,
      )
      .bind(
        id, taskId, agentId, codebaseAnalysis,
        JSON.stringify(proposedSteps), estimatedFiles,
        JSON.stringify(risks), estimatedTokens, now,
      )
      .run();

    this.deps.sse?.pushEvent({
      event: "agent.plan.created",
      data: {
        planId: id,
        taskId,
        agentId,
        stepsCount: proposedSteps.length,
        estimatedTokens,
      },
    });

    return {
      id, taskId, agentId, codebaseAnalysis, proposedSteps,
      estimatedFiles, risks, estimatedTokens,
      status: "pending_approval", createdAt: now,
    };
  }

  async revisePlan(planId: string, feedback: string): Promise<AgentPlan> {
    await this.deps.db
      .prepare(
        `UPDATE agent_plans
         SET status = 'modified', human_feedback = ?
         WHERE id = ?`,
      )
      .bind(feedback, planId)
      .run();

    const plan = await this.getPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    return plan;
  }

  async approvePlan(planId: string): Promise<AgentPlan> {
    const now = new Date().toISOString();
    await this.deps.db
      .prepare(
        `UPDATE agent_plans
         SET status = 'approved', approved_at = ?
         WHERE id = ?`,
      )
      .bind(now, planId)
      .run();

    this.deps.sse?.pushEvent({
      event: "agent.plan.approved",
      data: { planId, approvedBy: "user" },
    });

    const plan = await this.getPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    return plan;
  }

  async rejectPlan(planId: string, reason?: string): Promise<AgentPlan> {
    const now = new Date().toISOString();
    await this.deps.db
      .prepare(
        `UPDATE agent_plans
         SET status = 'rejected', rejected_at = ?, human_feedback = COALESCE(?, human_feedback)
         WHERE id = ?`,
      )
      .bind(now, reason ?? null, planId)
      .run();

    this.deps.sse?.pushEvent({
      event: "agent.plan.rejected",
      data: { planId, reason },
    });

    const plan = await this.getPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    return plan;
  }

  async getPlan(planId: string): Promise<AgentPlan | null> {
    const row = await this.deps.db
      .prepare("SELECT * FROM agent_plans WHERE id = ?")
      .bind(planId)
      .first<PlanRow>();

    return row ? mapRow(row) : null;
  }

  async listPlans(agentId?: string): Promise<AgentPlan[]> {
    let query = "SELECT * FROM agent_plans";
    const bindings: string[] = [];

    if (agentId) {
      query += " WHERE agent_id = ?";
      bindings.push(agentId);
    }

    query += " ORDER BY created_at DESC";

    const stmt = this.deps.db.prepare(query);
    const { results } = bindings.length > 0
      ? await stmt.bind(...bindings).all<PlanRow>()
      : await stmt.all<PlanRow>();

    return results.map(mapRow);
  }
}
