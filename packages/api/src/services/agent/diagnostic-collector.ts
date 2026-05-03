// ─── F530: DiagnosticCollector — 6축 메트릭 수집 (Sprint 283) ───
// ─── F534: record() 훅 삽입 — 비스트리밍 실행 경로 메트릭 기록 (Sprint 287) ───

import { randomUUID } from "node:crypto";
import type { D1Database } from "@cloudflare/workers-types";
import type { DiagnosticReport, AxisScore, DiagnosticAxis, GraphRunResult } from "@foundry-x/shared";
import type { AgentExecutionResult } from "./execution-types.js";

interface AgentRunRow {
  rounds: number;
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number | null;
}

// 기준값: 라운드당 토큰 수 500이면 Cost=50점 (초과할수록 감점)
const COST_BASELINE_TOKENS_PER_ROUND = 500;

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** 6축 메트릭 수집기. agent_run_metrics D1 테이블에서 데이터를 읽어 DiagnosticReport를 생성한다. */
export class DiagnosticCollector {
  constructor(private readonly db: D1Database) {}

  /**
   * F534: 비스트리밍 LLM 실행 결과를 agent_run_metrics에 기록한다.
   * AgentStreamHandler를 거치지 않는 Discovery 단계 실행 경로(StageRunnerService 등)에서 호출.
   */
  async record(
    sessionId: string,
    agentId: string,
    result: AgentExecutionResult,
    durationMs: number,
  ): Promise<void> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const isSuccess = result.status !== "failed";
    const status = isSuccess ? "completed" : "failed";
    const stopReason = isSuccess ? "end_turn" : "error";
    const errorMsg = !isSuccess ? (result.output?.analysis ?? null) : null;

    await this.db
      .prepare(
        `INSERT INTO agent_run_metrics
           (id, session_id, agent_id, status, input_tokens, output_tokens,
            cache_read_tokens, rounds, stop_reason, duration_ms, error_msg,
            started_at, finished_at, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, sessionId, agentId, status, result.tokensUsed, stopReason, durationMs, errorMsg, now, now, now)
      .run();
  }

  /**
   * F534: Graph 전체 파이프라인 실행 결과를 agent_run_metrics에 summary 행으로 기록한다.
   * OrchestrationLoop의 graphDiscovery 분기에서 호출.
   */
  async recordGraphResult(sessionId: string, result: GraphRunResult): Promise<void> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO agent_run_metrics
           (id, session_id, agent_id, status, input_tokens, output_tokens,
            cache_read_tokens, rounds, stop_reason, duration_ms, error_msg,
            started_at, finished_at, created_at)
         VALUES (?, ?, 'discovery-graph', 'completed', 0, 0, 0, ?, 'end_turn', ?, NULL, ?, ?, ?)`,
      )
      .bind(id, sessionId, result.totalExecutions, result.durationMs, now, now, now)
      .run();
  }

  async collect(sessionId: string, agentId: string): Promise<DiagnosticReport> {
    const rows = await this.fetchRows(sessionId, agentId);
    const scores = this.computeScores(rows);
    const overallScore = Math.round(
      scores.reduce((s, a) => s + a.score, 0) / scores.length,
    );

    return {
      sessionId,
      agentId,
      collectedAt: new Date().toISOString(),
      scores,
      overallScore,
    };
  }

  /**
   * F537: biz_item_id 기반 집계 진단 — Graph 실행 전체를 하나로 묶어 조회.
   * stage-runner가 기록하는 session_id 패턴: `stage-{stage}-{bizItemId}`
   * autoTriggerMetaAgent에서 graph sessionId가 아닌 bizItemId로 수집.
   */
  async collectByBizItem(bizItemId: string, reportSessionId: string): Promise<DiagnosticReport> {
    const rows = await this.db
      .prepare(
        `SELECT rounds, stop_reason, input_tokens, output_tokens, duration_ms
         FROM agent_run_metrics
         WHERE session_id LIKE ? AND agent_id = 'discovery-stage-runner'
         ORDER BY created_at DESC
         LIMIT 20`,
      )
      .bind(`stage-%-${bizItemId}`)
      .all<AgentRunRow>();

    const fetched = rows.results ?? [];
    const scores = this.computeScores(fetched);
    const overallScore = Math.round(
      scores.reduce((s, a) => s + a.score, 0) / scores.length,
    );

    return {
      sessionId: reportSessionId,
      agentId: "discovery-stage-runner",
      collectedAt: new Date().toISOString(),
      scores,
      overallScore,
    };
  }

  private async fetchRows(sessionId: string, agentId: string): Promise<AgentRunRow[]> {
    const result = await this.db
      .prepare(
        `SELECT rounds, stop_reason, input_tokens, output_tokens, duration_ms
         FROM agent_run_metrics
         WHERE session_id = ? AND agent_id = ?
         ORDER BY created_at DESC
         LIMIT 20`,
      )
      .bind(sessionId, agentId)
      .all<AgentRunRow>();

    return result.results ?? [];
  }

  private computeScores(rows: AgentRunRow[]): AxisScore[] {
    const axes: DiagnosticAxis[] = [
      "ToolEffectiveness",
      "Memory",
      "Planning",
      "Verification",
      "Cost",
      "Convergence",
    ];

    return axes.map((axis) => this.computeAxis(axis, rows));
  }

  private computeAxis(axis: DiagnosticAxis, rows: AgentRunRow[]): AxisScore {
    if (rows.length === 0) {
      return { axis, score: 50, rawValue: 0, unit: "N/A", trend: "stable" };
    }

    switch (axis) {
      case "ToolEffectiveness":
        return this.toolEffectiveness(rows);
      case "Memory":
        return this.memory(rows);
      case "Planning":
        return this.planning(rows);
      case "Verification":
        return this.verification(rows);
      case "Cost":
        return this.cost(rows);
      case "Convergence":
        return this.convergence(rows);
    }
  }

  /** ToolEffectiveness: end_turn 비율 (도구 사용 후 결론 도달률 추정) */
  private toolEffectiveness(rows: AgentRunRow[]): AxisScore {
    const endTurnCount = rows.filter((r) => r.stop_reason === "end_turn").length;
    const rawValue = endTurnCount / rows.length;
    const score = clamp(rawValue * 100);
    return { axis: "ToolEffectiveness", score, rawValue, unit: "ratio", trend: "stable" };
  }

  /** Memory: 라운드당 입력 토큰이 낮을수록 좋음 */
  private memory(rows: AgentRunRow[]): AxisScore {
    const tokensPerRound = rows.map((r) =>
      r.rounds > 0 ? r.input_tokens / r.rounds : r.input_tokens,
    );
    const avgTokensPerRound =
      tokensPerRound.reduce((s, v) => s + v, 0) / tokensPerRound.length;

    // 500 tokens/round = 50점. 초과할수록 감점.
    const rawValue = avgTokensPerRound;
    const score = clamp(100 - (avgTokensPerRound / COST_BASELINE_TOKENS_PER_ROUND) * 50);
    const trend: "up" | "down" | "stable" =
      avgTokensPerRound < COST_BASELINE_TOKENS_PER_ROUND ? "up" : "down";

    return { axis: "Memory", score, rawValue, unit: "tokens/round", trend };
  }

  /** Planning: 라운드 수가 적을수록 좋음 (복잡도 대비 효율) */
  private planning(rows: AgentRunRow[]): AxisScore {
    const avgRounds = rows.reduce((s, r) => s + r.rounds, 0) / rows.length;
    const idealRounds = 3;
    const rawValue = avgRounds;
    const score = clamp((idealRounds / Math.max(avgRounds, 1)) * 80);
    return { axis: "Planning", score, rawValue, unit: "rounds", trend: "stable" };
  }

  /** Verification: self-reflection 데이터 없으면 중립값 50 반환 */
  private verification(_rows: AgentRunRow[]): AxisScore {
    // AgentSelfReflection 점수는 별도 테이블에 없으므로 중립값 사용
    return {
      axis: "Verification",
      score: 50,
      rawValue: 50,
      unit: "score",
      trend: "stable",
    };
  }

  /** Cost: 라운드당 총 토큰 수가 낮을수록 좋음 */
  private cost(rows: AgentRunRow[]): AxisScore {
    const totalTokensPerRound = rows.map((r) =>
      r.rounds > 0
        ? (r.input_tokens + r.output_tokens) / r.rounds
        : r.input_tokens + r.output_tokens,
    );
    const avg = totalTokensPerRound.reduce((s, v) => s + v, 0) / totalTokensPerRound.length;
    const rawValue = avg;
    const score = clamp(100 - (avg / COST_BASELINE_TOKENS_PER_ROUND) * 50);
    return { axis: "Cost", score, rawValue, unit: "tokens/round", trend: "stable" };
  }

  /**
   * Convergence: 라운드 효율 × end_turn 달성 복합 점수 (F556 재정의)
   * rawValue = avgRounds (ToolEffectiveness.rawValue=ratio와 구별)
   * score = endTurnRate × (IDEAL_ROUNDS / avgRounds) × 100
   * — 라운드가 적고 end_turn으로 종료될수록 높은 점수
   */
  private convergence(rows: AgentRunRow[]): AxisScore {
    const endTurnCount = rows.filter((r) => r.stop_reason === "end_turn").length;
    const endTurnRate = endTurnCount / rows.length;
    const avgRounds = rows.reduce((s, r) => s + r.rounds, 0) / rows.length;
    const rawValue = avgRounds;
    const score = clamp(endTurnRate * (3 / Math.max(avgRounds, 1)) * 100);
    return { axis: "Convergence", score, rawValue, unit: "rounds", trend: "stable" };
  }
}
