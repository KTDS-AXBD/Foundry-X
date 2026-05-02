// ─── F335: Orchestration Schemas — Zod validation (Sprint 150) ───

import { z } from "@hono/zod-openapi";

// ─── Loop Start Request ───

export const LoopStartRequestSchema = z.object({
  loopMode: z.enum(["retry", "adversarial", "fix"]),
  agentNames: z.array(z.string()).min(1),
  convergence: z.object({
    minQualityScore: z.number().min(0).max(1).optional(),
    maxRounds: z.number().int().min(1).max(10).optional(),
    requiredConsecutivePass: z.number().int().min(1).optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("LoopStartRequest");

// ─── Loop Round Result ───

export const LoopRoundResultSchema = z.object({
  round: z.number(),
  agentName: z.string(),
  qualityScore: z.number().nullable(),
  feedback: z.array(z.string()),
  status: z.enum(["pass", "fail", "error"]),
  durationMs: z.number(),
  timestamp: z.string(),
}).openapi("LoopRoundResult");

// ─── Loop Context ───

export const FeedbackLoopContextSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  tenantId: z.string(),
  entryState: z.string(),
  triggerEventId: z.string().nullable(),
  loopMode: z.enum(["retry", "adversarial", "fix"]),
  currentRound: z.number(),
  maxRounds: z.number(),
  exitTarget: z.string(),
  convergence: z.object({
    minQualityScore: z.number(),
    maxRounds: z.number(),
    requiredConsecutivePass: z.number(),
  }),
  history: z.array(LoopRoundResultSchema),
  status: z.enum(["active", "resolved", "exhausted", "escalated"]),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi("FeedbackLoopContext");

// ─── Loop Outcome ───

export const LoopOutcomeSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("resolved"),
    exitState: z.string(),
    rounds: z.number(),
    finalScore: z.number(),
  }),
  z.object({
    status: z.literal("exhausted"),
    rounds: z.number(),
    bestScore: z.number(),
    residualIssues: z.array(z.string()),
  }),
  z.object({
    status: z.literal("escalated"),
    reason: z.string(),
    round: z.number(),
  }),
]).openapi("LoopOutcome");

// ─── Loop Response ───

export const LoopResponseSchema = z.object({
  outcome: LoopOutcomeSchema,
  context: FeedbackLoopContextSchema,
}).openapi("LoopResponse");

// ─── Loop History ───

export const LoopHistorySchema = z.object({
  items: z.array(FeedbackLoopContextSchema),
  total: z.number(),
}).openapi("LoopHistory");

// ─── Telemetry Event Record ───

export const ExecutionEventRecordSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  tenantId: z.string(),
  source: z.string(),
  severity: z.string(),
  payload: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
}).openapi("ExecutionEventRecord");

// ─── Telemetry Events List ───

export const TelemetryEventsListSchema = z.object({
  items: z.array(ExecutionEventRecordSchema),
  total: z.number(),
}).openapi("TelemetryEventsList");

// ─── Telemetry Event Counts ───

export const TelemetryEventCountsSchema = z.record(z.number()).openapi("TelemetryEventCounts");
