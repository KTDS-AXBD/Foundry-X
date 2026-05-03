import type { AgentPlan } from "@foundry-x/shared";
import type { AgentTaskType, AgentExecutionRequest } from "./execution-types.js";

export class PlannerAgent {
  constructor(private db: D1Database, private deps: unknown) {}

  async createPlan(agentId: string, taskType: AgentTaskType, context: AgentExecutionRequest["context"]): Promise<AgentPlan> {
    void agentId; void taskType; void context;
    throw new Error("PlannerAgent.createPlan not implemented in api package");
  }

  async getPlan(planId: string): Promise<AgentPlan | null> {
    void planId;
    return null;
  }

  async rejectPlan(planId: string, reason?: string): Promise<AgentPlan> {
    void planId; void reason;
    throw new Error("PlannerAgent.rejectPlan not implemented in api package");
  }
}
