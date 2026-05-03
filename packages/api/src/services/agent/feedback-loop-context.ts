// ─── F335: FeedbackLoopContext Manager — 루프 상태 관리 (Sprint 150) ───

import type {
  TaskState} from "@foundry-x/shared";
import {
  DEFAULT_CONVERGENCE,
  type FeedbackLoopContext,
  type LoopMode,
  type ConvergenceCriteria,
  type LoopRoundResult,
  type LoopContextStatus,
} from "@foundry-x/shared";

export class FeedbackLoopContextManager {
  constructor(private db: D1Database) {}

  /** 새 루프 컨텍스트 생성 */
  async create(params: {
    taskId: string;
    tenantId: string;
    entryState: TaskState;
    triggerEventId: string | null;
    loopMode: LoopMode;
    exitTarget: TaskState;
    convergence?: Partial<ConvergenceCriteria>;
  }): Promise<FeedbackLoopContext> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const convergence = {
      ...DEFAULT_CONVERGENCE,
      ...params.convergence,
    };

    const ctx: FeedbackLoopContext = {
      id,
      taskId: params.taskId,
      tenantId: params.tenantId,
      entryState: params.entryState,
      triggerEventId: params.triggerEventId,
      loopMode: params.loopMode,
      currentRound: 0,
      maxRounds: convergence.maxRounds,
      exitTarget: params.exitTarget,
      convergence,
      history: [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await this.db.prepare(
      `INSERT INTO loop_contexts (id, task_id, tenant_id, entry_state, trigger_event_id, loop_mode, current_round, max_rounds, exit_target, convergence, history, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, params.taskId, params.tenantId,
      params.entryState, params.triggerEventId ?? null,
      params.loopMode, 0, convergence.maxRounds,
      params.exitTarget,
      JSON.stringify(convergence),
      JSON.stringify([]),
      "active", now, now,
    ).run();

    return ctx;
  }

  /** 라운드 결과 추가 */
  async addRound(contextId: string, result: LoopRoundResult): Promise<FeedbackLoopContext | null> {
    const ctx = await this.getById(contextId);
    if (!ctx) return null;

    const history = [...ctx.history, result];
    const currentRound = result.round;
    const now = new Date().toISOString();

    await this.db.prepare(
      `UPDATE loop_contexts SET history = ?, current_round = ?, updated_at = ? WHERE id = ?`
    ).bind(JSON.stringify(history), currentRound, now, contextId).run();

    return { ...ctx, history, currentRound, updatedAt: now };
  }

  /** 루프 상태 완료 처리 */
  async complete(contextId: string, status: LoopContextStatus): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `UPDATE loop_contexts SET status = ?, updated_at = ? WHERE id = ?`
    ).bind(status, now, contextId).run();
  }

  /** ID로 조회 */
  async getById(contextId: string): Promise<FeedbackLoopContext | null> {
    const row = await this.db.prepare(
      "SELECT * FROM loop_contexts WHERE id = ?"
    ).bind(contextId).first();
    if (!row) return null;
    return this.toContext(row);
  }

  /** 태스크별 루프 이력 조회 */
  async getByTask(taskId: string, tenantId: string, limit = 10): Promise<FeedbackLoopContext[]> {
    const { results } = await this.db.prepare(
      "SELECT * FROM loop_contexts WHERE task_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT ?"
    ).bind(taskId, tenantId, limit).all();
    return (results ?? []).map((r) => this.toContext(r));
  }

  private toContext(row: Record<string, unknown>): FeedbackLoopContext {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      tenantId: row.tenant_id as string,
      entryState: row.entry_state as TaskState,
      triggerEventId: (row.trigger_event_id as string) ?? null,
      loopMode: row.loop_mode as LoopMode,
      currentRound: row.current_round as number,
      maxRounds: row.max_rounds as number,
      exitTarget: row.exit_target as TaskState,
      convergence: row.convergence ? JSON.parse(row.convergence as string) : DEFAULT_CONVERGENCE,
      history: row.history ? JSON.parse(row.history as string) : [],
      status: row.status as LoopContextStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
