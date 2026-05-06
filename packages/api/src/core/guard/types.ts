import type { AutomationActionType } from "../policy/types.js";

export type { AutomationActionType };

// F617: Workflow Hook types (GX-I01)
export interface WorkflowAction {
  workflowId: string;
  action: "publish_policy_pack" | "deploy_skill" | "export_artifact";
  orgId: string;
  actor: string;
  sensitivityLabel?: "public" | "internal" | "confidential" | "secret";
  metadata?: Record<string, unknown>;
}

export interface InterceptResult {
  blocked: boolean;
  checkId: string;
  reason?: string;
  violations: Array<{ ruleId: string; message: string }>;
}

// F617: Rule Engine types (GX-I02)
export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  matchPattern: {
    sensitivityLabel?: string[];
    actionType?: string[];
  };
  action: "deny" | "warn" | "require_approval";
  severity: "info" | "warning" | "critical";
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

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
