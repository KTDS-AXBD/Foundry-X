/**
 * F140: SecurityAgent — OWASP vulnerability scan, PR diff security analysis, compliance check
 * Uses createRoutedRunner (F136 ModelRouter) for optimal model routing.
 */
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import { createRoutedRunner } from "./agent-runner.js";
import {
  SECURITY_SCAN_PROMPT,
  SECURITY_PR_DIFF_PROMPT,
  SECURITY_OWASP_PROMPT,
  buildSecurityScanPrompt,
  buildPRDiffPrompt,
} from "./security-agent-prompts.js";

// ── Result Types ──────────────────────────────────────────

export interface VulnerabilityScanResult {
  riskScore: number;
  vulnerabilities: Array<{
    type: "injection" | "xss" | "broken-auth" | "data-exposure" |
          "xxe" | "broken-access" | "security-misconfig" |
          "insecure-deserialization" | "vulnerable-components" | "insufficient-logging";
    severity: "critical" | "high" | "medium" | "low";
    location: string;
    description: string;
    remediation: string;
  }>;
  securePatterns: string[];
  recommendations: Array<{
    category: "authentication" | "encryption" | "input-validation" | "access-control" | "logging";
    suggestion: string;
    priority: "high" | "medium" | "low";
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface PRDiffSecurityResult {
  riskLevel: "critical" | "high" | "medium" | "low" | "safe";
  findings: Array<{
    file: string;
    line: number;
    type: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
  }>;
  summary: string;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface OWASPComplianceResult {
  complianceScore: number;
  categories: Record<string, {
    status: "pass" | "warn" | "fail";
    details: string;
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

// ── SecurityAgent ────────────────────────────────────────

export interface SecurityAgentDeps {
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

export class SecurityAgent {
  private readonly env: SecurityAgentDeps["env"];
  private readonly db?: D1Database;

  constructor(deps: SecurityAgentDeps) {
    this.env = deps.env;
    this.db = deps.db;
  }

  /**
   * OWASP Top 10 기반 소스 코드 취약점 스캔
   */
  async scanVulnerabilities(
    request: AgentExecutionRequest,
  ): Promise<VulnerabilityScanResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "security-review", this.db);

    const userPrompt = buildSecurityScanPrompt(request);

    const execRequest: AgentExecutionRequest = {
      ...request,
      taskType: "security-review",
      context: {
        ...request.context,
        instructions: `${SECURITY_SCAN_PROMPT}\n\n${userPrompt}`,
      },
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseScanResult(result, duration);
  }

  /**
   * PR diff 보안 영향 분석
   */
  async analyzePRDiff(
    diff: string,
    context?: string,
  ): Promise<PRDiffSecurityResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "security-review", this.db);

    const userPrompt = buildPRDiffPrompt(diff, context);

    const execRequest: AgentExecutionRequest = {
      taskId: `security-pr-${Date.now()}`,
      agentId: "security-agent",
      taskType: "security-review",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${SECURITY_PR_DIFF_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parsePRDiffResult(result, duration);
  }

  /**
   * OWASP Top 10 적합성 검증
   */
  async checkOWASPCompliance(
    files: Record<string, string>,
  ): Promise<OWASPComplianceResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "security-review", this.db);

    const fileParts = Object.entries(files)
      .map(([path, content]) => `### ${path}\n\`\`\`typescript\n${content}\n\`\`\``)
      .join("\n\n");

    const execRequest: AgentExecutionRequest = {
      taskId: `owasp-check-${Date.now()}`,
      agentId: "security-agent",
      taskType: "security-review",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${SECURITY_OWASP_PROMPT}\n\n## Files\n${fileParts}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseOWASPResult(result, duration);
  }

  // ── Private helpers ─────────────────────────────────────

  private parseScanResult(
    result: AgentExecutionResult,
    duration: number,
  ): VulnerabilityScanResult {
    const defaultResult: VulnerabilityScanResult = {
      riskScore: 0,
      vulnerabilities: [],
      securePatterns: [],
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
        riskScore: clampScore(parsed.riskScore),
        vulnerabilities: Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [],
        securePatterns: Array.isArray(parsed.securePatterns) ? parsed.securePatterns : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parsePRDiffResult(
    result: AgentExecutionResult,
    duration: number,
  ): PRDiffSecurityResult {
    const defaultResult: PRDiffSecurityResult = {
      riskLevel: "safe",
      findings: [],
      summary: result.output.analysis ?? "Analysis unavailable",
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      const validLevels = ["critical", "high", "medium", "low", "safe"];
      return {
        riskLevel: validLevels.includes(parsed.riskLevel) ? parsed.riskLevel : "safe",
        findings: Array.isArray(parsed.findings) ? parsed.findings : [],
        summary: typeof parsed.summary === "string" ? parsed.summary : defaultResult.summary,
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseOWASPResult(
    result: AgentExecutionResult,
    duration: number,
  ): OWASPComplianceResult {
    const defaultResult: OWASPComplianceResult = {
      complianceScore: 0,
      categories: {},
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        complianceScore: clampScore(parsed.complianceScore),
        categories: typeof parsed.categories === "object" && parsed.categories !== null
          ? parsed.categories
          : {},
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }
}
