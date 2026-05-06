// stub — F617 Red Phase
import type { WorkflowAction, InterceptResult } from "../types.js";
import type { GuardEngine } from "./guard-engine.service.js";
import type { RuleEngine } from "./rule-engine.service.js";
import type { AuditBus } from "../../infra/types.js";

export class WorkflowHookService {
  constructor(
    private guardEngine: Pick<GuardEngine, "check">,
    private ruleEngine: RuleEngine,
    private auditBus: Pick<AuditBus, "emit">,
  ) {}

  async interceptPolicyPackPublish(_action: WorkflowAction): Promise<InterceptResult> {
    throw new Error("not implemented");
  }
}
