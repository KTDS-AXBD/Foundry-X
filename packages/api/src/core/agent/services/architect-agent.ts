import type { AgentExecutionRequest } from "./execution-types.js";
import { createRoutedRunner } from "./agent-runner.js";

export interface ArchitectureAnalysisResult {
  impactSummary: string;
  designScore: number;
  dependencyAnalysis: { affectedModules: string[]; circularDependencies: string[][]; couplingScore: number };
  riskAssessment: Array<{ risk: string; severity: "critical" | "high" | "medium" | "low"; mitigation: string }>;
  recommendations: Array<{ category: "structure" | "pattern" | "dependency" | "performance"; suggestion: string; priority: "high" | "medium" | "low" }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

export class ArchitectAgent {
  constructor(private env: unknown, private db: D1Database) {}

  async analyzeArchitecture(request: AgentExecutionRequest): Promise<ArchitectureAnalysisResult> {
    const runner = await createRoutedRunner(this.env as never, "spec-analysis", this.db);
    const startTime = Date.now();
    const result = await runner.execute({ ...request, taskType: "spec-analysis" });
    return { impactSummary: result.output.analysis ?? "", designScore: 0.8, dependencyAnalysis: { affectedModules: [], circularDependencies: [], couplingScore: 0 }, riskAssessment: [], recommendations: [], tokensUsed: result.tokensUsed, model: result.model, duration: Date.now() - startTime };
  }
}
