/**
 * F150: AgentFeedbackLoopService — Capture agent failures, collect human feedback, apply learnings
 * Implements the AI-Human feedback loop for continuous agent improvement.
 */
import type { AgentExecutionResult, AgentTaskType } from "./execution-types.js";

// ── Interfaces ──────────────────────────────────────────

export interface AgentFailureRecord {
  id: string;
  executionId: string;
  taskType: AgentTaskType;
  failureReason: string | null;
  humanFeedback: string | null;
  promptHint: string | null;
  status: "pending" | "reviewed" | "applied";
  createdAt: string;
  updatedAt: string;
}

export interface LearningResult {
  feedbackId: string;
  promptHint: string;
  appliedTo: AgentTaskType;
}

// ── Service ─────────────────────────────────────────────

export class AgentFeedbackLoopService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /** Capture an agent execution failure or partial result for human review */
  async captureFailure(
    executionId: string,
    taskType: AgentTaskType,
    result: AgentExecutionResult,
    attemptedModels?: string[],
  ): Promise<AgentFailureRecord> {
    const id = `afb-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    let failureReason: string | null = null;
    if (result.status === "failed") {
      failureReason = result.output.analysis ?? "Unknown failure";
    } else if (result.status === "partial") {
      failureReason = "Partial result — incomplete output";
    }

    const record: AgentFailureRecord = {
      id,
      executionId,
      taskType,
      failureReason,
      humanFeedback: null,
      promptHint: null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await this.db
      .prepare(
        `INSERT INTO agent_feedback (id, execution_id, task_type, failure_reason, human_feedback, prompt_hint, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        record.id,
        record.executionId,
        record.taskType,
        record.failureReason,
        record.humanFeedback,
        record.promptHint,
        record.status,
        record.createdAt,
        record.updatedAt,
      )
      .run();

    return record;
  }

  /** Submit human feedback for a captured failure */
  async submitHumanFeedback(
    failureId: string,
    feedback: string,
    _expectedOutcome?: string,
  ): Promise<AgentFailureRecord> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE agent_feedback SET human_feedback = ?, status = 'reviewed', updated_at = ? WHERE id = ?`,
      )
      .bind(feedback, now, failureId)
      .run();

    const record = await this.getById(failureId);
    if (!record) {
      throw new Error(`Feedback record not found: ${failureId}`);
    }
    return record;
  }

  /** Apply learning from reviewed feedback — generates a prompt hint */
  async applyLearning(feedbackId: string): Promise<LearningResult> {
    const record = await this.getById(feedbackId);
    if (!record) {
      throw new Error(`Feedback record not found: ${feedbackId}`);
    }
    if (!record.humanFeedback) {
      throw new Error(`No human feedback to apply for: ${feedbackId}`);
    }

    const promptHint = this.extractPromptHint(record.humanFeedback, record.taskType);
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE agent_feedback SET prompt_hint = ?, status = 'applied', updated_at = ? WHERE id = ?`,
      )
      .bind(promptHint, now, feedbackId)
      .run();

    return {
      feedbackId,
      promptHint,
      appliedTo: record.taskType,
    };
  }

  /** Extract a reusable prompt hint from human feedback */
  extractPromptHint(feedback: string, taskType: AgentTaskType): string {
    const truncated = feedback.slice(0, 200);
    return `When performing ${taskType}, note: ${truncated}`;
  }

  /** Get applied prompt hints for a task type (most recent 5) */
  async getAppliedHints(taskType: AgentTaskType): Promise<string[]> {
    const { results } = await this.db
      .prepare(
        `SELECT prompt_hint FROM agent_feedback WHERE status = 'applied' AND task_type = ? ORDER BY updated_at DESC LIMIT 5`,
      )
      .bind(taskType)
      .all<{ prompt_hint: string }>();

    return (results ?? []).map((r) => r.prompt_hint);
  }

  /** Get a single feedback record by ID */
  async getById(id: string): Promise<AgentFailureRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, execution_id, task_type, failure_reason, human_feedback, prompt_hint, status, created_at, updated_at FROM agent_feedback WHERE id = ?`,
      )
      .bind(id)
      .first<{
        id: string;
        execution_id: string;
        task_type: string;
        failure_reason: string | null;
        human_feedback: string | null;
        prompt_hint: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>();

    if (!row) return null;

    return {
      id: row.id,
      executionId: row.execution_id,
      taskType: row.task_type as AgentTaskType,
      failureReason: row.failure_reason,
      humanFeedback: row.human_feedback,
      promptHint: row.prompt_hint,
      status: row.status as AgentFailureRecord["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** List all feedback records for an execution */
  async listByExecution(executionId: string): Promise<AgentFailureRecord[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, execution_id, task_type, failure_reason, human_feedback, prompt_hint, status, created_at, updated_at FROM agent_feedback WHERE execution_id = ?`,
      )
      .bind(executionId)
      .all<{
        id: string;
        execution_id: string;
        task_type: string;
        failure_reason: string | null;
        human_feedback: string | null;
        prompt_hint: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>();

    return (results ?? []).map((row) => ({
      id: row.id,
      executionId: row.execution_id,
      taskType: row.task_type as AgentTaskType,
      failureReason: row.failure_reason,
      humanFeedback: row.human_feedback,
      promptHint: row.prompt_hint,
      status: row.status as AgentFailureRecord["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
