/**
 * F379: Discovery→Shape Pipeline Zod Schemas (Sprint 171)
 */
import { z } from "zod";
import { AdaptToneEnum } from "./content-adapter.schema.js";

export const PipelineTriggerSchema = z.object({
  itemId: z.string().min(1),
  tone: AdaptToneEnum.default("executive"),
});
export type PipelineTriggerInput = z.infer<typeof PipelineTriggerSchema>;

export const ShapePipelineStatusQuerySchema = z.object({
  itemId: z.string().min(1),
});

export const ShapePipelineHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type ShapePipelineStatus = "idle" | "processing" | "completed" | "failed";

export interface ShapePipelineResult {
  offeringId: string;
  prefilledSections: number;
  totalSections: number;
  tone: string;
  status: "success" | "partial" | "failed";
  error?: string;
}

export interface ShapePipelineStatusResponse {
  status: ShapePipelineStatus;
  offering?: {
    id: string;
    title: string;
    prefilledCount: number;
  };
}
