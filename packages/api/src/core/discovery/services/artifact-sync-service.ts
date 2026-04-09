/**
 * Sprint 235 F482: bd_artifacts 자동 등록 파이프라인 — 동기화 서비스
 * Claude Code 스킬에서 분석 완료 시 API를 통해 산출물을 Foundry-X DB로 동기화
 */
import { BdArtifactService } from "../../shaping/services/bd-artifact-service.js";
import { DiscoveryStageService } from "./discovery-stage-service.js";
import { BizItemService } from "./biz-item-service.js";
import type { SyncArtifactStage, SyncResult } from "../schemas/artifact-sync.js";

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class ArtifactSyncService {
  private artifactSvc: BdArtifactService;
  private stageSvc: DiscoveryStageService;
  private bizItemSvc: BizItemService;

  constructor(private db: D1Database) {
    this.artifactSvc = new BdArtifactService(db);
    this.stageSvc = new DiscoveryStageService(db);
    this.bizItemSvc = new BizItemService(db);
  }

  async syncFromSkill(
    bizItemId: string,
    orgId: string,
    userId: string,
    stages: SyncArtifactStage[],
    source: string,
  ): Promise<SyncResult> {
    const artifacts: SyncResult["artifacts"] = [];
    let stagesUpdated = 0;

    for (const { stage, outputText, skillId } of stages) {
      const version = await this.artifactSvc.getNextVersion(bizItemId, skillId);
      const id = generateId();

      await this.artifactSvc.create({
        id,
        orgId,
        bizItemId,
        skillId,
        stageId: stage,
        version,
        inputText: `[${source}] ${stage} sync`,
        model: "claude-skill",
        createdBy: userId,
      });

      await this.artifactSvc.updateStatus(id, "completed", {
        outputText,
        tokensUsed: 0,
        durationMs: 0,
      });

      await this.stageSvc.updateStage(bizItemId, orgId, stage as "2-0", "completed");
      stagesUpdated++;

      artifacts.push({ id, stageId: stage, skillId, version });
    }

    // 2-8 이상 단계가 완료되면 biz_items.status → evaluated
    let statusChanged = false;
    const hasPackaging = stages.some((s) => {
      const parts = s.stage.split("-");
      const num = parts[1] === "10" ? 10 : parseInt(parts[1] ?? "0", 10);
      return num >= 8;
    });

    if (hasPackaging) {
      await this.bizItemSvc.updateStatus(bizItemId, "evaluated");
      statusChanged = true;
    }

    return {
      synced: artifacts.length,
      stagesUpdated,
      statusChanged,
      artifacts,
    };
  }
}
