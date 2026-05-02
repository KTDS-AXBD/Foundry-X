// ─── F333: TaskStateService — 태스크 상태 관리 서비스 (Sprint 148) ───

import {
  TaskState,
  type EventSource,
  type TransitionRequest,
  type TransitionResult,
  type TaskStateRecord,
  type TaskStateHistoryRecord,
  getAvailableTransitions,
} from "@foundry-x/shared";
// Phase 46: harness-kit 이전 예정 — fx-agent/services로 복사
import type { TransitionGuard } from "./transition-guard.js";

export class TaskStateService {
  constructor(
    private db: D1Database,
    private guard: TransitionGuard,
  ) {}

  /** 현재 태스크 상태 조회 */
  async getState(taskId: string, tenantId: string): Promise<TaskStateRecord | null> {
    const row = await this.db.prepare(
      "SELECT * FROM task_states WHERE task_id = ? AND tenant_id = ?"
    ).bind(taskId, tenantId).first();

    if (!row) return null;
    return this.toRecord(row);
  }

  /** 전이 이력 조회 (최신순) */
  async getHistory(taskId: string, tenantId: string, limit = 10): Promise<TaskStateHistoryRecord[]> {
    const { results } = await this.db.prepare(
      "SELECT * FROM task_state_history WHERE task_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT ?"
    ).bind(taskId, tenantId, limit).all();

    return (results ?? []).map((r) => this.toHistoryRecord(r));
  }

  /** 태스크 생성 (초기 INTAKE 상태) */
  async createTask(
    taskId: string,
    tenantId: string,
    agentId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<TaskStateRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(
      `INSERT INTO task_states (id, task_id, tenant_id, current_state, agent_id, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, taskId, tenantId, TaskState.INTAKE,
      agentId ?? null,
      metadata ? JSON.stringify(metadata) : null,
      now, now,
    ).run();

    return {
      id,
      taskId,
      tenantId,
      currentState: TaskState.INTAKE,
      agentId: agentId ?? null,
      metadata: metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /** 상태 전이 — TransitionGuard 검증 후 실행 */
  async transition(
    req: TransitionRequest,
    tenantId: string,
    userId?: string,
  ): Promise<TransitionResult> {
    const current = await this.getState(req.taskId, tenantId);
    if (!current) {
      return {
        success: false,
        taskId: req.taskId,
        fromState: TaskState.INTAKE,
        toState: req.toState,
        timestamp: new Date().toISOString(),
        guardMessage: `Task ${req.taskId} not found`,
      };
    }

    const guardResult = await this.guard.check({
      taskId: req.taskId,
      fromState: current.currentState,
      toState: req.toState,
      tenantId,
      triggerSource: req.triggerSource,
      metadata: req.metadata,
    });

    const now = new Date().toISOString();

    if (!guardResult.allowed) {
      return {
        success: false,
        taskId: req.taskId,
        fromState: current.currentState,
        toState: req.toState,
        timestamp: now,
        guardMessage: guardResult.message,
      };
    }

    // 상태 갱신
    await this.db.prepare(
      `UPDATE task_states SET current_state = ?, updated_at = ? WHERE task_id = ? AND tenant_id = ?`
    ).bind(req.toState, now, req.taskId, tenantId).run();

    // 이력 기록
    const historyId = crypto.randomUUID();
    await this.db.prepare(
      `INSERT INTO task_state_history (id, task_id, tenant_id, from_state, to_state, trigger_source, trigger_event, guard_result, transitioned_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      historyId, req.taskId, tenantId,
      current.currentState, req.toState,
      req.triggerSource ?? null,
      req.triggerEvent ?? null,
      'allowed',
      userId ?? null,
      now,
    ).run();

    return {
      success: true,
      taskId: req.taskId,
      fromState: current.currentState,
      toState: req.toState,
      timestamp: now,
    };
  }

  /** 상태별 목록 조회 */
  async listByState(
    tenantId: string,
    state?: TaskState,
    limit = 20,
    offset = 0,
  ): Promise<{ items: TaskStateRecord[]; total: number }> {
    const where = state
      ? "WHERE tenant_id = ? AND current_state = ?"
      : "WHERE tenant_id = ?";
    const countBinds = state ? [tenantId, state] : [tenantId];

    const countRow = await this.db.prepare(
      `SELECT COUNT(*) as total FROM task_states ${where}`
    ).bind(...countBinds).first<{ total: number }>();

    const queryBinds = state
      ? [tenantId, state, limit, offset]
      : [tenantId, limit, offset];
    const { results } = await this.db.prepare(
      `SELECT * FROM task_states ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    ).bind(...queryBinds).all();

    return {
      items: (results ?? []).map((r) => this.toRecord(r)),
      total: countRow?.total ?? 0,
    };
  }

  /** 상태 상세 조회 (상태 + 이력 + 가용 전이) */
  async getDetail(taskId: string, tenantId: string) {
    const state = await this.getState(taskId, tenantId);
    if (!state) return null;

    const history = await this.getHistory(taskId, tenantId, 10);
    const availableTransitions = getAvailableTransitions(state.currentState);

    return { state, history, availableTransitions };
  }

  // ─── F337: 상태별 집계 (Sprint 152) ───

  /** 상태별 태스크 수 집계 */
  async getSummary(tenantId: string): Promise<{ counts: Record<string, number>; total: number }> {
    const { results } = await this.db.prepare(
      "SELECT current_state, COUNT(*) as count FROM task_states WHERE tenant_id = ? GROUP BY current_state"
    ).bind(tenantId).all();

    const counts: Record<string, number> = {};
    let total = 0;
    for (const r of results ?? []) {
      const count = r.count as number;
      counts[r.current_state as string] = count;
      total += count;
    }
    return { counts, total };
  }

  // ─── Private helpers ───

  private toRecord(row: Record<string, unknown>): TaskStateRecord {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      tenantId: row.tenant_id as string,
      currentState: row.current_state as TaskState,
      agentId: (row.agent_id as string) ?? null,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private toHistoryRecord(row: Record<string, unknown>): TaskStateHistoryRecord {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      tenantId: row.tenant_id as string,
      fromState: row.from_state as TaskState,
      toState: row.to_state as TaskState,
      triggerSource: (row.trigger_source as EventSource) ?? null,
      triggerEvent: (row.trigger_event as string) ?? null,
      guardResult: (row.guard_result as string) ?? null,
      transitionedBy: (row.transitioned_by as string) ?? null,
      createdAt: row.created_at as string,
    };
  }
}
