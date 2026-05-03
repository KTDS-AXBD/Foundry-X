// F529 Agent Streaming (L1) — TDD Red Phase
import { describe, it, expect, vi } from "vitest";
import { AgentStreamHandler, formatSSE } from "../../agent/streaming/agent-stream-handler.js";
import { AgentMetricsService } from "../../agent/streaming/agent-metrics-service.js";
import type { AgentStreamEvent } from "@foundry-x/shared";

// ─── 헬퍼: ReadableStream 컨트롤러 모킹 ───

function makeController() {
  const chunks: Uint8Array[] = [];
  const ctrl = {
    enqueue: vi.fn((chunk: Uint8Array) => { chunks.push(chunk); }),
    close: vi.fn(),
    error: vi.fn(),
  };
  const decode = () => chunks.map((c) => new TextDecoder().decode(c)).join("");
  const events = (): AgentStreamEvent[] =>
    decode()
      .split("\n\n")
      .filter(Boolean)
      .map((line) => {
        const data = line.replace(/^data: /, "");
        return JSON.parse(data) as AgentStreamEvent;
      });
  return { ctrl: ctrl as unknown as ReadableStreamDefaultController, events, chunks };
}

function makeMetricsMock(): AgentMetricsService {
  return {
    createRunning: vi.fn().mockResolvedValue("metric-uuid-001"),
    complete: vi.fn().mockResolvedValue(undefined),
    failRun: vi.fn().mockResolvedValue(undefined),
    getBySessionId: vi.fn().mockResolvedValue([]),
  } as unknown as AgentMetricsService;
}

// ─── 테스트 ───

describe("F529 AgentStreamHandler", () => {
  describe("createHooks()", () => {
    it("beforeInvocation → run_started 이벤트를 enqueue한다", async () => {
      const metrics = makeMetricsMock();
      const handler = new AgentStreamHandler("sess-001", metrics);
      const { ctrl, events } = makeController();

      const hooks = handler.createHooks(ctrl);

      await hooks.beforeInvocation!({
        agentId: "planner",
        sessionId: "sess-001",
        spec: {} as never,
        input: "Hello",
      });

      const emitted = events();
      expect(emitted).toHaveLength(1);
      expect(emitted[0]!.type).toBe("run_started");
      expect(emitted[0]!.sessionId).toBe("sess-001");
      expect((emitted[0]!.payload as { agentId: string }).agentId).toBe("planner");
    });

    it("afterModel → text content가 있으면 text_delta 이벤트를 enqueue한다", async () => {
      const metrics = makeMetricsMock();
      const handler = new AgentStreamHandler("sess-002", metrics);
      const { ctrl, events } = makeController();

      const hooks = handler.createHooks(ctrl);

      await hooks.afterModel!(
        { messages: [], systemPrompt: "", model: "claude-sonnet-4-6" },
        {
          content: [{ type: "text", text: "Hello world" }],
          usage: { inputTokens: 10, outputTokens: 5 },
          stopReason: "end_turn",
        },
      );

      const emitted = events();
      const textDelta = emitted.find((e) => e.type === "text_delta");
      expect(textDelta).toBeDefined();
      expect((textDelta!.payload as { delta: string }).delta).toBe("Hello world");
    });

    it("afterModel → text content가 없으면 text_delta를 발행하지 않는다", async () => {
      const metrics = makeMetricsMock();
      const handler = new AgentStreamHandler("sess-003", metrics);
      const { ctrl, events } = makeController();

      const hooks = handler.createHooks(ctrl);

      await hooks.afterModel!(
        { messages: [], systemPrompt: "", model: "claude-sonnet-4-6" },
        {
          content: [],
          usage: { inputTokens: 5, outputTokens: 0 },
          stopReason: "end_turn",
        },
      );

      const emitted = events();
      expect(emitted.every((e) => e.type !== "text_delta")).toBe(true);
    });

    it("beforeTool → tool_call 이벤트를 enqueue한다", async () => {
      const metrics = makeMetricsMock();
      const handler = new AgentStreamHandler("sess-004", metrics);
      const { ctrl, events } = makeController();

      const hooks = handler.createHooks(ctrl);

      await hooks.beforeTool!({
        toolName: "read_file",
        toolInput: { path: "/tmp/test.txt" },
        toolUseId: "tu-001",
      });

      const emitted = events();
      const toolCall = emitted.find((e) => e.type === "tool_call");
      expect(toolCall).toBeDefined();
      expect((toolCall!.payload as { toolName: string }).toolName).toBe("read_file");
      // ToolCallContext.toolInput 이 payload로 전달됨
    });

    it("afterTool → tool_result 이벤트를 enqueue한다", async () => {
      const metrics = makeMetricsMock();
      const handler = new AgentStreamHandler("sess-005", metrics);
      const { ctrl, events } = makeController();

      const hooks = handler.createHooks(ctrl);

      await hooks.afterTool!(
        { toolName: "read_file", toolInput: {}, toolUseId: "tu-001" },
        { content: "file contents here" },
      );

      const emitted = events();
      const toolResult = emitted.find((e) => e.type === "tool_result");
      expect(toolResult).toBeDefined();
      expect((toolResult!.payload as { toolName: string }).toolName).toBe("read_file");
    });

    it("afterInvocation → run_completed 이벤트를 enqueue하고 metrics.complete() 호출한다", async () => {
      const metrics = makeMetricsMock();
      const handler = new AgentStreamHandler("sess-006", metrics);
      const { ctrl, events } = makeController();

      const hooks = handler.createHooks(ctrl);

      // beforeInvocation 먼저 호출 (metricId 초기화)
      await hooks.beforeInvocation!({
        agentId: "planner",
        sessionId: "sess-006",
        spec: {} as never,
        input: "test",
      });

      await hooks.afterInvocation!(
        { agentId: "planner", sessionId: "sess-006", spec: {} as never, input: "test" },
        {
          output: "done",
          stopReason: "end_turn",
          rounds: 2,
          tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        },
      );

      const emitted = events();
      const completed = emitted.find((e) => e.type === "run_completed");
      expect(completed).toBeDefined();
      expect((completed!.payload as { metricId: string }).metricId).toBe("metric-uuid-001");
      expect(metrics.complete).toHaveBeenCalledOnce();
    });
  });

  describe("formatSSE()", () => {
    it("data: {...}\\n\\n 형식으로 직렬화한다", () => {
      const event: AgentStreamEvent = {
        type: "run_started",
        sessionId: "s1",
        timestamp: "2026-04-13T00:00:00.000Z",
        payload: { agentId: "planner", input: "hello" },
      };

      const result = formatSSE(event);
      expect(result).toMatch(/^data: \{/);
      expect(result).toMatch(/\n\n$/);
    });

    it("payload에 특수 문자가 있어도 JSON으로 안전하게 직렬화한다", () => {
      const event: AgentStreamEvent = {
        type: "text_delta",
        sessionId: "s1",
        timestamp: "2026-04-13T00:00:00.000Z",
        payload: { delta: 'he said "hello"', accumulated: 'he said "hello"' },
      };

      const result = formatSSE(event);
      const parsed = JSON.parse(result.replace("data: ", "").trim());
      expect((parsed.payload as { delta: string }).delta).toBe('he said "hello"');
    });
  });
});
