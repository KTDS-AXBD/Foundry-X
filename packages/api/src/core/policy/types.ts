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
// NOTE: schemas/policy.js 의 z.enum(AUTOMATION_ACTION_TYPES) 가 이 파일을 import 하므로
// 여기서 re-export 하면 순환 import → AUTOMATION_ACTION_TYPES=undefined 위험 (S336 entity 선례).
// schemas 심볼은 호출자가 "./schemas/policy.js" 에서 직접 import.
