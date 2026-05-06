import type { WorkflowAction, InterceptResult } from "../types.js";
import type { AutomationActionType } from "../../policy/types.js";
import { generateTraceId, generateSpanId } from "../../infra/audit-bus.js";
import type { AuditBus } from "../../infra/audit-bus.js";
import type { GuardEngine } from "./guard-engine.service.js";
import type { RuleEngine } from "./rule-engine.service.js";

export class WorkflowHookService {
  constructor(
    private readonly guardEngine: Pick<GuardEngine, "check">,
    private readonly ruleEngine: RuleEngine,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async interceptPolicyPackPublish(action: WorkflowAction): Promise<InterceptResult> {
    const guardResult = await this.guardEngine.check({
      context: { orgId: action.orgId, actor: action.actor },
      actionType: this.mapToActionType(action.action),
      metadata: action.metadata,
    });

    const ruleViolations = await this.ruleEngine.evaluateRules(action);

    const blocked = !guardResult.allowed || ruleViolations.length > 0;
    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };

    await this.auditBus.emit(
      "guard.workflow_hook_invoked",
      { workflowId: action.workflowId, checkId: guardResult.checkId, blocked, violationCount: ruleViolations.length },
      ctx,
      action.actor,
    );

    if (blocked) {
      await this.auditBus.emit(
        "guard.publish_blocked",
        {
          workflowId: action.workflowId,
          reason: !guardResult.allowed ? "policy_denied" : "rule_violation",
          violations: ruleViolations.map((v) => v.ruleId),
        },
        ctx,
        action.actor,
      );
    }

    return {
      blocked,
      checkId: guardResult.checkId,
      reason: blocked
        ? !guardResult.allowed
          ? "policy_denied"
          : "rule_violation"
        : undefined,
      violations: ruleViolations.map((v) => ({ ruleId: v.ruleId, message: v.message })),
    };
  }

  private mapToActionType(action: WorkflowAction["action"]): AutomationActionType {
    if (action === "export_artifact") return "external_api_call";
    return "state_change";
  }
}
