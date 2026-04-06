/**
 * F314: PipelineCheckpointService — HITL 체크포인트 CRUD + 승인/거부
 */
import { PipelineStateMachine } from "./pipeline-state-machine.js";
import type { CheckpointDecision } from "../../../schemas/discovery-pipeline.js";
import { CHECKPOINT_STEPS, COMMIT_GATE_STEP } from "../../../schemas/discovery-pipeline.js";

interface CheckpointRow {
  id: string;
  pipeline_run_id: string;
  step_id: string;
  checkpoint_type: string;
  status: string;
  questions: string | null;
  response: string | null;
  decided_by: string | null;
  decided_at: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineCheckpoint {
  id: string;
  pipelineRunId: string;
  stepId: string;
  checkpointType: string;
  status: string;
  questions: Array<{ question: string; required?: boolean }>;
  response: CheckpointDecision | null;
  decidedBy: string | null;
  decidedAt: string | null;
  deadline: string | null;
  createdAt: string;
}

const CHECKPOINT_CONFIG: Record<string, { type: string; questions: Array<{ question: string; required?: boolean }> }> = {
  "2-1": {
    type: "viability",
    questions: [
      { question: "이 아이디어는 우리 역량에 부합하나요?" },
      { question: "기존 사업과의 시너지가 있나요?" },
    ],
  },
  "2-3": {
    type: "viability",
    questions: [
      { question: "시장 규모(TAM)가 충분한가요?" },
      { question: "경쟁 강도가 적정한가요?" },
    ],
  },
  "2-5": {
    type: "commit_gate",
    questions: [
      { question: "TAM이 최소 기준(100억원)을 충족하나요?", required: true },
      { question: "차별화된 경쟁 우위가 있나요?", required: true },
      { question: "검증 가능한 수익 모델이 있나요?", required: true },
      { question: "실행 가능한 팀 역량이 있나요?", required: true },
    ],
  },
  "2-7": {
    type: "viability",
    questions: [
      { question: "파일럿 결과가 기대에 부합하나요?" },
      { question: "스케일 업이 가능한 구조인가요?" },
    ],
  },
};

function mapCheckpoint(row: CheckpointRow): PipelineCheckpoint {
  return {
    id: row.id,
    pipelineRunId: row.pipeline_run_id,
    stepId: row.step_id,
    checkpointType: row.checkpoint_type,
    status: row.status,
    questions: row.questions ? JSON.parse(row.questions) : [],
    response: row.response ? JSON.parse(row.response) : null,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    deadline: row.deadline,
    createdAt: row.created_at,
  };
}

export class PipelineCheckpointService {
  private fsm: PipelineStateMachine;

  constructor(private db: D1Database) {
    this.fsm = new PipelineStateMachine(db);
  }

  /**
   * 체크포인트인지 확인
   */
  isCheckpointStep(stepId: string): boolean {
    return (CHECKPOINT_STEPS as readonly string[]).includes(stepId);
  }

  /**
   * 체크포인트 생성 — 파이프라인 paused + checkpoint pending
   */
  async createCheckpoint(runId: string, stepId: string): Promise<PipelineCheckpoint> {
    const config = CHECKPOINT_CONFIG[stepId];
    if (!config) {
      throw new Error(`Not a checkpoint step: ${stepId}`);
    }

    const id = crypto.randomUUID();
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await this.db
      .prepare(
        `INSERT INTO pipeline_checkpoints (id, pipeline_run_id, step_id, checkpoint_type, questions, deadline)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, runId, stepId, config.type, JSON.stringify(config.questions), deadline)
      .run();

    // 파이프라인 일시 중지
    await this.fsm.transition(runId, "PAUSE", { stepId });

    const row = await this.db
      .prepare("SELECT * FROM pipeline_checkpoints WHERE id = ?")
      .bind(id)
      .first<CheckpointRow>();

    return mapCheckpoint(row!);
  }

  /**
   * 승인 — checkpoint approved + 파이프라인 resume
   */
  async approve(
    checkpointId: string,
    userId: string,
    decision: CheckpointDecision,
    approverRole?: string,
  ): Promise<{ checkpoint: PipelineCheckpoint; resumed: boolean }> {
    await this.db
      .prepare(
        `UPDATE pipeline_checkpoints
         SET status = 'approved', response = ?, decided_by = ?, decided_at = datetime('now'), approver_role = ?, updated_at = datetime('now')
         WHERE id = ? AND status = 'pending'`,
      )
      .bind(JSON.stringify(decision), userId, approverRole ?? null, checkpointId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM pipeline_checkpoints WHERE id = ?")
      .bind(checkpointId)
      .first<CheckpointRow>();

    if (!row || row.status !== "approved") {
      throw new Error(`Checkpoint not found or not pending: ${checkpointId}`);
    }

    // 파이프라인 재개
    const resumeResult = await this.fsm.transition(row.pipeline_run_id, "RESUME", { stepId: row.step_id }, userId);

    return {
      checkpoint: mapCheckpoint(row),
      resumed: resumeResult.valid,
    };
  }

  /**
   * 거부 — checkpoint rejected, 파이프라인은 paused 유지
   */
  async reject(
    checkpointId: string,
    userId: string,
    reason?: string,
  ): Promise<PipelineCheckpoint> {
    await this.db
      .prepare(
        `UPDATE pipeline_checkpoints
         SET status = 'rejected', response = ?, decided_by = ?, decided_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ? AND status = 'pending'`,
      )
      .bind(JSON.stringify({ decision: "rejected", reason }), userId, checkpointId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM pipeline_checkpoints WHERE id = ?")
      .bind(checkpointId)
      .first<CheckpointRow>();

    if (!row) throw new Error(`Checkpoint not found: ${checkpointId}`);

    return mapCheckpoint(row);
  }

  /**
   * 체크포인트 목록
   */
  async listByRun(runId: string): Promise<PipelineCheckpoint[]> {
    const rows = await this.db
      .prepare("SELECT * FROM pipeline_checkpoints WHERE pipeline_run_id = ? ORDER BY created_at ASC")
      .bind(runId)
      .all<CheckpointRow>();

    return (rows.results ?? []).map(mapCheckpoint);
  }

  /**
   * 현재 대기 중인 체크포인트
   */
  async getActive(runId: string): Promise<PipelineCheckpoint | null> {
    const row = await this.db
      .prepare(
        "SELECT * FROM pipeline_checkpoints WHERE pipeline_run_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      )
      .bind(runId)
      .first<CheckpointRow>();

    return row ? mapCheckpoint(row) : null;
  }
}
