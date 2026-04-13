// ─── F529: AgentStreamHandler — SSE 이벤트 발행기 (Sprint 282) ───

import type { AgentHooks } from "@foundry-x/shared";
import type { AgentStreamEvent } from "@foundry-x/shared";
import type { AgentMetricsService } from "./agent-metrics-service.js";

/** SSE 포맷: `data: {...}\n\n` */
export function formatSSE(event: AgentStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * AgentStreamHandler — AgentRuntime 훅을 SSE 이벤트로 변환한다.
 *
 * 사용 패턴:
 * ```ts
 * const { readable, writable } = new TransformStream();
 * const ctrl = /* ReadableStreamDefaultController *\/;
 * const handler = new AgentStreamHandler(sessionId, metricsService);
 * const hooks = handler.createHooks(ctrl);
 * await runtime.run(spec, input, { ...ctx, hooks });
 * ```
 */
export class AgentStreamHandler {
  constructor(
    private readonly sessionId: string,
    private readonly metricsService: AgentMetricsService,
  ) {}

  /**
   * AgentRuntime 훅 객체를 생성한다.
   * 훅은 각 생애주기 이벤트를 SSE 포맷으로 ctrl.enqueue한다.
   */
  createHooks(
    ctrl: ReadableStreamDefaultController,
    onComplete?: (metricId: string) => void,
  ): AgentHooks {
    const enc = new TextEncoder();
    const enqueue = (event: AgentStreamEvent) => {
      ctrl.enqueue(enc.encode(formatSSE(event)));
    };

    let metricId = "";
    let accumulated = "";
    let round = 0;
    const started = Date.now();

    return {
      beforeInvocation: async (ctx) => {
        metricId = await this.metricsService.createRunning(this.sessionId, ctx.agentId);
        enqueue({
          type: "run_started",
          sessionId: this.sessionId,
          timestamp: now(),
          payload: { agentId: ctx.agentId, input: ctx.input },
        });
      },

      beforeModel: async (modelCtx) => {
        round += 1;
        enqueue({
          type: "round_start",
          sessionId: this.sessionId,
          timestamp: now(),
          payload: { round },
        });
        return modelCtx;
      },

      afterModel: async (_modelCtx, result) => {
        const delta = result.content
          .filter((c) => c.type === "text")
          .map((c) => c.text ?? "")
          .join("");

        if (delta) {
          accumulated += delta;
          enqueue({
            type: "text_delta",
            sessionId: this.sessionId,
            timestamp: now(),
            payload: { delta, accumulated },
          });
        }

        enqueue({
          type: "round_end",
          sessionId: this.sessionId,
          timestamp: now(),
          payload: { round, tokenUsage: result.usage },
        });
      },

      beforeTool: async (toolCtx) => {
        enqueue({
          type: "tool_call",
          sessionId: this.sessionId,
          timestamp: now(),
          payload: { toolName: toolCtx.toolName, input: toolCtx.toolInput },
        });
        return toolCtx;
      },

      afterTool: async (toolCtx, toolResult) => {
        enqueue({
          type: "tool_result",
          sessionId: this.sessionId,
          timestamp: now(),
          payload: {
            toolName: toolCtx.toolName,
            output: toolResult.content,
            durationMs: 0,
          },
        });
        return toolResult;
      },

      afterInvocation: async (_ctx, result) => {
        const durationMs = Date.now() - started;

        if (metricId) {
          await this.metricsService.complete(metricId, result, durationMs);
        }

        enqueue({
          type: "run_completed",
          sessionId: this.sessionId,
          timestamp: now(),
          payload: { result, metricId },
        });

        onComplete?.(metricId);
      },
    };
  }
}
