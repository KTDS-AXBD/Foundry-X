/**
 * F312: DiscoveryPipelineService — 발굴→형상화 통합 파이프라인 CRUD + 오케스트레이션
 */
import { PipelineStateMachine } from "../../../modules/launch/services/pipeline-state-machine.js";
import { PipelineErrorHandler } from "../../../modules/launch/services/pipeline-error-handler.js";
import type {
  CreatePipelineRunInput,
  StepAction,
  DiscoveryPipelineStatus,
  PipelineEventType,
} from "../schemas/discovery-pipeline.js";

interface PipelineRunRow {
  id: string;
  tenant_id: string;
  biz_item_id: string;
  status: DiscoveryPipelineStatus;
  current_step: string | null;
  discovery_start_at: string | null;
  discovery_end_at: string | null;
  shaping_run_id: string | null;
  trigger_mode: string;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PipelineEventRow {
  id: string;
  pipeline_run_id: string;
  event_type: PipelineEventType;
  from_status: string | null;
  to_status: string | null;
  step_id: string | null;
  payload: string | null;
  error_code: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
}

function mapRun(row: PipelineRunRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    bizItemId: row.biz_item_id,
    status: row.status,
    currentStep: row.current_step,
    discoveryStartAt: row.discovery_start_at,
    discoveryEndAt: row.discovery_end_at,
    shapingRunId: row.shaping_run_id,
    triggerMode: row.trigger_mode,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: PipelineEventRow) {
  return {
    id: row.id,
    pipelineRunId: row.pipeline_run_id,
    eventType: row.event_type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    stepId: row.step_id,
    payload: row.payload ? JSON.parse(row.payload) : null,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class DiscoveryPipelineService {
  private fsm: PipelineStateMachine;
  private errorHandler: PipelineErrorHandler;

  constructor(private db: D1Database) {
    this.fsm = new PipelineStateMachine(db);
    this.errorHandler = new PipelineErrorHandler(db);
  }

  /**
   * 파이프라인 생성
   */
  async createRun(orgId: string, userId: string, input: CreatePipelineRunInput) {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO discovery_pipeline_runs (id, tenant_id, biz_item_id, trigger_mode, max_retries, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, orgId, input.bizItemId, input.triggerMode, input.maxRetries, userId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM discovery_pipeline_runs WHERE id = ?")
      .bind(id)
      .first<PipelineRunRow>();

    return mapRun(row!);
  }

  /**
   * 상세 조회 (이벤트 포함)
   */
  async getRun(id: string, orgId: string) {
    const row = await this.db
      .prepare("SELECT * FROM discovery_pipeline_runs WHERE id = ? AND tenant_id = ?")
      .bind(id, orgId)
      .first<PipelineRunRow>();

    if (!row) return null;

    const events = await this.getEvents(id);
    const validEvents = this.fsm.getValidEvents(row.status);

    return {
      ...mapRun(row),
      events,
      validEvents,
    };
  }

  /**
   * 목록 조회
   */
  async listRuns(
    orgId: string,
    filters: { status?: DiscoveryPipelineStatus; bizItemId?: string; limit: number; offset: number },
  ) {
    let where = "tenant_id = ?";
    const params: unknown[] = [orgId];

    if (filters.status) {
      where += " AND status = ?";
      params.push(filters.status);
    }
    if (filters.bizItemId) {
      where += " AND biz_item_id = ?";
      params.push(filters.bizItemId);
    }

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM discovery_pipeline_runs WHERE ${where}`)
      .bind(...params)
      .first<{ total: number }>();

    const rows = await this.db
      .prepare(
        `SELECT * FROM discovery_pipeline_runs WHERE ${where}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, filters.limit, filters.offset)
      .all<PipelineRunRow>();

    return {
      items: (rows.results ?? []).map(mapRun),
      total: countResult?.total ?? 0,
    };
  }

  /**
   * 파이프라인 시작 (idle → discovery_running)
   */
  async startRun(runId: string, userId: string) {
    const result = await this.fsm.transition(runId, "START", { stepId: "2-0" }, userId);
    if (!result.valid) {
      throw new Error(`Cannot start pipeline in status: ${result.fromStatus}`);
    }

    await this.db
      .prepare(
        "UPDATE discovery_pipeline_runs SET discovery_start_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      )
      .bind(runId)
      .run();

    return result;
  }

  /**
   * 단계 완료 보고 — 2-10 완료 시 자동 형상화 트리거
   */
  async reportStepComplete(runId: string, stepId: string, payload?: Record<string, unknown>, userId?: string) {
    const result = await this.fsm.transition(runId, "STEP_COMPLETE", { stepId }, userId);
    if (!result.valid) {
      throw new Error(`Invalid step complete for status: ${result.fromStatus}`);
    }

    // payload 기록
    if (payload) {
      await this.db
        .prepare(
          `UPDATE pipeline_events SET payload = ?
           WHERE pipeline_run_id = ? AND event_type = 'STEP_COMPLETE' AND step_id = ?
           ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(JSON.stringify(payload), runId, stepId)
        .run();
    }

    // 2-10 완료 → discovery_complete 전이 완료, 자동 형상화 트리거 반환
    const shouldTriggerShaping = stepId === "2-10" && result.toStatus === "discovery_complete";

    if (shouldTriggerShaping) {
      await this.db
        .prepare(
          "UPDATE discovery_pipeline_runs SET discovery_end_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        )
        .bind(runId)
        .run();
    }

    return { ...result, shouldTriggerShaping };
  }

  /**
   * 단계 실패 보고
   */
  async reportStepFailed(
    runId: string,
    stepId: string,
    errorCode: string | undefined,
    errorMessage: string,
    userId?: string,
  ) {
    return this.errorHandler.handleFailure(runId, stepId, errorCode, errorMessage, userId);
  }

  /**
   * 사용자 에러 복구 액션 (retry/skip/abort)
   */
  async handleAction(runId: string, action: StepAction, userId?: string) {
    return this.errorHandler.handleAction(runId, action, userId);
  }

  /**
   * 일시 중지
   */
  async pauseRun(runId: string, userId?: string) {
    const run = await this.db
      .prepare("SELECT current_step FROM discovery_pipeline_runs WHERE id = ?")
      .bind(runId)
      .first<{ current_step: string | null }>();

    return this.fsm.transition(runId, "PAUSE", { stepId: run?.current_step ?? undefined }, userId);
  }

  /**
   * 재개
   */
  async resumeRun(runId: string, userId?: string) {
    const run = await this.db
      .prepare("SELECT current_step FROM discovery_pipeline_runs WHERE id = ?")
      .bind(runId)
      .first<{ current_step: string | null }>();

    return this.fsm.transition(runId, "RESUME", { stepId: run?.current_step ?? undefined }, userId);
  }

  /**
   * 형상화 트리거 (discovery_complete → shaping_queued)
   */
  async triggerShaping(runId: string, userId?: string) {
    return this.fsm.transition(runId, "TRIGGER_SHAPING", {}, userId);
  }

  /**
   * 이벤트 로그 조회
   */
  async getEvents(runId: string) {
    const rows = await this.db
      .prepare(
        "SELECT * FROM pipeline_events WHERE pipeline_run_id = ? ORDER BY created_at ASC",
      )
      .bind(runId)
      .all<PipelineEventRow>();

    return (rows.results ?? []).map(mapEvent);
  }
}
