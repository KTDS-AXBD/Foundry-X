import type { AutomationActionType } from "../policy/types.js";

export type { AutomationActionType };

export interface TenantContext {
  orgId: string;
  tenantId?: string;
  actor?: string;
}

export interface GuardCheckRequest {
  context: TenantContext;
  actionType: AutomationActionType;
  metadata?: Record<string, unknown>;
}

export interface GuardViolation {
  policyId: string | null;
  reason: string;
  severity: "info" | "warning" | "critical";
}

export interface GuardCheckResponse {
  checkId: string;
  allowed: boolean;
  violations: GuardViolation[];
  hmacSignature: string;
  auditEventId: number | null;
  decidedAt: number;
}

export interface GuardDecisionRecord {
  id: string;
  checkId: string;
  orgId: string;
  tenantId: string | null;
  actionType: AutomationActionType;
  policyId: string | null;
  violation: boolean;
  hmacSignature: string;
  decidedAt: number;
}

export { GuardEngine } from "./services/guard-engine.service.js";
export * from "./schemas/guard.js";
