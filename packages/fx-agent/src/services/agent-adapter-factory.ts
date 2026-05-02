// ─── F336: AgentAdapterFactory — 기존 에이전트를 AgentAdapter로 래핑 (Sprint 151) ───

import type {
  AgentAdapter,
  AgentRole,
  AgentResult,
  AgentExecutionContext,
} from "@foundry-x/shared";
import type { AgentRunner } from "./agent-runner.js";
import type { AgentTaskType, AgentExecutionRequest, AgentExecutionResult } from "./execution-types.js";
// Phase 46: harness-kit 이전 예정 — cross-domain dep 방지를 위해 로컬 인터페이스 사용
interface EvaluatorOptimizer {
  run(request: AgentExecutionRequest): Promise<{
    converged: boolean;
    finalScore: number;
    history: Array<{ feedback: string[] }>;
    iterations: number;
    totalTokensUsed: number;
  }>;
}

/**
 * AgentExecutionContext → AgentExecutionRequest 변환
 * OrchestrationLoop의 context를 기존 AgentRunner가 이해하는 request로 매핑
 */
function contextToRequest(
  ctx: AgentExecutionContext,
  agentId: string,
  taskType: AgentTaskType,
): AgentExecutionRequest {
  const instructions = ctx.previousFeedback.length > 0
    ? `Previous feedback:\n${ctx.previousFeedback.join("\n")}\n\n${(ctx.metadata?.instructions as string) ?? ""}`
    : (ctx.metadata?.instructions as string);

  return {
    taskId: ctx.taskId,
    agentId,
    taskType,
    context: {
      repoUrl: (ctx.metadata?.repoUrl as string) ?? "",
      branch: (ctx.metadata?.branch as string) ?? "main",
      targetFiles: ctx.metadata?.targetFiles as string[] | undefined,
      instructions,
    },
    constraints: [],
  };
}

/**
 * AgentExecutionResult → AgentResult 변환
 * 기존 실행 결과를 OrchestrationLoop이 이해하는 형태로 매핑
 */
function resultToAgentResult(result: AgentExecutionResult): AgentResult {
  const qualityScore = result.reflection?.score
    ? result.reflection.score / 100 // 0-100 → 0.0-1.0
    : result.status === "success"
      ? 0.8
      : 0.3;

  return {
    success: result.status === "success",
    qualityScore,
    feedback: [
      result.output.analysis ?? "",
      ...(result.output.reviewComments?.map(
        (c) => `${c.file}:${c.line} [${c.severity}] ${c.comment}`,
      ) ?? []),
    ].filter(Boolean),
    artifacts: {
      generatedCode: result.output.generatedCode,
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration: result.duration,
    },
  };
}

export class AgentAdapterFactory {
  /**
   * AgentRunner를 AgentAdapter로 래핑
   * 기존 AgentRunner의 동작을 100% 보존하면서 인터페이스만 변환
   */
  static wrapRunner(
    runner: AgentRunner,
    name: string,
    role: AgentRole,
    defaultTaskType: AgentTaskType = "code-generation",
  ): AgentAdapter {
    return {
      name,
      role,
      metadata: {
        source: "service",
        originalService: runner.type,
        modelTier: runner.type,
      },
      async execute(ctx: AgentExecutionContext): Promise<AgentResult> {
        const taskType =
          (ctx.metadata?.taskType as AgentTaskType) ?? defaultTaskType;
        const request = contextToRequest(ctx, name, taskType);
        const result = await runner.execute(request);
        return resultToAgentResult(result);
      },
    };
  }

  /**
   * EvaluatorOptimizer를 AgentAdapter로 래핑
   * 자체 루프를 가지지만, OrchestrationLoop에서는 단일 실행으로 사용
   */
  static wrapEvaluatorOptimizer(
    evaluator: EvaluatorOptimizer,
    name = "evaluator-optimizer",
  ): AgentAdapter {
    return {
      name,
      role: "discriminator",
      metadata: {
        source: "service",
        originalService: "evaluator-optimizer",
      },
      async execute(ctx: AgentExecutionContext): Promise<AgentResult> {
        const request = contextToRequest(ctx, name, "code-review");
        const loopResult = await evaluator.run(request);
        return {
          success: loopResult.converged,
          qualityScore: loopResult.finalScore / 100,
          feedback: loopResult.history.flatMap((h) => h.feedback),
          artifacts: {
            iterations: loopResult.iterations,
            totalTokensUsed: loopResult.totalTokensUsed,
          },
        };
      },
    };
  }

  /**
   * YAML 에이전트 정의에서 AgentAdapter 생성
   * YAML 에이전트는 Claude Code 서브에이전트이므로 API에서 직접 실행 불가 — 메타데이터 등록용
   */
  static fromYamlDefinition(
    name: string,
    role: AgentRole,
    description: string,
    model?: string,
  ): AgentAdapter {
    return {
      name,
      role,
      metadata: {
        source: "yaml",
        capabilities: [description],
        modelTier: model,
      },
      async execute(_ctx: AgentExecutionContext): Promise<AgentResult> {
        return {
          success: false,
          qualityScore: null,
          feedback: [
            `${name} is a YAML-defined agent (Claude Code subagent) — not executable via API`,
          ],
        };
      },
    };
  }
}

// Re-export converters for testing
export { contextToRequest, resultToAgentResult };
