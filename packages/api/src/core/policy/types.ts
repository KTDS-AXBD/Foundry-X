export const AUTOMATION_ACTION_TYPES = [
  "read_only",
  "data_query",
  "state_change",
  "external_api_call",
  "destructive_op",
] as const;

export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

export interface PolicyEvaluation {
  allowed: boolean;
  reason: string;
  policyId: string | null;
  evaluatedAt: number;
}

export interface PolicyViolation {
  id: string;
  orgId: string;
  actionType: AutomationActionType;
  attemptedBy: string | null;
  reason: string;
  traceId: string | null;
  createdAt: number;
}

export { PolicyEngine } from "./services/policy-engine.service.js";
export * from "./schemas/policy.js";
