/**
 * F539c: DiscoveryPipelineReadService — GET-only (FSM 의존 제거)
 * listRuns/getRun만 구현. validEvents 필드 제외 (Web UI 미사용).
 * packages/api/src/core/discovery/services/discovery-pipeline-service.ts 발췌
 */
import type { D1Database } from "@cloudflare/workers-types";
import type { ListPipelineRunsQuery } from "../schemas/discovery-pipeline.js";

interface PipelineRunRow {
  id: string;
  tenant_id: string;
  biz_item_id: string;
  status: string;
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
  event_type: string;
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

export class DiscoveryPipelineReadService {
  constructor(private db: D1Database) {}

  async listRuns(orgId: string, filters: ListPipelineRunsQuery) {
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

  async getRun(id: string, orgId: string) {
    const row = await this.db
      .prepare("SELECT * FROM discovery_pipeline_runs WHERE id = ? AND tenant_id = ?")
      .bind(id, orgId)
      .first<PipelineRunRow>();

    if (!row) return null;

    const events = await this.db
      .prepare("SELECT * FROM discovery_pipeline_events WHERE pipeline_run_id = ? ORDER BY created_at ASC")
      .bind(id)
      .all<PipelineEventRow>();

    return {
      ...mapRun(row),
      events: (events.results ?? []).map((e) => ({
        id: e.id,
        eventType: e.event_type,
        fromStatus: e.from_status,
        toStatus: e.to_status,
        stepId: e.step_id,
        payload: e.payload ? JSON.parse(e.payload) : null,
        errorCode: e.error_code,
        errorMessage: e.error_message,
        createdBy: e.created_by,
        createdAt: e.created_at,
      })),
    };
  }
}
