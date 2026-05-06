import { z } from "zod";
import { ETHICS_VIOLATION_TYPES } from "../types.js";

export const EthicsViolationTypeSchema = z.enum(ETHICS_VIOLATION_TYPES);

export const CheckConfidenceSchema = z.object({
  orgId: z.string().min(1),
  agentId: z.string().min(1),
  callMeta: z.object({
    confidence: z.number().min(0).max(1),
    callId: z.string(),
    traceId: z.string().optional(),
  }),
});

export const RecordFPSchema = z.object({
  orgId: z.string().min(1),
  agentId: z.string().min(1),
  callId: z.string(),
  reason: z.string().optional(),
});

export const KillSwitchToggleSchema = z.object({
  orgId: z.string().min(1),
  agentId: z.string().min(1),
  active: z.boolean(),
  reason: z.string().optional(),
});
