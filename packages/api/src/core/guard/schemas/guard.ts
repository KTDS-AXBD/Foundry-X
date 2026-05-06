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

// F617: Workflow Hook schemas
export const WorkflowHookSchema = z
  .object({
    workflowId: z.string().min(1),
    action: z.enum(["publish_policy_pack", "deploy_skill", "export_artifact"]),
    orgId: z.string().min(1),
    actor: z.string().min(1),
    sensitivityLabel: z.enum(["public", "internal", "confidential", "secret"]).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi("WorkflowHook");

export const InterceptResponseSchema = z
  .object({
    blocked: z.boolean(),
    checkId: z.string(),
    reason: z.string().optional(),
    violations: z.array(
      z.object({ ruleId: z.string(), message: z.string() }),
    ),
  })
  .openapi("InterceptResponse");
