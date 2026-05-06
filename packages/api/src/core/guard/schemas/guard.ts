import { z } from "@hono/zod-openapi";
import { AUTOMATION_ACTION_TYPES } from "../../policy/types.js";

export const AutomationActionTypeSchema = z.enum(AUTOMATION_ACTION_TYPES);

export const TenantContextSchema = z.object({
  orgId: z.string().min(1),
  tenantId: z.string().optional(),
  actor: z.string().optional(),
});

export const GuardCheckRequestSchema = z
  .object({
    context: TenantContextSchema,
    actionType: AutomationActionTypeSchema,
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi("GuardCheckRequest");

export const GuardViolationSchema = z.object({
  policyId: z.string().nullable(),
  reason: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
});

export const GuardCheckResponseSchema = z
  .object({
    checkId: z.string().length(26),
    allowed: z.boolean(),
    violations: z.array(GuardViolationSchema),
    hmacSignature: z.string(),
    auditEventId: z.number().nullable(),
    decidedAt: z.number(),
  })
  .openapi("GuardCheckResponse");
