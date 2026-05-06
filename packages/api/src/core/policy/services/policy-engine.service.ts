// stub — TDD Red Phase
import type { AutomationActionType, PolicyEvaluation } from "../types.js";

export class PolicyEngine {
  constructor(_db: D1Database, _auditBus: unknown) {}

  async evaluate(
    _orgId: string,
    _actionType: AutomationActionType,
    _context: Record<string, unknown> = {},
  ): Promise<PolicyEvaluation> {
    throw new Error("not implemented");
  }

  async registerPolicy(_input: {
    orgId: string;
    actionType: AutomationActionType;
    allowed: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    throw new Error("not implemented");
  }
}
