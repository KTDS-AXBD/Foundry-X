/**
 * F313: PipelineErrorHandler — 에러 복구 로직 (재시도/건너뛰기/중단)
 */
import { PipelineStateMachine } from "./pipeline-state-machine.js";
import type { StepAction } from "../schemas/discovery-pipeline.js";

interface FailureResult {
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  status: string;
}

export class PipelineErrorHandler {
  private fsm: PipelineStateMachine;

  constructor(private db: D1Database) {
    this.fsm = new PipelineStateMachine(db);
  }

  /**
   * 단계 실패 처리 — 재시도 카운트 증가, 소진 시 failed 전이
   */
  async handleFailure(
    runId: string,
    stepId: string,
    errorCode: string | undefined,
    errorMessage: string,
    userId?: string,
  ): Promise<FailureResult> {
    // retry_count 증가
    await this.db
      .prepare(
        `UPDATE discovery_pipeline_runs
         SET retry_count = retry_count + 1,
             error_message = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(errorMessage, runId)
      .run();

    const run = await this.db
      .prepare("SELECT retry_count, max_retries, status FROM discovery_pipeline_runs WHERE id = ?")
      .bind(runId)
      .first<{ retry_count: number; max_retries: number; status: string }>();

    if (!run) throw new Error(`Pipeline run not found: ${runId}`);

    const retryable = run.retry_count < run.max_retries;

    // FSM 전이 (STEP_FAILED)
    await this.fsm.transition(
      runId,
      "STEP_FAILED",
      { stepId, retryCount: run.retry_count, maxRetries: run.max_retries },
      userId,
    );

    // 에러 이벤트 기록 (payload 포함)
    const eventId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO pipeline_events (id, pipeline_run_id, event_type, step_id, error_code, error_message, created_by)
         VALUES (?, ?, 'STEP_FAILED', ?, ?, ?, ?)`,
      )
      .bind(eventId, runId, stepId, errorCode ?? null, errorMessage, userId ?? null)
      .run();

    return {
      retryable,
      retryCount: run.retry_count,
      maxRetries: run.max_retries,
      status: retryable ? "retryable" : "failed",
    };
  }

  /**
   * 사용자 액션 처리 — retry/skip/abort
   */
  async handleAction(runId: string, action: StepAction, userId?: string): Promise<{ success: boolean; newStatus: string }> {
    const run = await this.db
      .prepare("SELECT status, current_step FROM discovery_pipeline_runs WHERE id = ?")
      .bind(runId)
      .first<{ status: string; current_step: string | null }>();

    if (!run) throw new Error(`Pipeline run not found: ${runId}`);

    switch (action.action) {
      case "retry": {
        // retry_count 리셋하지 않음 — 누적 추적
        const result = await this.fsm.transition(
          runId,
          "RETRY",
          { stepId: run.current_step ?? undefined },
          userId,
        );
        return { success: result.valid, newStatus: result.toStatus };
      }

      case "skip": {
        // 현재 단계를 건너뛰고 다음으로 진행
        const nextStep = this.getNextStep(run.current_step);
        if (!nextStep) {
          return { success: false, newStatus: run.status };
        }

        // SKIP 이벤트 기록
        const eventId = crypto.randomUUID();
        await this.db
          .prepare(
            `INSERT INTO pipeline_events (id, pipeline_run_id, event_type, step_id, payload, created_by)
             VALUES (?, ?, 'SKIP', ?, ?, ?)`,
          )
          .bind(eventId, runId, run.current_step, JSON.stringify({ reason: action.reason, nextStep }), userId ?? null)
          .run();

        // current_step 갱신 + error 클리어
        await this.db
          .prepare(
            `UPDATE discovery_pipeline_runs
             SET current_step = ?, error_message = NULL, retry_count = 0, updated_at = datetime('now')
             WHERE id = ?`,
          )
          .bind(nextStep, runId)
          .run();

        return { success: true, newStatus: run.status };
      }

      case "abort": {
        const result = await this.fsm.transition(runId, "ABORT", { stepId: run.current_step ?? undefined }, userId);
        return { success: result.valid, newStatus: result.toStatus };
      }

      default:
        return { success: false, newStatus: run.status };
    }
  }

  /**
   * 현재 단계의 다음 단계를 반환
   */
  private getNextStep(currentStep: string | null): string | null {
    if (!currentStep) return null;

    // 발굴 단계: 2-0, 2-1, ..., 2-10
    const discoveryMatch = currentStep.match(/^2-(\d+)$/);
    if (discoveryMatch) {
      const num = parseInt(discoveryMatch[1]!, 10);
      return num < 10 ? `2-${num + 1}` : null; // 2-10이 마지막
    }

    // 형상화 단계: phase-A, phase-B, ..., phase-F
    const phaseMatch = currentStep.match(/^phase-([A-F])$/);
    if (phaseMatch) {
      const phases = ["A", "B", "C", "D", "E", "F"];
      const idx = phases.indexOf(phaseMatch[1]!);
      return idx < phases.length - 1 ? `phase-${phases[idx + 1]}` : null;
    }

    return null;
  }
}
