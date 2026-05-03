/**
 * F141: QAAgent — browser test generation, acceptance criteria validation, regression detection
 * Uses createRoutedRunner (F136 ModelRouter) for optimal model routing.
 */
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import { createRoutedRunner } from "./agent-runner.js";
import {
  QA_BROWSER_TEST_PROMPT,
  QA_ACCEPTANCE_PROMPT,
  QA_REGRESSION_PROMPT,
  buildBrowserTestPrompt,
  buildAcceptancePrompt,
  buildRegressionPrompt,
} from "./qa-agent-prompts.js";

// ── Result Types ──────────────────────────────────────────

export interface BrowserTestResult {
  scenarios: Array<{
    name: string;
    description: string;
    steps: Array<{
      action: string;
      selector?: string;
      expected: string;
    }>;
    playwrightCode: string;
    priority: "critical" | "high" | "medium" | "low";
  }>;
  coverageEstimate: number;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface AcceptanceCriteriaResult {
  overallStatus: "pass" | "partial" | "fail";
  criteria: Array<{
    criterion: string;
    status: "met" | "partial" | "unmet";
    evidence: string;
    gaps: string[];
  }>;
  completenessScore: number;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface RegressionAnalysisResult {
  riskScore: number;
  affectedTests: Array<{
    testFile: string;
    riskLevel: "high" | "medium" | "low";
    reason: string;
  }>;
  suggestedTests: string[];
  tokensUsed: number;
  model: string;
  duration: number;
}

// ── QAAgent ──────────────────────────────────────────────

export interface QAAgentDeps {
  env: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_DEFAULT_MODEL?: string;
    ANTHROPIC_API_KEY?: string;
  };
  db?: D1Database;
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

export class QAAgent {
  private readonly env: QAAgentDeps["env"];
  private readonly db?: D1Database;

  constructor(deps: QAAgentDeps) {
    this.env = deps.env;
    this.db = deps.db;
  }

  /**
   * 브라우저 테스트 시나리오 생성 (Playwright 코드 포함)
   */
  async runBrowserTest(
    request: AgentExecutionRequest,
  ): Promise<BrowserTestResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "qa-testing", this.db);

    const userPrompt = buildBrowserTestPrompt(request);

    const execRequest: AgentExecutionRequest = {
      ...request,
      taskType: "qa-testing",
      context: {
        ...request.context,
        instructions: `${QA_BROWSER_TEST_PROMPT}\n\n${userPrompt}`,
      },
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseBrowserTestResult(result, duration);
  }

  /**
   * 수용 기준 충족 여부 검증
   */
  async validateAcceptanceCriteria(
    spec: { title: string; description: string; acceptanceCriteria: string[] },
    files: Record<string, string>,
  ): Promise<AcceptanceCriteriaResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "qa-testing", this.db);

    const userPrompt = buildAcceptancePrompt(spec, files);

    const execRequest: AgentExecutionRequest = {
      taskId: `qa-acceptance-${Date.now()}`,
      agentId: "qa-agent",
      taskType: "qa-testing",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${QA_ACCEPTANCE_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseAcceptanceResult(result, duration);
  }

  /**
   * 코드 변경에 따른 회귀 위험 분석
   */
  async detectRegressions(
    changes: Record<string, string>,
    existingTests: Record<string, string>,
  ): Promise<RegressionAnalysisResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "qa-testing", this.db);

    const userPrompt = buildRegressionPrompt(changes, existingTests);

    const execRequest: AgentExecutionRequest = {
      taskId: `qa-regression-${Date.now()}`,
      agentId: "qa-agent",
      taskType: "qa-testing",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${QA_REGRESSION_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseRegressionResult(result, duration);
  }

  // ── Private helpers ─────────────────────────────────────

  private parseBrowserTestResult(
    result: AgentExecutionResult,
    duration: number,
  ): BrowserTestResult {
    const defaultResult: BrowserTestResult = {
      scenarios: [],
      coverageEstimate: 0,
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios : [],
        coverageEstimate: clampScore(parsed.coverageEstimate),
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseAcceptanceResult(
    result: AgentExecutionResult,
    duration: number,
  ): AcceptanceCriteriaResult {
    const defaultResult: AcceptanceCriteriaResult = {
      overallStatus: "fail",
      criteria: [],
      completenessScore: 0,
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      const validStatuses = ["pass", "partial", "fail"];
      return {
        overallStatus: validStatuses.includes(parsed.overallStatus) ? parsed.overallStatus : "fail",
        criteria: Array.isArray(parsed.criteria) ? parsed.criteria : [],
        completenessScore: clampScore(parsed.completenessScore),
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseRegressionResult(
    result: AgentExecutionResult,
    duration: number,
  ): RegressionAnalysisResult {
    const defaultResult: RegressionAnalysisResult = {
      riskScore: 0,
      affectedTests: [],
      suggestedTests: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        riskScore: clampScore(parsed.riskScore),
        affectedTests: Array.isArray(parsed.affectedTests) ? parsed.affectedTests : [],
        suggestedTests: Array.isArray(parsed.suggestedTests) ? parsed.suggestedTests : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }
}
