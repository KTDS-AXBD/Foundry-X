// stub — F617 Red Phase
import type { RuleDefinition, RuleViolation, WorkflowAction } from "../types.js";

export class RuleEngine {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: { emit: (...args: unknown[]) => Promise<unknown> },
  ) {}

  async loadRulesFromYaml(_yamlContent: string): Promise<void> {
    throw new Error("not implemented");
  }

  async getActiveRules(): Promise<RuleDefinition[]> {
    throw new Error("not implemented");
  }

  async evaluateRules(_action: WorkflowAction): Promise<RuleViolation[]> {
    throw new Error("not implemented");
  }
}
