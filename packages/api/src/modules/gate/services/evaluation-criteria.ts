import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "../../../services/execution-types.js";

// ── Interfaces ──────────────────────────────────────────────

export interface EvaluationScore {
  criteriaName: string;
  score: number; // 0-100
  passed: boolean;
  feedback: string[];
  details: Record<string, unknown>;
}

export interface EvaluationCriteria {
  readonly name: string;
  readonly weight: number; // 0.0-1.0
  evaluate(
    result: AgentExecutionResult,
    request: AgentExecutionRequest,
  ): EvaluationScore;
}

// ── CodeReviewCriteria (weight: 0.4) ────────────────────────

export class CodeReviewCriteria implements EvaluationCriteria {
  readonly name = "code-review";
  readonly weight = 0.4;

  evaluate(result: AgentExecutionResult, _request: AgentExecutionRequest): EvaluationScore {
    const comments = result.output.reviewComments ?? [];
    const errors = comments.filter((c) => c.severity === "error");
    const warnings = comments.filter((c) => c.severity === "warning");

    const deduction = errors.length * 20 + warnings.length * 5;
    const score = Math.max(0, 100 - deduction);

    const feedback = errors.map(
      (c) => `[error] ${c.file}:${c.line} — ${c.comment}`,
    );

    return {
      criteriaName: this.name,
      score,
      passed: score >= 60,
      feedback,
      details: {
        errorCount: errors.length,
        warningCount: warnings.length,
        totalComments: comments.length,
      },
    };
  }
}

// ── TestCoverageCriteria (weight: 0.3) ──────────────────────

export class TestCoverageCriteria implements EvaluationCriteria {
  readonly name = "test-coverage";
  readonly weight = 0.3;

  evaluate(result: AgentExecutionResult, _request: AgentExecutionRequest): EvaluationScore {
    const files = result.output.generatedCode ?? [];

    const testFiles = files.filter(
      (f) => f.path.includes(".test.") || f.path.includes("__tests__"),
    );
    const sourceFiles = files.filter(
      (f) => !f.path.includes(".test.") && !f.path.includes("__tests__"),
    );

    const sourceCount = sourceFiles.length;
    const testCount = testFiles.length;

    let score: number;
    if (sourceCount === 0) {
      score = testCount > 0 ? 100 : 100; // no source → nothing to cover
    } else {
      const ratio = (testCount / sourceCount) * 100;
      score = Math.min(100, ratio);
    }

    const feedback: string[] = [];
    if (testCount === 0 && sourceCount > 0) {
      feedback.push("No test files generated");
    }

    return {
      criteriaName: this.name,
      score,
      passed: score >= 60,
      feedback,
      details: { testFiles: testCount, sourceFiles: sourceCount },
    };
  }
}

// ── SpecComplianceCriteria (weight: 0.3) ────────────────────

export class SpecComplianceCriteria implements EvaluationCriteria {
  readonly name = "spec-compliance";
  readonly weight = 0.3;

  evaluate(
    result: AgentExecutionResult,
    request: AgentExecutionRequest,
  ): EvaluationScore {
    const criteria = request.context.spec?.acceptanceCriteria ?? [];

    if (criteria.length === 0) {
      return {
        criteriaName: this.name,
        score: 100,
        passed: true,
        feedback: [],
        details: { totalCriteria: 0, metCriteria: 0 },
      };
    }

    const outputJson = JSON.stringify(result.output).toLowerCase();

    const met: string[] = [];
    const unmet: string[] = [];

    for (const criterion of criteria) {
      if (outputJson.includes(criterion.toLowerCase())) {
        met.push(criterion);
      } else {
        unmet.push(criterion);
      }
    }

    const score = Math.round((met.length / criteria.length) * 100);

    const feedback = unmet.map(
      (c) => `Acceptance criteria not addressed: ${c}`,
    );

    return {
      criteriaName: this.name,
      score,
      passed: score >= 60,
      feedback,
      details: {
        totalCriteria: criteria.length,
        metCriteria: met.length,
        unmetCriteria: unmet,
      },
    };
  }
}
