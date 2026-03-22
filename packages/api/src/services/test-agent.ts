// F139: TestAgent — 테스트 자동 생성 + 커버리지 갭 분석 + 엣지 케이스 추천

import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import { createRoutedRunner } from "./agent-runner.js";
import {
  TEST_GENERATION_SYSTEM_PROMPT,
  TEST_COVERAGE_PROMPT,
  TEST_EDGE_CASES_PROMPT,
  buildTestGenerationPrompt,
  buildCoveragePrompt,
} from "./test-agent-prompts.js";

// ── Result Types ──────────────────────────────────────────

export interface TestGenerationResult {
  testFiles: Array<{
    path: string;
    content: string;
    testCount: number;
    framework: "vitest";
  }>;
  totalTestCount: number;
  coverageEstimate: number;
  edgeCases: Array<{
    function: string;
    case: string;
    category: "boundary" | "null" | "error" | "concurrency" | "type";
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface CoverageGapResult {
  analyzedFiles: number;
  uncoveredFunctions: Array<{
    file: string;
    function: string;
    complexity: "simple" | "moderate" | "complex";
    priority: "high" | "medium" | "low";
  }>;
  missingEdgeCases: Array<{
    file: string;
    function: string;
    suggestedCases: string[];
  }>;
  overallCoverage: number;
  tokensUsed: number;
  model: string;
}

export interface EdgeCaseSuggestion {
  functionName: string;
  edgeCases: Array<{
    case: string;
    category: "boundary" | "null" | "error" | "concurrency" | "type";
    input: string;
    expectedBehavior: string;
  }>;
  tokensUsed: number;
  model: string;
}

// ── TestAgent ─────────────────────────────────────────────

export interface TestAgentDeps {
  env: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_DEFAULT_MODEL?: string;
    ANTHROPIC_API_KEY?: string;
  };
  db?: D1Database;
}

export class TestAgent {
  private readonly env: TestAgentDeps["env"];
  private readonly db?: D1Database;

  constructor(deps: TestAgentDeps) {
    this.env = deps.env;
    this.db = deps.db;
  }

  /**
   * 변경 코드 기반 vitest 테스트 자동 생성
   */
  async generateTests(
    request: AgentExecutionRequest,
  ): Promise<TestGenerationResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "test-generation", this.db);

    const userPrompt = buildTestGenerationPrompt(request);

    const execRequest: AgentExecutionRequest = {
      ...request,
      taskType: "test-generation",
      context: {
        ...request.context,
        instructions: `${TEST_GENERATION_SYSTEM_PROMPT}\n\n${userPrompt}`,
      },
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseTestResult(result, duration);
  }

  /**
   * 파일별 테스트 커버리지 갭 분석
   */
  async analyzeCoverage(
    sourceFiles: Record<string, string>,
    testFiles: Record<string, string> = {},
  ): Promise<CoverageGapResult> {
    const runner = await createRoutedRunner(this.env, "test-generation", this.db);

    const userPrompt = buildCoveragePrompt(sourceFiles, testFiles);

    const execRequest: AgentExecutionRequest = {
      taskId: `coverage-analysis-${Date.now()}`,
      agentId: "test-agent",
      taskType: "test-generation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${TEST_COVERAGE_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    return this.parseCoverageResult(result);
  }

  /**
   * 함수 시그니처 기반 엣지 케이스 추천
   */
  async suggestEdgeCases(
    functionSignature: string,
    functionBody?: string,
  ): Promise<EdgeCaseSuggestion> {
    const runner = await createRoutedRunner(this.env, "test-generation", this.db);

    const userPrompt = functionBody
      ? `## Function\n\`\`\`typescript\n${functionSignature}\n${functionBody}\n\`\`\``
      : `## Function Signature\n\`\`\`typescript\n${functionSignature}\n\`\`\``;

    const execRequest: AgentExecutionRequest = {
      taskId: `edge-cases-${Date.now()}`,
      agentId: "test-agent",
      taskType: "test-generation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${TEST_EDGE_CASES_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    return this.parseEdgeCaseResult(result);
  }

  // ── Private helpers ─────────────────────────────────────

  private parseTestResult(
    result: AgentExecutionResult,
    duration: number,
  ): TestGenerationResult {
    const defaultResult: TestGenerationResult = {
      testFiles: [],
      totalTestCount: 0,
      coverageEstimate: 0,
      edgeCases: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        testFiles: Array.isArray(parsed.testFiles) ? parsed.testFiles : [],
        totalTestCount: parsed.totalTestCount ?? 0,
        coverageEstimate: Math.max(0, Math.min(100, parsed.coverageEstimate ?? 0)),
        edgeCases: Array.isArray(parsed.edgeCases) ? parsed.edgeCases : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseCoverageResult(
    result: AgentExecutionResult,
  ): CoverageGapResult {
    const defaultResult: CoverageGapResult = {
      analyzedFiles: 0,
      uncoveredFunctions: [],
      missingEdgeCases: [],
      overallCoverage: 0,
      tokensUsed: result.tokensUsed,
      model: result.model,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        analyzedFiles: parsed.analyzedFiles ?? 0,
        uncoveredFunctions: Array.isArray(parsed.uncoveredFunctions) ? parsed.uncoveredFunctions : [],
        missingEdgeCases: Array.isArray(parsed.missingEdgeCases) ? parsed.missingEdgeCases : [],
        overallCoverage: Math.max(0, Math.min(100, parsed.overallCoverage ?? 0)),
        tokensUsed: result.tokensUsed,
        model: result.model,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseEdgeCaseResult(
    result: AgentExecutionResult,
  ): EdgeCaseSuggestion {
    const defaultResult: EdgeCaseSuggestion = {
      functionName: "",
      edgeCases: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        functionName: parsed.functionName ?? "",
        edgeCases: Array.isArray(parsed.edgeCases) ? parsed.edgeCases : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
      };
    } catch {
      return defaultResult;
    }
  }
}
