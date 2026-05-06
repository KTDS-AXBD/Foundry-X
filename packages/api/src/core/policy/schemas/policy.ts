import { z } from "@hono/zod-openapi";
import { AUTOMATION_ACTION_TYPES } from "../types.js";

export const AutomationActionTypeSchema = z.enum(AUTOMATION_ACTION_TYPES);

export const RegisterPolicySchema = z
  .object({
    orgId: z.string().min(1),
    actionType: AutomationActionTypeSchema,
    allowed: z.boolean(),
    reason: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi("RegisterPolicy");

export const EvaluatePolicySchema = z
  .object({
    orgId: z.string().min(1),
    actionType: AutomationActionTypeSchema,
    context: z.record(z.unknown()).optional(),
  })
  .openapi("EvaluatePolicy");

export const PolicyEvaluationResponseSchema = z
  .object({
    allowed: z.boolean(),
    reason: z.string(),
    policyId: z.string().nullable(),
    evaluatedAt: z.number(),
  })
  .openapi("PolicyEvaluationResponse");
