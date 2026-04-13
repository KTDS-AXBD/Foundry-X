// ─── F529: AgentMetricsService — D1 에이전트 실행 메트릭 저장 (Sprint 282) ───

import type { D1Database } from "@cloudflare/workers-types";
import { randomUUID } from "node:crypto";
import type { AgentRunMetricSummary, RuntimeResult } from "@foundry-x/shared";

function isoNow(): string {
  return new Date().toISOString();
}

export class AgentMetricsService {
  constructor(private readonly db: D1Database) {}

  /** 새 실행 메트릭 행 생성 (status='running') — UUID 반환 */
  async createRunning(sessionId: string, agentId: string): Promise<string> {
    const id = randomUUID();
    const startedAt = isoNow();

    await this.db
      .prepare(
        `INSERT INTO agent_run_metrics
           (id, session_id, agent_id, status, started_at, created_at)
         VALUES (?, ?, ?, 'running', ?, ?)`,
      )
      .bind(id, sessionId, agentId, startedAt, startedAt)
      .run();

    return id;
  }

  /** 실행 완료 — status='completed', 토큰/라운드/duration 업데이트 */
  async complete(id: string, result: RuntimeResult, durationMs: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE agent_run_metrics
         SET status = 'completed',
             input_tokens = ?,
             output_tokens = ?,
             cache_read_tokens = ?,
             rounds = ?,
             stop_reason = ?,
             duration_ms = ?,
             finished_at = ?
         WHERE id = ?`,
      )
      .bind(
        result.tokenUsage.inputTokens,
        result.tokenUsage.outputTokens,
        result.tokenUsage.cacheReadTokens ?? 0,
        result.rounds,
        result.stopReason,
        durationMs,
        isoNow(),
        id,
      )
      .run();
  }

  /** 실행 실패 — status='failed', error_msg 저장 */
  async failRun(id: string, errorMsg: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE agent_run_metrics
         SET status = 'failed',
             error_msg = ?,
             finished_at = ?
         WHERE id = ?`,
      )
      .bind(errorMsg, isoNow(), id)
      .run();
  }

  /** 세션 ID로 메트릭 목록 조회 (started_at ASC) */
  async getBySessionId(sessionId: string): Promise<AgentRunMetricSummary[]> {
    const result = await this.db
      .prepare(
        `SELECT id, session_id, agent_id, status,
                input_tokens, output_tokens, cache_read_tokens,
                rounds, stop_reason, duration_ms, error_msg,
                started_at, finished_at
         FROM agent_run_metrics
         WHERE session_id = ?
         ORDER BY started_at ASC`,
      )
      .bind(sessionId)
      .all<Record<string, unknown>>();

    return (result.results ?? []).map((row) => ({
      id: row.id as string,
      sessionId: row.session_id as string,
      agentId: row.agent_id as string,
      status: row.status as AgentRunMetricSummary["status"],
      inputTokens: (row.input_tokens as number) ?? 0,
      outputTokens: (row.output_tokens as number) ?? 0,
      cacheReadTokens: (row.cache_read_tokens as number) ?? 0,
      rounds: (row.rounds as number) ?? 0,
      stopReason: row.stop_reason as string | undefined,
      durationMs: row.duration_ms as number | undefined,
      errorMsg: row.error_msg as string | undefined,
      startedAt: row.started_at as string,
      finishedAt: row.finished_at as string | undefined,
    }));
  }
}
