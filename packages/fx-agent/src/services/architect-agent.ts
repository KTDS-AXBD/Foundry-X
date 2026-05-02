/**
 * F138: ArchitectAgent — architecture analysis, design review, dependency analysis
 * Uses createRoutedRunner (F136 ModelRouter) for optimal model routing.
 */
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import { createRoutedRunner } from "./agent-runner.js";
import {
  ARCHITECT_ANALYZE_PROMPT,
  ARCHITECT_REVIEW_DESIGN_PROMPT,
  ARCHITECT_DEPENDENCIES_PROMPT,
  buildArchitectPrompt,
  buildDesignReviewPrompt,
} from "./architect-prompts.js";

// ── Result Types ──────────────────────────────────────────

export interface ArchitectureAnalysisResult {
  impactSummary: string;
  designScore: number;
  dependencyAnalysis: {
    affectedModules: string[];
    circularDependencies: string[][];
    couplingScore: number;
  };
  riskAssessment: Array<{
    risk: string;
    severity: "critical" | "high" | "medium" | "low";
    mitigation: string;
  }>;
  recommendations: Array<{
    category: "structure" | "pattern" | "dependency" | "performance";
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface DesignReviewResult {
  completenessScore: number;
  consistencyScore: number;
  feasibilityScore: number;
  overallScore: number;
  missingElements: string[];
  inconsistencies: string[];
  suggestions: string[];
  tokensUsed: number;
  model: string;
}

export interface DependencyAnalysisResult {
  modules: Array<{
    path: string;
    imports: string[];
    exports: string[];
  }>;
  circularDependencies: string[][];
  couplingMetrics: {
    afferentCoupling: Record<string, number>;
    efferentCoupling: Record<string, number>;
  };
  suggestions: string[];
  tokensUsed: number;
  model: string;
}

// ── ArchitectAgent ────────────────────────────────────────

export interface ArchitectAgentDeps {
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

export class ArchitectAgent {
  private readonly env: ArchitectAgentDeps["env"];
  private readonly db?: D1Database;

  constructor(deps: ArchitectAgentDeps) {
    this.env = deps.env;
    this.db = deps.db;
  }

  /**
   * PR diff 또는 소스 파일 기반 아키텍처 영향 분석
   */
  async analyzeArchitecture(
    request: AgentExecutionRequest,
  ): Promise<ArchitectureAnalysisResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "spec-analysis", this.db);

    const userPrompt = buildArchitectPrompt(request);

    const execRequest: AgentExecutionRequest = {
      ...request,
      taskType: "spec-analysis",
      context: {
        ...request.context,
        instructions: `${ARCHITECT_ANALYZE_PROMPT}\n\n${userPrompt}`,
      },
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseAnalysisResult(result, duration);
  }

  /**
   * 설계 문서 품질 평가 + 개선 제안
   */
  async reviewDesignDoc(
    document: string,
    title?: string,
  ): Promise<DesignReviewResult> {
    const runner = await createRoutedRunner(this.env, "spec-analysis", this.db);

    const userPrompt = buildDesignReviewPrompt(document, title);

    const execRequest: AgentExecutionRequest = {
      taskId: `design-review-${Date.now()}`,
      agentId: "architect-agent",
      taskType: "spec-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${ARCHITECT_REVIEW_DESIGN_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    return this.parseDesignReviewResult(result);
  }

  /**
   * 모듈 간 의존성 분석 + 순환 참조 감지
   */
  async analyzeDependencies(
    files: Record<string, string>,
  ): Promise<DependencyAnalysisResult> {
    const runner = await createRoutedRunner(this.env, "spec-analysis", this.db);

    const fileParts = Object.entries(files)
      .map(([path, content]) => `### ${path}\n\`\`\`typescript\n${content}\n\`\`\``)
      .join("\n\n");

    const execRequest: AgentExecutionRequest = {
      taskId: `dep-analysis-${Date.now()}`,
      agentId: "architect-agent",
      taskType: "spec-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${ARCHITECT_DEPENDENCIES_PROMPT}\n\n## Files\n${fileParts}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    return this.parseDependencyResult(result);
  }

  // ── Private helpers ─────────────────────────────────────

  private parseAnalysisResult(
    result: AgentExecutionResult,
    duration: number,
  ): ArchitectureAnalysisResult {
    const defaultResult: ArchitectureAnalysisResult = {
      impactSummary: result.output.analysis ?? "Analysis unavailable",
      designScore: 0,
      dependencyAnalysis: {
        affectedModules: [],
        circularDependencies: [],
        couplingScore: 0,
      },
      riskAssessment: [],
      recommendations: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        impactSummary: parsed.impactSummary ?? defaultResult.impactSummary,
        designScore: clampScore(parsed.designScore),
        dependencyAnalysis: {
          affectedModules: Array.isArray(parsed.dependencyAnalysis?.affectedModules)
            ? parsed.dependencyAnalysis.affectedModules
            : [],
          circularDependencies: Array.isArray(parsed.dependencyAnalysis?.circularDependencies)
            ? parsed.dependencyAnalysis.circularDependencies
            : [],
          couplingScore: clampScore(parsed.dependencyAnalysis?.couplingScore),
        },
        riskAssessment: Array.isArray(parsed.riskAssessment) ? parsed.riskAssessment : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseDesignReviewResult(
    result: AgentExecutionResult,
  ): DesignReviewResult {
    const defaultResult: DesignReviewResult = {
      completenessScore: 0,
      consistencyScore: 0,
      feasibilityScore: 0,
      overallScore: 0,
      missingElements: [],
      inconsistencies: [],
      suggestions: [result.output.analysis ?? "Review unavailable"],
      tokensUsed: result.tokensUsed,
      model: result.model,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        completenessScore: clampScore(parsed.completenessScore),
        consistencyScore: clampScore(parsed.consistencyScore),
        feasibilityScore: clampScore(parsed.feasibilityScore),
        overallScore: clampScore(parsed.overallScore),
        missingElements: Array.isArray(parsed.missingElements) ? parsed.missingElements : [],
        inconsistencies: Array.isArray(parsed.inconsistencies) ? parsed.inconsistencies : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseDependencyResult(
    result: AgentExecutionResult,
  ): DependencyAnalysisResult {
    const defaultResult: DependencyAnalysisResult = {
      modules: [],
      circularDependencies: [],
      couplingMetrics: { afferentCoupling: {}, efferentCoupling: {} },
      suggestions: [result.output.analysis ?? "Analysis unavailable"],
      tokensUsed: result.tokensUsed,
      model: result.model,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        modules: Array.isArray(parsed.modules) ? parsed.modules : [],
        circularDependencies: Array.isArray(parsed.circularDependencies) ? parsed.circularDependencies : [],
        couplingMetrics: parsed.couplingMetrics ?? defaultResult.couplingMetrics,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
      };
    } catch {
      return defaultResult;
    }
  }
}
