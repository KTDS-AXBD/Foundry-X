/**
 * Sprint 235 F482: bd_artifacts 자동 등록 파이프라인 — Zod 스키마
 */
import { z } from "zod";

export const syncArtifactStageSchema = z.object({
  stage: z.string().regex(/^2-(?:10|[0-9])$/, "stage must be 2-0 ~ 2-10"),
  outputText: z.string().min(1).max(50000),
  skillId: z.string().min(1).max(100),
});

export const syncArtifactsSchema = z.object({
  stages: z.array(syncArtifactStageSchema).min(1).max(11),
  source: z.enum(["claude-skill", "manual"]).default("claude-skill"),
});

export type SyncArtifactStage = z.infer<typeof syncArtifactStageSchema>;
export type SyncArtifactsInput = z.infer<typeof syncArtifactsSchema>;

export interface SyncResult {
  synced: number;
  stagesUpdated: number;
  statusChanged: boolean;
  artifacts: Array<{
    id: string;
    stageId: string;
    skillId: string;
    version: number;
  }>;
}
