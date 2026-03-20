/**
 * WorkflowEngine — 워크플로우 CRUD + 실행 엔진 (F101)
 */

import type { WorkflowCreate, WorkflowNode } from "../schemas/workflow.js";

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  definition: string;
  template_id: string | null;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  org_id: string;
  status: string;
  current_step: string | null;
  context: string | null;
  result: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ExecutionContext {
  lastResult?: Record<string, unknown>;
  variables: Record<string, unknown>;
}

/**
 * 사전 정의된 condition key 매핑 — 임의 코드 실행 차단
 */
const CONDITION_EVALUATORS: Record<string, (ctx: ExecutionContext) => boolean> = {
  approval_granted: (ctx) => ctx.lastResult?.approved === true,
  analysis_passed: (ctx) => ((ctx.lastResult?.matchRate as number) ?? 0) >= 90,
  pr_merged: (ctx) => ctx.lastResult?.prState === "merged",
  always: () => true,
};

function toWorkflow(row: Record<string, unknown>): Workflow {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    definition: row.definition as string,
    template_id: (row.template_id as string) ?? null,
    enabled: !!(row.enabled as number),
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function toExecution(row: Record<string, unknown>): WorkflowExecution {
  return {
    id: row.id as string,
    workflow_id: row.workflow_id as string,
    org_id: row.org_id as string,
    status: row.status as string,
    current_step: (row.current_step as string) ?? null,
    context: (row.context as string) ?? null,
    result: (row.result as string) ?? null,
    error: (row.error as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    created_at: row.created_at as string,
  };
}

export class WorkflowEngine {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, input: WorkflowCreate): Promise<Workflow> {
    const id = `wf_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO workflows (id, org_id, name, description, definition, template_id, enabled, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      )
      .bind(
        id,
        orgId,
        input.name,
        input.description ?? null,
        JSON.stringify(input.definition),
        input.template_id ?? null,
        userId,
        now,
        now,
      )
      .run();

    const row = await this.db.prepare("SELECT * FROM workflows WHERE id = ?").bind(id).first();
    return toWorkflow(row as Record<string, unknown>);
  }

  async list(orgId: string): Promise<Workflow[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM workflows WHERE org_id = ? ORDER BY created_at DESC")
      .bind(orgId)
      .all();
    return (results ?? []).map((r) => toWorkflow(r as Record<string, unknown>));
  }

  async get(orgId: string, id: string): Promise<Workflow | null> {
    const row = await this.db
      .prepare("SELECT * FROM workflows WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first();
    return row ? toWorkflow(row as Record<string, unknown>) : null;
  }

  async update(orgId: string, id: string, patch: Partial<WorkflowCreate>): Promise<Workflow | null> {
    const existing = await this.get(orgId, id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = patch.name ?? existing.name;
    const description = patch.description ?? existing.description;
    const definition = patch.definition ? JSON.stringify(patch.definition) : existing.definition;

    await this.db
      .prepare("UPDATE workflows SET name = ?, description = ?, definition = ?, updated_at = ? WHERE id = ? AND org_id = ?")
      .bind(name, description, definition, now, id, orgId)
      .run();

    return this.get(orgId, id);
  }

  async delete(orgId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM workflows WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async execute(orgId: string, workflowId: string, initialContext?: Record<string, unknown>): Promise<WorkflowExecution> {
    const workflow = await this.get(orgId, workflowId);
    if (!workflow) throw new WorkflowError(404, "Workflow not found");

    const definition = JSON.parse(workflow.definition) as { nodes: WorkflowNode[]; edges: Array<{ id: string; source: string; target: string; condition?: string }> };
    const execId = `wfe_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO workflow_executions (id, workflow_id, org_id, status, context, started_at, created_at)
         VALUES (?, ?, ?, 'running', ?, ?, ?)`,
      )
      .bind(execId, workflowId, orgId, JSON.stringify(initialContext ?? {}), now, now)
      .run();

    const trigger = definition.nodes.find((n) => n.type === "trigger");
    if (!trigger) {
      await this.updateExecution(execId, { status: "failed", error: "No trigger node found" });
      const row = await this.db.prepare("SELECT * FROM workflow_executions WHERE id = ?").bind(execId).first();
      return toExecution(row as Record<string, unknown>);
    }

    try {
      const ctx: ExecutionContext = { variables: initialContext ?? {} };
      await this.executeNode(execId, trigger, definition, ctx);
      await this.updateExecution(execId, { status: "completed", completed_at: new Date().toISOString() });
    } catch (e) {
      await this.updateExecution(execId, { status: "failed", error: e instanceof Error ? e.message : String(e) });
    }

    const row = await this.db.prepare("SELECT * FROM workflow_executions WHERE id = ?").bind(execId).first();
    return toExecution(row as Record<string, unknown>);
  }

  private async executeNode(
    execId: string,
    node: WorkflowNode,
    def: { nodes: WorkflowNode[]; edges: Array<{ id: string; source: string; target: string; condition?: string }> },
    ctx: ExecutionContext,
  ): Promise<void> {
    await this.updateExecution(execId, { current_step: node.id, status: "running" });

    // Action execution (placeholder — real impl would call orchestrator)
    switch (node.data.actionType) {
      case "run_agent":
      case "create_pr":
      case "send_notification":
      case "run_analysis":
      case "wait_approval":
        // Placeholder: record the action was processed
        ctx.lastResult = { actionType: node.data.actionType, processed: true };
        break;
    }

    // Follow outgoing edges
    const nextEdges = def.edges.filter((e) => e.source === node.id);
    for (const edge of nextEdges) {
      if (edge.condition && !CONDITION_EVALUATORS[edge.condition]?.(ctx)) continue;
      const nextNode = def.nodes.find((n) => n.id === edge.target);
      if (nextNode && nextNode.type !== "end") {
        await this.executeNode(execId, nextNode, def, ctx);
      }
    }
  }

  private async updateExecution(execId: string, patch: Record<string, unknown>): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(patch)) {
      sets.push(`${key} = ?`);
      values.push(value);
    }

    if (sets.length === 0) return;
    values.push(execId);

    await this.db
      .prepare(`UPDATE workflow_executions SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

export class WorkflowError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

// ─── Workflow Templates ───

export const WORKFLOW_TEMPLATES = [
  {
    id: "tpl_pr_review",
    name: "PR Review Pipeline",
    description: "코드 리뷰 → 승인 대기 → 머지",
    definition: {
      nodes: [
        { id: "trigger", type: "trigger" as const, label: "PR Created", position: { x: 0, y: 0 }, data: {} },
        { id: "review", type: "action" as const, label: "Run Reviewer", position: { x: 200, y: 0 }, data: { actionType: "run_agent" as const, config: { agent: "reviewer" } } },
        { id: "approval", type: "action" as const, label: "Wait Approval", position: { x: 400, y: 0 }, data: { actionType: "wait_approval" as const } },
        { id: "end", type: "end" as const, label: "Done", position: { x: 600, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e1", source: "trigger", target: "review" },
        { id: "e2", source: "review", target: "approval" },
        { id: "e3", source: "approval", target: "end", condition: "approval_granted" },
      ],
    },
  },
  {
    id: "tpl_analysis",
    name: "Codebase Analysis",
    description: "코드 분석 → 결과 알림",
    definition: {
      nodes: [
        { id: "trigger", type: "trigger" as const, label: "Manual Trigger", position: { x: 0, y: 0 }, data: {} },
        { id: "analyze", type: "action" as const, label: "Run Analysis", position: { x: 200, y: 0 }, data: { actionType: "run_analysis" as const } },
        { id: "notify", type: "action" as const, label: "Send Notification", position: { x: 400, y: 0 }, data: { actionType: "send_notification" as const } },
        { id: "end", type: "end" as const, label: "Done", position: { x: 600, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e1", source: "trigger", target: "analyze" },
        { id: "e2", source: "analyze", target: "notify", condition: "always" },
        { id: "e3", source: "notify", target: "end" },
      ],
    },
  },
  {
    id: "tpl_auto_pr",
    name: "Auto PR Creation",
    description: "에이전트 실행 → 분석 통과 시 PR 생성",
    definition: {
      nodes: [
        { id: "trigger", type: "trigger" as const, label: "Task Assigned", position: { x: 0, y: 0 }, data: {} },
        { id: "agent", type: "action" as const, label: "Run Agent", position: { x: 200, y: 0 }, data: { actionType: "run_agent" as const } },
        { id: "check", type: "condition" as const, label: "Analysis Passed?", position: { x: 400, y: 0 }, data: {} },
        { id: "pr", type: "action" as const, label: "Create PR", position: { x: 600, y: -50 }, data: { actionType: "create_pr" as const } },
        { id: "end", type: "end" as const, label: "Done", position: { x: 800, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e1", source: "trigger", target: "agent" },
        { id: "e2", source: "agent", target: "check" },
        { id: "e3", source: "check", target: "pr", condition: "analysis_passed" },
        { id: "e4", source: "check", target: "end" },
        { id: "e5", source: "pr", target: "end" },
      ],
    },
  },
];
