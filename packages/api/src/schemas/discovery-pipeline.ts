import { z } from "zod";

// ── Pipeline Status ──
export const PIPELINE_STATUSES = [
  "idle", "discovery_running", "discovery_complete",
  "shaping_queued", "shaping_running", "shaping_complete",
  "paused", "failed", "aborted",
] as const;
export type DiscoveryPipelineStatus = (typeof PIPELINE_STATUSES)[number];

// ── Event Types ──
export const EVENT_TYPES = [
  "START", "STEP_COMPLETE", "STEP_FAILED", "RETRY", "SKIP",
  "ABORT", "PAUSE", "RESUME", "TRIGGER_SHAPING",
  "SHAPING_PHASE_COMPLETE", "COMPLETE",
] as const;
export type PipelineEventType = (typeof EVENT_TYPES)[number];

// ── Create Pipeline Run ──
export const createPipelineRunSchema = z.object({
  bizItemId: z.string().min(1),
  triggerMode: z.enum(["manual", "auto"]).default("manual"),
  maxRetries: z.number().int().min(0).max(10).optional().default(3),
});
export type CreatePipelineRunInput = z.infer<typeof createPipelineRunSchema>;

// ── List Pipeline Runs ──
export const listPipelineRunsSchema = z.object({
  status: z.enum(PIPELINE_STATUSES).optional(),
  bizItemId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Step Action (retry/skip/abort) ──
export const stepActionSchema = z.object({
  action: z.enum(["retry", "skip", "abort"]),
  reason: z.string().max(2000).optional(),
});
export type StepAction = z.infer<typeof stepActionSchema>;

// ── Trigger Shaping ──
export const triggerShapingSchema = z.object({
  mode: z.enum(["hitl", "auto"]).default("auto"),
  maxIterations: z.number().int().min(1).max(10).optional().default(3),
});
export type TriggerShapingInput = z.infer<typeof triggerShapingSchema>;

// ── Step Complete Event ──
export const stepCompleteSchema = z.object({
  stepId: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
});
export type StepCompleteInput = z.infer<typeof stepCompleteSchema>;

// ── Step Failed Event ──
export const stepFailedSchema = z.object({
  stepId: z.string().min(1),
  errorCode: z.string().max(100).optional(),
  errorMessage: z.string().max(5000),
});
export type StepFailedInput = z.infer<typeof stepFailedSchema>;
