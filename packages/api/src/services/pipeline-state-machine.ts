/**
 * F313: PipelineStateMachine — FSM 기반 파이프라인 상태 전이 엔진
 */
import type { DiscoveryPipelineStatus, PipelineEventType } from "../schemas/discovery-pipeline.js";

export interface TransitionResult {
  fromStatus: DiscoveryPipelineStatus;
  toStatus: DiscoveryPipelineStatus;
  valid: boolean;
}

interface TransitionRule {
  to: DiscoveryPipelineStatus;
  /** 조건 함수 — stepId 등 컨텍스트로 분기 */
  when?: (ctx: TransitionContext) => boolean;
}

interface TransitionContext {
  stepId?: string;
  retryCount?: number;
  maxRetries?: number;
}

type TransitionMap = Partial<
  Record<DiscoveryPipelineStatus, Partial<Record<PipelineEventType, TransitionRule[]>>>
>;

const TRANSITIONS: TransitionMap = {
  idle: {
    START: [{ to: "discovery_running" }],
  },
  discovery_running: {
    STEP_COMPLETE: [
      { to: "discovery_complete", when: (ctx) => ctx.stepId === "2-10" },
      { to: "discovery_running" }, // 중간 단계
    ],
    STEP_FAILED: [
      { to: "failed", when: (ctx) => (ctx.retryCount ?? 0) >= (ctx.maxRetries ?? 3) },
      { to: "discovery_running" }, // 재시도 가능
    ],
    PAUSE: [{ to: "paused" }],
    ABORT: [{ to: "aborted" }],
  },
  discovery_complete: {
    TRIGGER_SHAPING: [{ to: "shaping_queued" }],
    ABORT: [{ to: "aborted" }],
  },
  shaping_queued: {
    START: [{ to: "shaping_running" }],
    ABORT: [{ to: "aborted" }],
  },
  shaping_running: {
    SHAPING_PHASE_COMPLETE: [
      { to: "shaping_complete", when: (ctx) => ctx.stepId === "phase-F" },
      { to: "paused", when: (ctx) => ctx.stepId === "phase-F-hitl" },
      { to: "shaping_running" }, // 중간 phase
    ],
    STEP_FAILED: [
      { to: "failed", when: (ctx) => (ctx.retryCount ?? 0) >= (ctx.maxRetries ?? 3) },
      { to: "shaping_running" },
    ],
    PAUSE: [{ to: "paused" }],
    ABORT: [{ to: "aborted" }],
    COMPLETE: [{ to: "shaping_complete" }],
  },
  paused: {
    RESUME: [
      { to: "discovery_running", when: (ctx) => ctx.stepId?.startsWith("2-") ?? false },
      { to: "shaping_running" },
    ],
    ABORT: [{ to: "aborted" }],
  },
  failed: {
    RETRY: [
      { to: "discovery_running", when: (ctx) => ctx.stepId?.startsWith("2-") ?? false },
      { to: "shaping_running" },
    ],
    ABORT: [{ to: "aborted" }],
  },
};

const TERMINAL_STATUSES: Set<DiscoveryPipelineStatus> = new Set([
  "shaping_complete", "aborted",
]);

export class PipelineStateMachine {
  constructor(private db: D1Database) {}

  /**
   * 상태 전이 실행 + pipeline_events 기록
   */
  async transition(
    runId: string,
    event: PipelineEventType,
    ctx: TransitionContext = {},
    createdBy?: string,
  ): Promise<TransitionResult> {
    const run = await this.db
      .prepare("SELECT status, retry_count, max_retries FROM discovery_pipeline_runs WHERE id = ?")
      .bind(runId)
      .first<{ status: DiscoveryPipelineStatus; retry_count: number; max_retries: number }>();

    if (!run) {
      throw new Error(`Pipeline run not found: ${runId}`);
    }

    const fromStatus = run.status;
    const fullCtx: TransitionContext = {
      ...ctx,
      retryCount: ctx.retryCount ?? run.retry_count,
      maxRetries: ctx.maxRetries ?? run.max_retries,
    };

    const rules = TRANSITIONS[fromStatus]?.[event];
    if (!rules) {
      return { fromStatus, toStatus: fromStatus, valid: false };
    }

    const matched = rules.find((r) => !r.when || r.when(fullCtx));
    if (!matched) {
      return { fromStatus, toStatus: fromStatus, valid: false };
    }

    const toStatus = matched.to;

    // DB 갱신
    await this.db
      .prepare(
        `UPDATE discovery_pipeline_runs
         SET status = ?, current_step = COALESCE(?, current_step), updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(toStatus, ctx.stepId ?? null, runId)
      .run();

    // 이벤트 기록
    const eventId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO pipeline_events (id, pipeline_run_id, event_type, from_status, to_status, step_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(eventId, runId, event, fromStatus, toStatus, ctx.stepId ?? null, createdBy ?? null)
      .run();

    return { fromStatus, toStatus, valid: true };
  }

  /**
   * 현재 상태에서 가능한 이벤트 목록
   */
  getValidEvents(status: DiscoveryPipelineStatus): PipelineEventType[] {
    const rules = TRANSITIONS[status];
    return rules ? (Object.keys(rules) as PipelineEventType[]) : [];
  }

  isTerminal(status: DiscoveryPipelineStatus): boolean {
    return TERMINAL_STATUSES.has(status);
  }
}
