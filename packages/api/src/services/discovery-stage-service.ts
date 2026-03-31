/**
 * Sprint 94: F263 biz-item별 발굴 프로세스 단계 진행 추적 서비스
 */
import { DISCOVERY_STAGES, type StageId, type StageStatus } from "../schemas/discovery-stage.js";
import { STAGE_NAMES } from "./analysis-path-v82.js";

const ALL_STAGES = DISCOVERY_STAGES;

const FULL_STAGE_NAMES: Record<string, string> = {
  "2-0": "사업 아이템 분류",
  ...STAGE_NAMES,
  "2-8": "패키징",
  "2-9": "AI 멀티페르소나 평가",
  "2-10": "최종 보고서",
};

export interface StageProgress {
  stage: string;
  stageName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DiscoveryProgress {
  stages: StageProgress[];
  currentStage: string | null;
  completedCount: number;
  totalCount: number;
}

interface StageRow {
  id: string;
  biz_item_id: string;
  org_id: string;
  stage: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class DiscoveryStageService {
  constructor(private db: D1Database) {}

  async initStages(bizItemId: string, orgId: string): Promise<void> {
    for (const stage of ALL_STAGES) {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT OR IGNORE INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status)
           VALUES (?, ?, ?, ?, 'pending')`,
        )
        .bind(id, bizItemId, orgId, stage)
        .run();
    }
  }

  async getProgress(bizItemId: string, orgId: string): Promise<DiscoveryProgress> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM biz_item_discovery_stages WHERE biz_item_id = ? AND org_id = ? ORDER BY stage",
      )
      .bind(bizItemId, orgId)
      .all<StageRow>();

    // 레코드 없으면 자동 초기화
    if (results.length === 0) {
      await this.initStages(bizItemId, orgId);
      return this.getProgress(bizItemId, orgId);
    }

    const stages: StageProgress[] = ALL_STAGES.map((stageId) => {
      const row = results.find((r) => r.stage === stageId);
      return {
        stage: stageId,
        stageName: FULL_STAGE_NAMES[stageId] ?? stageId,
        status: row?.status ?? "pending",
        startedAt: row?.started_at ?? null,
        completedAt: row?.completed_at ?? null,
      };
    });

    const completedCount = stages.filter((s) => s.status === "completed").length;
    const inProgressStage = stages.find((s) => s.status === "in_progress");
    const firstPending = stages.find((s) => s.status === "pending");
    const currentStage = inProgressStage?.stage ?? firstPending?.stage ?? null;

    return {
      stages,
      currentStage,
      completedCount,
      totalCount: ALL_STAGES.length,
    };
  }

  async updateStage(
    bizItemId: string,
    orgId: string,
    stage: StageId,
    status: StageStatus,
  ): Promise<void> {
    // 레코드 없으면 초기화
    const existing = await this.db
      .prepare(
        "SELECT id FROM biz_item_discovery_stages WHERE biz_item_id = ? AND stage = ?",
      )
      .bind(bizItemId, stage)
      .first();

    if (!existing) {
      await this.initStages(bizItemId, orgId);
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const startedAt = status === "in_progress" ? now : null;
    const completedAt = status === "completed" ? now : null;

    await this.db
      .prepare(
        `UPDATE biz_item_discovery_stages
         SET status = ?, started_at = COALESCE(?, started_at), completed_at = ?, updated_at = datetime('now')
         WHERE biz_item_id = ? AND stage = ?`,
      )
      .bind(status, startedAt, completedAt, bizItemId, stage)
      .run();
  }
}
