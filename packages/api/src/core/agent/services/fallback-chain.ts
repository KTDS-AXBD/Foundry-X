/**
 * F144: Fallback Chain — 모델 장애 시 자동 전환 + 이벤트 기록
 */
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentTaskType,
} from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";
import type { ModelRouter, RoutingRule } from "./model-router.js";

export interface FallbackEvent {
  id: string;
  taskType: string;
  fromModel: string;
  toModel: string;
  reason: string;
  latencyMs: number;
  createdAt: string;
}

export interface FallbackChainResult {
  result: AgentExecutionResult;
  attemptedModels: string[];
  failoverEvents: FallbackEvent[];
  finalModel: string;
  totalLatencyMs: number;
}

export class FallbackChainService {
  static MAX_RETRIES = 3;

  constructor(
    private modelRouter: ModelRouter,
    private db: D1Database,
  ) {}

  async executeWithFallback(
    request: AgentExecutionRequest,
    createRunner: (rule: RoutingRule) => AgentRunner,
  ): Promise<FallbackChainResult> {
    const chain = await this.modelRouter.getFallbackChain(request.taskType);
    const maxAttempts = Math.min(chain.length, FallbackChainService.MAX_RETRIES);

    const attemptedModels: string[] = [];
    const failoverEvents: FallbackEvent[] = [];
    let totalLatencyMs = 0;

    for (let i = 0; i < maxAttempts; i++) {
      const rule = chain[i]!;
      const runner = createRunner(rule);
      attemptedModels.push(rule.modelId);

      const start = Date.now();
      try {
        const result = await runner.execute(request);
        const elapsed = Date.now() - start;
        totalLatencyMs += elapsed;

        // partial은 성공으로 간주
        if (result.status === "success" || result.status === "partial") {
          return {
            result,
            attemptedModels,
            failoverEvents,
            finalModel: rule.modelId,
            totalLatencyMs,
          };
        }

        // status === "failed" → 다음 모델로 전환
        const elapsed2 = elapsed;
        totalLatencyMs += 0; // elapsed already counted
        if (i < maxAttempts - 1) {
          const nextModel = chain[i + 1]!.modelId;
          const reason = "error";
          const event = await this.recordFailover(
            request.taskType,
            rule.modelId,
            nextModel,
            reason,
            elapsed2,
          );
          failoverEvents.push(event);
        }
      } catch (err: unknown) {
        const elapsed = Date.now() - start;
        totalLatencyMs += elapsed;
        const reason = this.classifyError(err);

        if (i < maxAttempts - 1) {
          const nextModel = chain[i + 1]!.modelId;
          const event = await this.recordFailover(
            request.taskType,
            rule.modelId,
            nextModel,
            reason,
            elapsed,
          );
          failoverEvents.push(event);
        } else {
          throw err;
        }
      }
    }

    // 모든 모델이 failed status를 반환한 경우
    throw new Error(
      `All ${maxAttempts} models failed for task ${request.taskType}: ${attemptedModels.join(" → ")}`,
    );
  }

  classifyError(err: unknown): "timeout" | "error" | "rate-limit" {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
      return "rate-limit";
    }
    if (msg.toLowerCase().includes("timeout") || msg.includes("ETIMEDOUT")) {
      return "timeout";
    }
    return "error";
  }

  async recordFailover(
    taskType: AgentTaskType | string,
    fromModel: string,
    toModel: string,
    reason: string,
    latencyMs: number,
  ): Promise<FallbackEvent> {
    const id = `fe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await this.db
      .prepare(
        "INSERT INTO fallback_events (id, task_type, from_model, to_model, reason, latency_ms) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, taskType, fromModel, toModel, reason, latencyMs)
      .run();

    return {
      id,
      taskType: taskType as string,
      fromModel,
      toModel,
      reason,
      latencyMs,
      createdAt: new Date().toISOString(),
    };
  }

  async listEvents(limit = 20): Promise<FallbackEvent[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM fallback_events ORDER BY created_at DESC LIMIT ?",
      )
      .bind(limit)
      .all<{
        id: string;
        task_type: string;
        from_model: string;
        to_model: string;
        reason: string;
        latency_ms: number;
        created_at: string;
      }>();

    return results.map((r) => ({
      id: r.id,
      taskType: r.task_type,
      fromModel: r.from_model,
      toModel: r.to_model,
      reason: r.reason,
      latencyMs: r.latency_ms,
      createdAt: r.created_at,
    }));
  }
}
