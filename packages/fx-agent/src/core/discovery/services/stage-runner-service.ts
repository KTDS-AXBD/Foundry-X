// Minimal stub — allows discovery-graph.ts to compile in fx-agent context
// Real implementation lives in packages/api (MSA boundary)
import type { AgentRunner } from "../../../services/agent-runner.js";

export class StageRunnerService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner,
    private collector: unknown,
  ) {}

  async runStage(
    bizItemId: string,
    orgId: string,
    stage: string,
    discoveryType: unknown,
    feedback?: string,
  ) {
    const result = await this.runner.execute({
      taskId: bizItemId,
      agentId: "discovery-stage-runner",
      taskType: "discovery-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: feedback,
        spec: {
          title: stage,
          description: `${stage} analysis for ${bizItemId} (org: ${orgId}, type: ${String(discoveryType)})`,
          acceptanceCriteria: [],
        },
      },
      constraints: [],
    });
    return {
      summary: String(result.output?.analysis ?? ""),
      status: result.status === "success" ? "completed" : "pending",
      stageId: stage,
      bizItemId,
      analysisResult: result.output,
    };
  }
}
