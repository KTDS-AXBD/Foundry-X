/**
 * F145: InfraAgent — Cloudflare infra analysis, change simulation, D1 migration validation
 * Uses createRoutedRunner (F136 ModelRouter) for optimal model routing.
 */
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import { createRoutedRunner } from "./agent-runner.js";
import {
  INFRA_ANALYZE_PROMPT,
  INFRA_SIMULATE_PROMPT,
  INFRA_VALIDATE_MIGRATION_PROMPT,
  buildInfraAnalyzePrompt,
  buildMigrationPrompt,
} from "./infra-agent-prompts.js";

// ── Result Types ──────────────────────────────────────────

export interface InfraAnalysisResult {
  healthScore: number;
  resources: Array<{
    type: "workers" | "d1" | "kv" | "cron" | "pages" | "r2";
    name: string;
    status: "healthy" | "degraded" | "misconfigured";
    details: string;
  }>;
  optimizations: Array<{
    category: "performance" | "cost" | "reliability" | "security";
    suggestion: string;
    impact: "high" | "medium" | "low";
  }>;
  compatibilityFlags: string[];
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface ChangeSimulationResult {
  riskLevel: "critical" | "high" | "medium" | "low" | "safe";
  affectedResources: Array<{
    type: "workers" | "d1" | "kv" | "cron" | "pages" | "r2";
    name: string;
    impact: string;
  }>;
  rollbackPlan: {
    steps: string[];
    estimatedTime: string;
    automated: boolean;
  };
  estimatedDowntime: "none" | "seconds" | "minutes" | "hours";
  wranglerDiff: string;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface MigrationValidationResult {
  safe: boolean;
  riskScore: number;
  issues: Array<{
    severity: "critical" | "high" | "medium" | "low";
    type: "destructive" | "fk-violation" | "data-loss" | "missing-index" | "compatibility";
    description: string;
    suggestion: string;
    line: number;
  }>;
  schemaChanges: Array<{
    operation: string;
    target: string;
    details: string;
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

// ── InfraAgent ────────────────────────────────────────

export interface InfraAgentDeps {
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

export class InfraAgent {
  private readonly env: InfraAgentDeps["env"];
  private readonly db?: D1Database;

  constructor(deps: InfraAgentDeps) {
    this.env = deps.env;
    this.db = deps.db;
  }

  /**
   * Cloudflare Workers/D1/KV/Cron/Pages 리소스 분석
   */
  async analyzeInfra(
    request: AgentExecutionRequest,
  ): Promise<InfraAnalysisResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "infra-analysis", this.db);

    const userPrompt = buildInfraAnalyzePrompt(request);

    const execRequest: AgentExecutionRequest = {
      ...request,
      taskType: "infra-analysis",
      context: {
        ...request.context,
        instructions: `${INFRA_ANALYZE_PROMPT}\n\n${userPrompt}`,
      },
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseAnalysisResult(result, duration);
  }

  /**
   * 변경 영향 시뮬레이션
   */
  async simulateChange(
    description: string,
    currentConfig?: string,
  ): Promise<ChangeSimulationResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "infra-analysis", this.db);

    const parts: string[] = [];
    if (currentConfig) {
      parts.push(`## Current Configuration\n\`\`\`toml\n${currentConfig}\n\`\`\``);
    }
    parts.push(`\n## Proposed Change\n${description}`);

    const execRequest: AgentExecutionRequest = {
      taskId: `infra-sim-${Date.now()}`,
      agentId: "infra-agent",
      taskType: "infra-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${INFRA_SIMULATE_PROMPT}\n\n${parts.join("\n")}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseSimulationResult(result, duration);
  }

  /**
   * D1 마이그레이션 SQL 안전성 검증
   */
  async validateMigration(
    sql: string,
    existingSchema?: string,
  ): Promise<MigrationValidationResult> {
    const startTime = Date.now();
    const runner = await createRoutedRunner(this.env, "infra-analysis", this.db);

    const userPrompt = buildMigrationPrompt(sql, existingSchema);

    const execRequest: AgentExecutionRequest = {
      taskId: `migration-val-${Date.now()}`,
      agentId: "infra-agent",
      taskType: "infra-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `${INFRA_VALIDATE_MIGRATION_PROMPT}\n\n${userPrompt}`,
      },
      constraints: [],
    };

    const result = await runner.execute(execRequest);
    const duration = Date.now() - startTime;

    return this.parseMigrationResult(result, duration);
  }

  // ── Private helpers ─────────────────────────────────────

  private parseAnalysisResult(
    result: AgentExecutionResult,
    duration: number,
  ): InfraAnalysisResult {
    const defaultResult: InfraAnalysisResult = {
      healthScore: 0,
      resources: [],
      optimizations: [],
      compatibilityFlags: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        healthScore: clampScore(parsed.healthScore),
        resources: Array.isArray(parsed.resources) ? parsed.resources : [],
        optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
        compatibilityFlags: Array.isArray(parsed.compatibilityFlags) ? parsed.compatibilityFlags : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseSimulationResult(
    result: AgentExecutionResult,
    duration: number,
  ): ChangeSimulationResult {
    const defaultResult: ChangeSimulationResult = {
      riskLevel: "safe",
      affectedResources: [],
      rollbackPlan: { steps: [], estimatedTime: "unknown", automated: false },
      estimatedDowntime: "none",
      wranglerDiff: "",
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      const validLevels = ["critical", "high", "medium", "low", "safe"];
      const validDowntime = ["none", "seconds", "minutes", "hours"];
      return {
        riskLevel: validLevels.includes(parsed.riskLevel) ? parsed.riskLevel : "safe",
        affectedResources: Array.isArray(parsed.affectedResources) ? parsed.affectedResources : [],
        rollbackPlan: typeof parsed.rollbackPlan === "object" && parsed.rollbackPlan !== null
          ? {
              steps: Array.isArray(parsed.rollbackPlan.steps) ? parsed.rollbackPlan.steps : [],
              estimatedTime: typeof parsed.rollbackPlan.estimatedTime === "string"
                ? parsed.rollbackPlan.estimatedTime : "unknown",
              automated: typeof parsed.rollbackPlan.automated === "boolean"
                ? parsed.rollbackPlan.automated : false,
            }
          : defaultResult.rollbackPlan,
        estimatedDowntime: validDowntime.includes(parsed.estimatedDowntime) ? parsed.estimatedDowntime : "none",
        wranglerDiff: typeof parsed.wranglerDiff === "string" ? parsed.wranglerDiff : "",
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }

  private parseMigrationResult(
    result: AgentExecutionResult,
    duration: number,
  ): MigrationValidationResult {
    const defaultResult: MigrationValidationResult = {
      safe: false,
      riskScore: 100,
      issues: [],
      schemaChanges: [],
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration,
    };

    if (result.status === "failed") return defaultResult;

    try {
      const text = result.output.analysis ?? "";
      const parsed = JSON.parse(text);
      return {
        safe: typeof parsed.safe === "boolean" ? parsed.safe : false,
        riskScore: clampScore(parsed.riskScore),
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        schemaChanges: Array.isArray(parsed.schemaChanges) ? parsed.schemaChanges : [],
        tokensUsed: result.tokensUsed,
        model: result.model,
        duration,
      };
    } catch {
      return defaultResult;
    }
  }
}
