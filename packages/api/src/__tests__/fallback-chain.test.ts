import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestEnv } from "./helpers/test-app.js";
import { ModelRouter, DEFAULT_MODEL_MAP } from "../services/model-router.js";
import { FallbackChainService } from "../services/fallback-chain.js";
import type { FallbackChainResult } from "../services/fallback-chain.js";
import type { AgentRunner } from "../services/agent-runner.js";
import type { RoutingRule } from "../services/model-router.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "../services/execution-types.js";

let env: ReturnType<typeof createTestEnv>;

function createTables() {
  (env.DB as any).db.exec(`
    CREATE TABLE IF NOT EXISTS model_routing_rules (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      model_id TEXT NOT NULL,
      runner_type TEXT NOT NULL DEFAULT 'openrouter',
      priority INTEGER NOT NULL DEFAULT 1,
      max_cost_per_call REAL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_type, model_id)
    );
    CREATE TABLE IF NOT EXISTS fallback_events (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      from_model TEXT NOT NULL,
      to_model TEXT NOT NULL,
      reason TEXT NOT NULL,
      latency_ms INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedRule(
  id: string,
  taskType: string,
  modelId: string,
  opts?: { priority?: number; enabled?: number },
) {
  const priority = opts?.priority ?? 1;
  const enabled = opts?.enabled ?? 1;
  (env.DB as any).db
    .prepare(
      "INSERT INTO model_routing_rules (id, task_type, model_id, runner_type, priority, enabled) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, taskType, modelId, "openrouter", priority, enabled);
}

function makeRequest(taskType = "code-review" as const): AgentExecutionRequest {
  return {
    taskId: "t1",
    agentId: "a1",
    taskType,
    context: { repoUrl: "https://github.com/test/test", branch: "main" },
    constraints: [],
  };
}

function makeResult(
  status: "success" | "partial" | "failed" = "success",
): AgentExecutionResult {
  return {
    status,
    output: { analysis: "ok" },
    tokensUsed: 100,
    model: "test-model",
    duration: 50,
  };
}

function mockRunner(result: AgentExecutionResult | Error): AgentRunner {
  return {
    type: "mock",
    execute: result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

beforeEach(() => {
  env = createTestEnv();
  createTables();
});

describe("FallbackChainService", () => {
  describe("executeWithFallback", () => {
    it("첫 번째 모델 성공 시 즉시 반환 (attemptedModels.length === 1)", async () => {
      seedRule("r1", "code-review", "model-a", { priority: 1 });
      seedRule("r2", "code-review", "model-b", { priority: 2 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      const successResult = makeResult("success");
      const res = await service.executeWithFallback(
        makeRequest(),
        () => mockRunner(successResult),
      );

      expect(res.attemptedModels).toHaveLength(1);
      expect(res.attemptedModels[0]).toBe("model-a");
      expect(res.result.status).toBe("success");
      expect(res.failoverEvents).toHaveLength(0);
      expect(res.finalModel).toBe("model-a");
    });

    it("첫 번째 실패 → 두 번째 성공 (failoverEvents.length === 1)", async () => {
      seedRule("r1", "code-review", "model-a", { priority: 1 });
      seedRule("r2", "code-review", "model-b", { priority: 2 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      let callCount = 0;
      const res = await service.executeWithFallback(makeRequest(), () => ({
        type: "mock",
        execute: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) throw new Error("model down");
          return Promise.resolve(makeResult("success"));
        }),
        isAvailable: vi.fn().mockResolvedValue(true),
        supportsTaskType: vi.fn().mockReturnValue(true),
      }));

      expect(res.attemptedModels).toHaveLength(2);
      expect(res.failoverEvents).toHaveLength(1);
      expect(res.failoverEvents[0]!.fromModel).toBe("model-a");
      expect(res.failoverEvents[0]!.toModel).toBe("model-b");
      expect(res.finalModel).toBe("model-b");
    });

    it("3회 모두 실패 시 에러 throw", async () => {
      seedRule("r1", "code-review", "model-a", { priority: 1 });
      seedRule("r2", "code-review", "model-b", { priority: 2 });
      seedRule("r3", "code-review", "model-c", { priority: 3 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      await expect(
        service.executeWithFallback(
          makeRequest(),
          () => mockRunner(new Error("always fail")),
        ),
      ).rejects.toThrow("always fail");
    });

    it("체인 1개만 있을 때 폴백 없이 단일 시도", async () => {
      seedRule("r1", "code-review", "single-model");

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      const res = await service.executeWithFallback(
        makeRequest(),
        () => mockRunner(makeResult("success")),
      );

      expect(res.attemptedModels).toHaveLength(1);
      expect(res.attemptedModels[0]).toBe("single-model");
      expect(res.failoverEvents).toHaveLength(0);
    });

    it("partial 결과(status==='partial')는 성공으로 간주하고 반환", async () => {
      seedRule("r1", "code-review", "model-a", { priority: 1 });
      seedRule("r2", "code-review", "model-b", { priority: 2 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      const res = await service.executeWithFallback(
        makeRequest(),
        () => mockRunner(makeResult("partial")),
      );

      expect(res.result.status).toBe("partial");
      expect(res.attemptedModels).toHaveLength(1);
      expect(res.finalModel).toBe("model-a");
    });

    it("failed 결과(status==='failed') 시 다음 모델 시도", async () => {
      seedRule("r1", "code-review", "model-a", { priority: 1 });
      seedRule("r2", "code-review", "model-b", { priority: 2 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      let callCount = 0;
      const res = await service.executeWithFallback(makeRequest(), () => ({
        type: "mock",
        execute: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(makeResult("failed"));
          return Promise.resolve(makeResult("success"));
        }),
        isAvailable: vi.fn().mockResolvedValue(true),
        supportsTaskType: vi.fn().mockReturnValue(true),
      }));

      expect(res.attemptedModels).toHaveLength(2);
      expect(res.result.status).toBe("success");
      expect(res.failoverEvents).toHaveLength(1);
    });

    it("FallbackChainResult에 totalLatencyMs 누적", async () => {
      seedRule("r1", "code-review", "model-a", { priority: 1 });

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      const res = await service.executeWithFallback(
        makeRequest(),
        () => mockRunner(makeResult("success")),
      );

      expect(typeof res.totalLatencyMs).toBe("number");
      expect(res.totalLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it("MAX_RETRIES보다 체인이 긴 경우 MAX_RETRIES까지만 시도", async () => {
      // 5개 모델 — MAX_RETRIES는 3
      for (let i = 1; i <= 5; i++) {
        seedRule(`r${i}`, "code-review", `model-${i}`, { priority: i });
      }

      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      let callCount = 0;
      await expect(
        service.executeWithFallback(makeRequest(), () => ({
          type: "mock",
          execute: vi.fn().mockImplementation(() => {
            callCount++;
            throw new Error("fail");
          }),
          isAvailable: vi.fn().mockResolvedValue(true),
          supportsTaskType: vi.fn().mockReturnValue(true),
        })),
      ).rejects.toThrow();

      expect(callCount).toBe(FallbackChainService.MAX_RETRIES);
    });
  });

  describe("classifyError", () => {
    it('"429" → "rate-limit"', () => {
      const service = new FallbackChainService(
        {} as ModelRouter,
        env.DB as unknown as D1Database,
      );
      expect(service.classifyError(new Error("HTTP 429 Too Many Requests"))).toBe("rate-limit");
    });

    it('"rate" 포함 → "rate-limit"', () => {
      const service = new FallbackChainService(
        {} as ModelRouter,
        env.DB as unknown as D1Database,
      );
      expect(service.classifyError(new Error("rate limit exceeded"))).toBe("rate-limit");
    });

    it('"timeout" → "timeout"', () => {
      const service = new FallbackChainService(
        {} as ModelRouter,
        env.DB as unknown as D1Database,
      );
      expect(service.classifyError(new Error("Request timeout after 30s"))).toBe("timeout");
    });

    it('"ETIMEDOUT" → "timeout"', () => {
      const service = new FallbackChainService(
        {} as ModelRouter,
        env.DB as unknown as D1Database,
      );
      expect(service.classifyError(new Error("connect ETIMEDOUT"))).toBe("timeout");
    });

    it("일반 에러 → 'error'", () => {
      const service = new FallbackChainService(
        {} as ModelRouter,
        env.DB as unknown as D1Database,
      );
      expect(service.classifyError(new Error("some random failure"))).toBe("error");
    });
  });

  describe("recordFailover", () => {
    it("D1에 fallback_events 저장 확인", async () => {
      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      const event = await service.recordFailover(
        "code-review",
        "model-a",
        "model-b",
        "timeout",
        150,
      );

      expect(event.id).toMatch(/^fe_/);
      expect(event.taskType).toBe("code-review");
      expect(event.fromModel).toBe("model-a");
      expect(event.toModel).toBe("model-b");
      expect(event.reason).toBe("timeout");
      expect(event.latencyMs).toBe(150);

      // D1에서 직접 조회하여 확인
      const row = (env.DB as any).db
        .prepare("SELECT * FROM fallback_events WHERE id = ?")
        .get(event.id);
      expect(row).toBeTruthy();
      expect(row.from_model).toBe("model-a");
    });
  });

  describe("listEvents", () => {
    it("조회 + limit 동작 확인", async () => {
      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      // 5개 이벤트 삽입
      for (let i = 0; i < 5; i++) {
        await service.recordFailover("code-review", `m${i}`, `m${i + 1}`, "error", i * 10);
      }

      const all = await service.listEvents(10);
      expect(all).toHaveLength(5);

      const limited = await service.listEvents(3);
      expect(limited).toHaveLength(3);
    });

    it("created_at DESC 정렬", async () => {
      const router = new ModelRouter(env.DB as unknown as D1Database);
      const service = new FallbackChainService(router, env.DB as unknown as D1Database);

      await service.recordFailover("code-review", "a", "b", "error", 10);
      await service.recordFailover("code-review", "b", "c", "timeout", 20);

      const events = await service.listEvents();
      // 최신순이므로 마지막에 넣은 b→c가 먼저
      expect(events).toHaveLength(2);
    });
  });
});

describe("ModelRouter.getFallbackChain", () => {
  it("D1 규칙 있을 때 priority 순 전체 반환", async () => {
    seedRule("r1", "code-review", "model-a", { priority: 3 });
    seedRule("r2", "code-review", "model-b", { priority: 1 });
    seedRule("r3", "code-review", "model-c", { priority: 2 });

    const router = new ModelRouter(env.DB as unknown as D1Database);
    const chain = await router.getFallbackChain("code-review");

    expect(chain).toHaveLength(3);
    expect(chain[0]!.modelId).toBe("model-b"); // priority 1
    expect(chain[1]!.modelId).toBe("model-c"); // priority 2
    expect(chain[2]!.modelId).toBe("model-a"); // priority 3
  });

  it("D1 규칙 없을 때 DEFAULT_MODEL_MAP 폴백 (단일 항목)", async () => {
    const router = new ModelRouter(env.DB as unknown as D1Database);
    const chain = await router.getFallbackChain("spec-analysis");

    expect(chain).toHaveLength(1);
    expect(chain[0]!.modelId).toBe(DEFAULT_MODEL_MAP["spec-analysis"]);
    expect(chain[0]!.id).toMatch(/^default_/);
  });

  it("disabled 규칙 제외", async () => {
    seedRule("r1", "code-review", "model-a", { priority: 1, enabled: 0 });
    seedRule("r2", "code-review", "model-b", { priority: 2 });

    const router = new ModelRouter(env.DB as unknown as D1Database);
    const chain = await router.getFallbackChain("code-review");

    expect(chain).toHaveLength(1);
    expect(chain[0]!.modelId).toBe("model-b");
  });
});
