import type { AgentExecutionRequest, AgentExecutionResult } from "../types/agent-execution.js";
import type { CustomValidationRule, RuleConditionInput } from "../schemas/custom-rule.schema.js";

export interface EvaluationScore {
  criteriaName: string;
  score: number;
  passed: boolean;
  feedback: string[];
  details: Record<string, unknown>;
}

export interface EvaluationCriteria {
  readonly name: string;
  readonly weight: number;
  evaluate(result: AgentExecutionResult, request: AgentExecutionRequest): EvaluationScore;
}

export class CodeReviewCriteria implements EvaluationCriteria {
  readonly name = "code-review";
  readonly weight = 0.4;

  evaluate(result: AgentExecutionResult, _request: AgentExecutionRequest): EvaluationScore {
    const comments = (result.output["reviewComments"] as Array<Record<string, unknown>>) ?? [];
    const errors = comments.filter((c) => c["severity"] === "error");
    const warnings = comments.filter((c) => c["severity"] === "warning");
    const deduction = errors.length * 20 + warnings.length * 5;
    const score = Math.max(0, 100 - deduction);
    return { criteriaName: this.name, score, passed: score >= 60, feedback: errors.map((c) => `[error] ${String(c["file"])}:${String(c["line"])} — ${String(c["comment"])}`), details: { errorCount: errors.length, warningCount: warnings.length, totalComments: comments.length } };
  }
}

export class TestCoverageCriteria implements EvaluationCriteria {
  readonly name = "test-coverage";
  readonly weight = 0.3;

  evaluate(result: AgentExecutionResult, _request: AgentExecutionRequest): EvaluationScore {
    const files = (result.output["generatedCode"] as Array<Record<string, string>>) ?? [];
    const testFiles = files.filter((f) => f["path"]?.includes(".test.") || f["path"]?.includes("__tests__"));
    const sourceFiles = files.filter((f) => !f["path"]?.includes(".test.") && !f["path"]?.includes("__tests__"));
    const score = sourceFiles.length === 0 ? 100 : Math.min(100, (testFiles.length / sourceFiles.length) * 100);
    const feedback: string[] = testFiles.length === 0 && sourceFiles.length > 0 ? ["No test files generated"] : [];
    return { criteriaName: this.name, score, passed: score >= 60, feedback, details: { testFiles: testFiles.length, sourceFiles: sourceFiles.length } };
  }
}

export class SpecComplianceCriteria implements EvaluationCriteria {
  readonly name = "spec-compliance";
  readonly weight = 0.3;

  evaluate(result: AgentExecutionResult, request: AgentExecutionRequest): EvaluationScore {
    const criteria = ((request.context?.["spec"] as Record<string, unknown>)?.["acceptanceCriteria"] as string[]) ?? [];
    if (criteria.length === 0) return { criteriaName: this.name, score: 100, passed: true, feedback: [], details: { totalCriteria: 0, metCriteria: 0 } };
    const outputJson = JSON.stringify(result.output).toLowerCase();
    const met = criteria.filter((c) => outputJson.includes(c.toLowerCase()));
    const unmet = criteria.filter((c) => !outputJson.includes(c.toLowerCase()));
    const score = Math.round((met.length / criteria.length) * 100);
    return { criteriaName: this.name, score, passed: score >= 60, feedback: unmet.map((c) => `Acceptance criteria not addressed: ${c}`), details: { totalCriteria: criteria.length, metCriteria: met.length, unmetCriteria: unmet } };
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) => (cur != null && typeof cur === "object" ? (cur as Record<string, unknown>)[key] : undefined), obj);
}

function evaluateCondition(actual: unknown, operator: RuleConditionInput["operator"], expected: unknown): boolean {
  switch (operator) {
    case "gte": return typeof actual === "number" && actual >= (expected as number);
    case "lte": return typeof actual === "number" && actual <= (expected as number);
    case "eq":  return actual === expected;
    case "neq": return actual !== expected;
    case "contains": return typeof actual === "string" && actual.includes(String(expected));
    case "regex": return typeof actual === "string" && new RegExp(String(expected)).test(actual);
    default: return false;
  }
}

export class DynamicRuleCriteria implements EvaluationCriteria {
  readonly name: string;
  readonly weight: number;

  constructor(private rule: CustomValidationRule) {
    this.name = `custom:${rule.id}`;
    this.weight = rule.weight;
  }

  evaluate(result: AgentExecutionResult, _request: AgentExecutionRequest): EvaluationScore {
    const conditions = (typeof this.rule.conditions === "string"
      ? (JSON.parse(this.rule.conditions) as RuleConditionInput[])
      : this.rule.conditions);

    let scoreAccum = 0;
    const feedback: string[] = [];

    for (const cond of conditions) {
      const actual = getNestedValue(result.output, cond.field);
      if (evaluateCondition(actual, cond.operator, cond.value)) {
        scoreAccum += cond.score_weight;
      } else {
        feedback.push(`[${cond.field}] ${String(actual)} not ${cond.operator} ${String(cond.value)}`);
      }
    }

    const score = Math.round(scoreAccum * 100);
    return {
      criteriaName: this.name,
      score,
      passed: score >= this.rule.threshold,
      feedback,
      details: { ruleId: this.rule.id, ruleName: this.rule.name },
    };
  }
}
