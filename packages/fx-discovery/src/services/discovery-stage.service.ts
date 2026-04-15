/**
 * F539c: DiscoveryStageService (packages/api 이전 — 순수 D1, cross-domain 의존 없음)
 */
import type { D1Database } from "@cloudflare/workers-types";
import { DISCOVERY_STAGES, type StageId, type StageStatus } from "../schemas/discovery-stage.js";

const FULL_STAGE_NAMES: Record<string, string> = {
  "2-0": "사업 아이템 분류",
  "2-1": "레퍼런스 분석",
  "2-2": "수요 시장 검증",
  "2-3": "경쟁·자사 분석",
  "2-4": "사업 아이템 도출",
  "2-5": "핵심 아이템 선정",
  "2-6": "타겟 고객 정의",
  "2-7": "비즈니스 모델 정의",
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
    for (const stage of DISCOVERY_STAGES) {
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

    // 기록이 없으면 초기화
    if (results.length === 0) {
      await this.initStages(bizItemId, orgId);
      return {
        stages: DISCOVERY_STAGES.map((stage) => ({
          stage,
          stageName: FULL_STAGE_NAMES[stage] ?? stage,
          status: "pending",
          startedAt: null,
          completedAt: null,
        })),
        currentStage: null,
        completedCount: 0,
        totalCount: DISCOVERY_STAGES.length,
      };
    }

    const stages: StageProgress[] = results.map((row) => ({
      stage: row.stage,
      stageName: FULL_STAGE_NAMES[row.stage] ?? row.stage,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));

    const completedCount = stages.filter((s) => s.status === "completed").length;
    const currentStage =
      stages.find((s) => s.status === "in_progress")?.stage ??
      stages.find((s) => s.status === "pending")?.stage ??
      null;

    return {
      stages,
      currentStage,
      completedCount,
      totalCount: stages.length,
    };
  }

  async updateStage(
    bizItemId: string,
    orgId: string,
    stage: StageId,
    status: StageStatus,
  ): Promise<{ stage: string; status: string }> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT id FROM biz_item_discovery_stages WHERE biz_item_id = ? AND org_id = ? AND stage = ?")
      .bind(bizItemId, orgId, stage)
      .first<{ id: string }>();

    if (existing) {
      const startedAt = status === "in_progress" ? now : undefined;
      const completedAt = status === "completed" ? now : undefined;

      if (startedAt !== undefined) {
        await this.db
          .prepare("UPDATE biz_item_discovery_stages SET status = ?, started_at = ?, updated_at = ? WHERE id = ?")
          .bind(status, startedAt, now, existing.id)
          .run();
      } else if (completedAt !== undefined) {
        await this.db
          .prepare("UPDATE biz_item_discovery_stages SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?")
          .bind(status, completedAt, now, existing.id)
          .run();
      } else {
        await this.db
          .prepare("UPDATE biz_item_discovery_stages SET status = ?, updated_at = ? WHERE id = ?")
          .bind(status, now, existing.id)
          .run();
      }
    } else {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, bizItemId, orgId, stage, status, now, now)
        .run();
    }

    return { stage, status };
  }
}
