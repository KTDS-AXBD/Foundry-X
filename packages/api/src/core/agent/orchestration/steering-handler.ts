// ─── F528: F-L3-5 SteeringHandler ───
import type { SteeringResult } from "@foundry-x/shared";

export interface SteeringRule {
  matchTool: (toolName: string, input: unknown) => boolean;
  onBeforeTool: (toolName: string, input: unknown) => Promise<SteeringResult>;
  matchOutput: (output: string) => boolean;
  onAfterModel: (output: string) => Promise<SteeringResult>;
}

/**
 * ConcreteSteeringHandler — 규칙 기반 행동 제어.
 * before-tool: 도구 실행 전 Proceed/Guide/Interrupt 결정
 * after-model:  모델 출력 후 Proceed/Guide 결정
 */
export class ConcreteSteeringHandler {
  constructor(private rules: SteeringRule[]) {}

  async beforeTool(toolName: string, input: unknown): Promise<SteeringResult> {
    for (const rule of this.rules) {
      if (rule.matchTool(toolName, input)) {
        return rule.onBeforeTool(toolName, input);
      }
    }
    return { action: "proceed" };
  }

  async afterModel(output: string): Promise<SteeringResult> {
    for (const rule of this.rules) {
      if (rule.matchOutput(output)) {
        return rule.onAfterModel(output);
      }
    }
    return { action: "proceed" };
  }
}
