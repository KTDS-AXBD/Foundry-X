/**
 * F539c: discovery-stage 스키마 (packages/api 이전)
 */
import { z } from "zod";

export const DISCOVERY_STAGES = [
  "2-0", "2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9", "2-10",
] as const;

export const STAGE_STATUSES = ["pending", "in_progress", "completed", "skipped"] as const;

export const UpdateDiscoveryStageSchema = z.object({
  stage: z.enum(DISCOVERY_STAGES),
  status: z.enum(STAGE_STATUSES),
});

export type StageId = (typeof DISCOVERY_STAGES)[number];
export type StageStatus = (typeof STAGE_STATUSES)[number];
