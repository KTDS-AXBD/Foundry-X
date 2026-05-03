// ─── F532: 에이전트 스트리밍 E2E 통합 테스트 (Sprint 285) ───
// TDD Red Phase — streaming.ts + AgentStreamHandler 검증

import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamingRoute } from "../agent/routes/streaming.js";
import { AgentStreamHandler } from "../agent/streaming/agent-stream-handler.js";
import { createTestEnv } from "./helpers/test-app.js";
import type { AgentStreamEvent } from "@foundry-x/shared";

// ─── AgentMetricsService mock ───
vi.mock("../agent/streaming/agent-metrics-service.js", () => ({
  AgentMetricsService: vi.fn().mockImplementation(() => ({
    createRunning: vi.fn().mockResolvedValue("mock-metric-id"),
    complete: vi.fn().mockResolvedValue(undefined),
    failRun: vi.fn().mockResolvedValue(undefined),
    getBySessionId: vi.fn().mockResolvedValue([]),
  })),
}));

// ─── AgentRuntime mock (ANTHROPIC_API_KEY 없이 동작) ───
vi.mock("../agent/runtime/agent-runtime.js", () => ({
  AgentRuntime: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockImplementation(async (_spec, input, ctx) => {
      // 훅 실행 시뮬레이션
      if (ctx.hooks?.beforeInvocation) {
        await ctx.hooks.beforeInvocation({ agentId: ctx.agentId, input, sessionId: ctx.sessionId });
      }
      if (ctx.hooks?.afterRound) {
        await ctx.hooks.afterRound({ round: 1, result: { text: "Mock response", toolCalls: [], usage: { inputTokens: 10, outputTokens: 20, cacheReadTokens: 0 } } });
      }
      const result = { text: "Mock response", rounds: 1, tokenUsage: { inputTokens: 10, outputTokens: 20, cacheReadTokens: 0 }, stopReason: "end_turn" };
      if (ctx.hooks?.afterInvocation) {
        await ctx.hooks.afterInvocation({ agentId: ctx.agentId, input, sessionId: ctx.sessionId }, result);
      }
      return result;
    }),
  })),
}));

function parseSSEChunk(text: string): AgentStreamEvent[] {
  return text
    .split("\n\n")
    .filter((p) => p.startsWith("data: "))
    .map((p) => JSON.parse(p.slice(6)) as AgentStreamEvent);
}

async function readAllChunks(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

// ─── Test 1~4: streamingRoute 통합 테스트 ───

describe("F532 — streamingRoute 통합 테스트", () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    vi.clearAllMocks();
  });

  it("test 1: POST /agents/run/stream → Content-Type: text/event-stream + X-Session-Id 헤더", async () => {
    const res = await streamingRoute.request(
      "/agents/run/stream",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-code-review", input: "hello" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("X-Session-Id")).toBeTruthy();
    res.body?.cancel();
  });

  it("test 2: POST /agents/run/stream → 첫 청크에 run_started 이벤트 포함", async () => {
    const res = await streamingRoute.request(
      "/agents/run/stream",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-code-review", input: "test input" }),
      },
      env,
    );

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();

    const text = await readAllChunks(res.body!);
    const events = parseSSEChunk(text);

    expect(events.length).toBeGreaterThanOrEqual(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstEvent = events[0] as any;
    expect(firstEvent.type).toBe("run_started");
    expect((firstEvent.payload as { agentId: string }).agentId).toBe("agent-code-review");
  });

  it("test 3: POST /agents/run/stream → agentId 누락 시 400 반환", async () => {
    const res = await streamingRoute.request(
      "/agents/run/stream",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "hello" }),
      },
      env,
    );

    expect(res.status).toBe(400);
  });

  it("test 4: GET /agents/stream/ws → upgrade 헤더 없음 → 400 + error 메시지", async () => {
    const res = await streamingRoute.request(
      "/agents/stream/ws",
      {
        method: "GET",
      },
      env,
    );

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("WebSocket");
  });
});

// ─── Test 5: AgentStreamHandler 이벤트 순서 검증 ───

describe("F532 — AgentStreamHandler 이벤트 순서", () => {
  it("test 5: createHooks → run_started → run_completed 순서 보장", async () => {
    const { AgentMetricsService } = await import("../agent/streaming/agent-metrics-service.js");
    const mockDb = {} as D1Database;
    const metricsService = new AgentMetricsService(mockDb);

    const chunks: string[] = [];
    const fakeCtrl = {
      enqueue: (chunk: Uint8Array) => chunks.push(new TextDecoder().decode(chunk)),
      close: vi.fn(),
      error: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const handler = new AgentStreamHandler("test-session", metricsService);
    const hooks = handler.createHooks(fakeCtrl);

    const mockSpec = {
      name: "test-agent",
      model: "claude-sonnet-4-6",
      systemPrompt: "test",
      tools: [] as string[],
    };
    const mockCtx = { agentId: "test-agent", input: "hello", sessionId: "test-session", spec: mockSpec };

    // 시뮬레이션: beforeInvocation → afterInvocation
    await hooks.beforeInvocation?.(mockCtx);
    await hooks.afterInvocation?.(mockCtx, {
      output: "done",
      rounds: 1,
      tokenUsage: { inputTokens: 5, outputTokens: 10, cacheReadTokens: 0, totalTokens: 15 },
      stopReason: "end_turn",
    });

    const allText = chunks.join("");
    const events = parseSSEChunk(allText);

    const types = events.map((e) => e.type);
    expect(types[0]).toBe("run_started");
    expect(types[types.length - 1]).toBe("run_completed");
  });
});
