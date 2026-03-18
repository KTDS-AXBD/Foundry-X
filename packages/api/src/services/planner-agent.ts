import type {
  AgentPlan,
  AgentPlanStatus,
  ProposedStep,
} from "@foundry-x/shared";
import type { AgentTaskType, AgentExecutionRequest } from "./execution-types.js";
import type { SSEManager } from "./sse-manager.js";

interface PlannerAgentDeps {
  db: D1Database;
  sse?: SSEManager;
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
  };
}

export class PlannerAgent {
  constructor(private deps: PlannerAgentDeps) {}

  async createPlan(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
  ): Promise<AgentPlan> {
    const id = `plan-${crypto.randomUUID().slice(0, 8)}`;
    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 코드베이스 분석 (Mock — LLM 없이 context 기반 자동 생성)
    const targetFiles = context.targetFiles ?? [];
    const codebaseAnalysis = targetFiles.length > 0
      ? `대상 파일 ${targetFiles.length}개 분석: ${targetFiles.join(", ")}`
      : `${context.repoUrl} 리포지토리 ${context.branch} 브랜치 분석`;

    // 실행 단계 생성
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

    // 리스크 평가
    const risks: string[] = [];
    if (targetFiles.length > 5) {
      risks.push(`영향 범위가 넓음: ${targetFiles.length}개 파일 수정`);
    }

    const estimatedFiles = targetFiles.length || 1;
    const estimatedTokens = estimatedFiles * 2000;

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
