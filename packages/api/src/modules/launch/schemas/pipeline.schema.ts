import { z } from "zod";

export const PIPELINE_STAGES = [
  "REGISTERED", "DISCOVERY", "FORMALIZATION", "REVIEW", "DECISION", "OFFERING", "MVP",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PipelineStageEnum = z.enum(PIPELINE_STAGES);

export const AdvanceStageSchema = z.object({
  stage: PipelineStageEnum,
  notes: z.string().max(2000).optional(),
});

export const PipelineFilterSchema = z.object({
  stage: PipelineStageEnum.optional(),
  assignee: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
