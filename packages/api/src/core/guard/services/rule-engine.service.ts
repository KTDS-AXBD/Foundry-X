import { parse as yamlParse } from "yaml";
import { generateTraceId, generateSpanId, type AuditBus } from "../../infra/types.js";
import type { RuleDefinition, RuleViolation, WorkflowAction } from "../types.js";

export class RuleEngine {
  private rules: RuleDefinition[] = [];

  constructor(
    private readonly db: D1Database,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async loadRulesFromYaml(yamlContent: string): Promise<void> {
    const parsed = yamlParse(yamlContent) as { rules?: RuleDefinition[] } | RuleDefinition | null;
    if (!parsed) {
      this.rules = [];
      return;
    }
    if ("rules" in parsed && Array.isArray((parsed as { rules: RuleDefinition[] }).rules)) {
      this.rules = (parsed as { rules: RuleDefinition[] }).rules;
    } else if ("id" in parsed) {
      this.rules = [parsed as RuleDefinition];
    } else {
      this.rules = [];
    }
  }

  async getActiveRules(): Promise<RuleDefinition[]> {
    if (this.rules.length > 0) return this.rules;

    const rows = await this.db
      .prepare(`SELECT id, rule_name, rule_yaml FROM guard_rules WHERE active = 1`)
      .all<{ id: string; rule_name: string; rule_yaml: string }>();

    this.rules = (rows.results ?? [])
      .map((r) => {
        try {
          return JSON.parse(r.rule_yaml) as RuleDefinition;
        } catch {
          return null;
        }
      })
      .filter((r): r is RuleDefinition => r !== null);

    return this.rules;
  }

  async evaluateRules(action: WorkflowAction): Promise<RuleViolation[]> {
    const rules = await this.getActiveRules();
    const violations: RuleViolation[] = [];
    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };

    for (const rule of rules) {
      if (this.matches(rule, action)) {
        const violation: RuleViolation = {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Rule '${rule.name}' violated: ${rule.description}`,
        };
        violations.push(violation);

        await this.db
          .prepare(
            `INSERT INTO guard_rule_violations (id, rule_id, check_id, violation_message, severity, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .bind(crypto.randomUUID(), rule.id, action.workflowId, violation.message, rule.severity, Date.now())
          .run();

        await this.auditBus.emit(
          "guard.rule_violation",
          { ruleId: rule.id, ruleName: rule.name, severity: rule.severity },
          ctx,
          action.actor,
        );
      }
    }

    return violations;
  }

  private matches(rule: RuleDefinition, action: WorkflowAction): boolean {
    const { sensitivityLabel: labelPatterns, actionType: actionPatterns } = rule.matchPattern;

    const hasLabelPattern = labelPatterns && labelPatterns.length > 0;
    const hasActionPattern = actionPatterns && actionPatterns.length > 0;

    if (!hasLabelPattern && !hasActionPattern) return false;

    if (hasLabelPattern && !labelPatterns!.includes(action.sensitivityLabel ?? "")) return false;
    if (hasActionPattern && !actionPatterns!.includes(action.action)) return false;

    return true;
  }
}
