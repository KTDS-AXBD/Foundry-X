import type { AgentExecutionRequest } from "./execution-types.js";
import { createRoutedRunner } from "./agent-runner.js";

export interface InfraAnalysisResult {
  healthScore: number;
  resources: Array<{ type: string; name: string; status: "healthy" | "degraded" | "misconfigured"; details: string }>;
  optimizations: Array<{ category: string; suggestion: string; impact: "high" | "medium" | "low" }>;
  compatibilityFlags: string[];
  tokensUsed: number;
  model: string;
  duration: number;
}

export class InfraAgent {
  constructor(private env: unknown, private db: D1Database) {}

  async analyzeInfra(request: AgentExecutionRequest): Promise<InfraAnalysisResult> {
    const runner = await createRoutedRunner(this.env as never, "infra-analysis", this.db);
    const startTime = Date.now();
    const result = await runner.execute({ ...request, taskType: "infra-analysis" });
    return { healthScore: 0, resources: [], optimizations: [], compatibilityFlags: [], tokensUsed: result.tokensUsed, model: result.model, duration: Date.now() - startTime };
  }
}
