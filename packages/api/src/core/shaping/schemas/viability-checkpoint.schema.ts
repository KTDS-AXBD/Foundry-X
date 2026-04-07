import { z } from "@hono/zod-openapi";

export const discoveryTypeEnum = z.enum(["I", "M", "P", "T", "S"]);
export const stageEnum = z.enum(["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"]);
export const checkpointDecisionEnum = z.enum(["go", "pivot", "drop"]);

export const SetDiscoveryTypeSchema = z
  .object({
    discoveryType: discoveryTypeEnum,
  })
  .openapi("SetDiscoveryType");

export const CreateCheckpointSchema = z
  .object({
    bizItemId: z.string().min(1),
    stage: stageEnum,
    decision: checkpointDecisionEnum,
    question: z.string().min(1).max(500),
    reason: z.string().max(2000).optional(),
  })
  .openapi("CreateCheckpoint");

export const UpdateCheckpointSchema = z
  .object({
    decision: checkpointDecisionEnum.optional(),
    question: z.string().min(1).max(500).optional(),
    reason: z.string().max(2000).optional(),
  })
  .openapi("UpdateCheckpoint");
