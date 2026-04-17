// F527 Agent Runtime (L2) — TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineTool } from "../../core/agent/runtime/define-tool.js";
import { ToolRegistry } from "../../core/agent/runtime/tool-registry.js";
import { TokenTracker } from "../../core/agent/runtime/token-tracker.js";
import { parseAgentSpec } from "../../core/agent/runtime/agent-spec-loader.js";
import { AgentRuntime } from "../../core/agent/runtime/agent-runtime.js";
import { z } from "zod";
import type { RuntimeContext, AgentHooks } from "@foundry-x/shared";

// ─── defineTool ──────────────────────────────────────────────────────────────

describe("F527 Agent Runtime (L2)", () => {
  describe("defineTool", () => {
    it("name과 description이 있으면 도구를 반환한다", () => {
      const tool = defineTool({
        name: "read_file",
        description: "Reads a file from disk",
        inputSchema: z.object({ path: z.string() }),
        category: "builtin",
        execute: async ({ path }) => `content of ${path}`,
      });

      expect(tool.name).toBe("read_file");
      expect(tool.description).toBe("Reads a file from disk");
      expect(tool.category).toBe("builtin");
    });

    it("name이 없으면 에러를 던진다", () => {
      expect(() =>
        defineTool({
          name: "",
          description: "Some tool",
          inputSchema: z.object({}),
          category: "custom",
          execute: async () => undefined,
        })
      ).toThrow("Tool name is required");
    });

    it("description이 없으면 에러를 던진다", () => {
      expect(() =>
        defineTool({
          name: "my_tool",
          description: "",
          inputSchema: z.object({}),
          category: "custom",
          execute: async () => undefined,
        })
      ).toThrow("Tool description is required");
    });
  });

  // ─── ToolRegistry ───────────────────────────────────────────────────────────

  describe("ToolRegistry", () => {
    let registry: ToolRegistry;

    beforeEach(() => {
      registry = new ToolRegistry();
    });

    it("register 후 get으로 조회된다", () => {
      const tool = defineTool({
        name: "search_code",
        description: "Search code",
        inputSchema: z.object({ query: z.string() }),
        category: "builtin",
        execute: async () => "results",
      });

      registry.register(tool);
      expect(registry.get("search_code")).toBe(tool);
    });

    it("없는 도구는 undefined를 반환한다", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });

    it("has()로 존재 여부를 확인한다", () => {
      const tool = defineTool({
        name: "my_tool",
        description: "A tool",
        inputSchema: z.object({}),
        category: "custom",
        execute: async () => undefined,
      });
      registry.register(tool);

      expect(registry.has("my_tool")).toBe(true);
      expect(registry.has("other_tool")).toBe(false);
    });

    it("category 필터로 list 가능하다", () => {
      registry.register(
        defineTool({ name: "t1", description: "d1", inputSchema: z.object({}), category: "builtin", execute: async () => undefined })
      );
      registry.register(
        defineTool({ name: "t2", description: "d2", inputSchema: z.object({}), category: "custom", execute: async () => undefined })
      );
      registry.register(
        defineTool({ name: "t3", description: "d3", inputSchema: z.object({}), category: "builtin", execute: async () => undefined })
      );

      const builtins = registry.list({ category: "builtin" });
      expect(builtins).toHaveLength(2);
      expect(builtins.map((t) => t.name)).toContain("t1");
      expect(builtins.map((t) => t.name)).toContain("t3");
    });

    it("toAnthropicTools()가 올바른 포맷을 반환한다", () => {
      registry.register(
        defineTool({
          name: "do_thing",
          description: "Does a thing",
          inputSchema: z.object({ x: z.string() }),
          category: "custom",
          execute: async () => undefined,
        })
      );

      const anthropicTools = registry.toAnthropicTools();
      expect(anthropicTools).toHaveLength(1);
      expect(anthropicTools[0]).toMatchObject({
        name: "do_thing",
        description: "Does a thing",
        input_schema: expect.objectContaining({ type: "object" }),
      });
    });
  });

  // ─── TokenTracker ───────────────────────────────────────────────────────────

  describe("TokenTracker", () => {
    let tracker: TokenTracker;

    beforeEach(() => {
      tracker = new TokenTracker();
    });

    it("track 후 getUsage에 누적된다", () => {
      tracker.track("agent-1", { inputTokens: 100, outputTokens: 50 });
      tracker.track("agent-1", { inputTokens: 200, outputTokens: 100 });

      const usage = tracker.getUsage("agent-1");
      expect(usage.inputTokens).toBe(300);
      expect(usage.outputTokens).toBe(150);
      expect(usage.totalTokens).toBe(450);
    });

    it("다른 에이전트는 별도로 집계된다", () => {
      tracker.track("agent-1", { inputTokens: 100, outputTokens: 50 });
      tracker.track("agent-2", { inputTokens: 200, outputTokens: 100 });

      expect(tracker.getUsage("agent-1").totalTokens).toBe(150);
      expect(tracker.getUsage("agent-2").totalTokens).toBe(300);
    });

    it("total()이 전체 합산을 반환한다", () => {
      tracker.track("agent-1", { inputTokens: 100, outputTokens: 50 });
      tracker.track("agent-2", { inputTokens: 200, outputTokens: 100 });

      const total = tracker.total();
      expect(total.inputTokens).toBe(300);
      expect(total.outputTokens).toBe(150);
      expect(total.totalTokens).toBe(450);
    });

    it("reset()으로 특정 에이전트 초기화된다", () => {
      tracker.track("agent-1", { inputTokens: 100, outputTokens: 50 });
      tracker.reset("agent-1");

      expect(tracker.getUsage("agent-1").totalTokens).toBe(0);
    });

    it("reset() 인자 없이 전체 초기화된다", () => {
      tracker.track("agent-1", { inputTokens: 100, outputTokens: 50 });
      tracker.track("agent-2", { inputTokens: 200, outputTokens: 100 });
      tracker.reset();

      expect(tracker.total().totalTokens).toBe(0);
    });
  });

  // ─── AgentSpecLoader ────────────────────────────────────────────────────────

  describe("AgentSpecLoader", () => {
    it("유효한 YAML을 AgentSpec으로 파싱한다", () => {
      const yaml = `
name: planner
model: claude-haiku-4-5
systemPrompt: You are a planning agent
tools:
  - read_file
  - search_code
constraints:
  maxTokens: 4096
  maxRounds: 10
`.trim();

      const spec = parseAgentSpec(yaml);
      expect(spec.name).toBe("planner");
      expect(spec.model).toBe("claude-haiku-4-5");
      expect(spec.systemPrompt).toBe("You are a planning agent");
      expect(spec.tools).toEqual(["read_file", "search_code"]);
      expect(spec.constraints?.maxTokens).toBe(4096);
      expect(spec.constraints?.maxRounds).toBe(10);
    });

    it("systemPrompt 없는 YAML은 에러를 던진다", () => {
      const yaml = `
name: planner
model: claude-haiku-4-5
`.trim();

      expect(() => parseAgentSpec(yaml)).toThrow();
    });

    it("model 없는 YAML은 에러를 던진다", () => {
      const yaml = `
name: planner
systemPrompt: You are a planning agent
`.trim();

      expect(() => parseAgentSpec(yaml)).toThrow();
    });
  });

  // ─── AgentRuntime ───────────────────────────────────────────────────────────

  describe("AgentRuntime", () => {
    let registry: ToolRegistry;
    let tracker: TokenTracker;
    let runtime: AgentRuntime;
    const originalFetch = globalThis.fetch;

    const makeContext = (): RuntimeContext => ({
      agentId: "test-agent",
      sessionId: "session-123",
      apiKey: "test-key",
    });

    const makeSpec = (overrides = {}) => ({
      name: "test",
      model: "claude-haiku-4-5",
      systemPrompt: "You are a test agent",
      tools: [],
      constraints: { maxRounds: 5 },
      ...overrides,
    });

    beforeEach(() => {
      registry = new ToolRegistry();
      tracker = new TokenTracker();
      runtime = new AgentRuntime(registry, tracker);
      globalThis.fetch = originalFetch;
    });

    it("end_turn 응답 시 단일 라운드로 완료된다", async () => {
      const mockResponse = {
        content: [{ type: "text", text: "Plan complete" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 50 },
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await runtime.run(makeSpec(), "Plan this task", makeContext());

      expect(result.stopReason).toBe("end_turn");
      expect(result.output).toBe("Plan complete");
      expect(result.rounds).toBe(1);
      expect(result.tokenUsage.totalTokens).toBe(150);
    });

    it("tool_use 응답 시 도구를 실행하고 결과를 이어간다", async () => {
      registry.register(
        defineTool({
          name: "read_file",
          description: "Read a file",
          inputSchema: z.object({ path: z.string() }),
          category: "builtin",
          execute: async ({ path }) => `contents of ${path}`,
        })
      );

      const toolUseResponse = {
        content: [
          { type: "tool_use", id: "tu_1", name: "read_file", input: { path: "src/index.ts" } },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 100, output_tokens: 30 },
      };
      const finalResponse = {
        content: [{ type: "text", text: "Done reading" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 200, output_tokens: 40 },
      };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(toolUseResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(finalResponse) });

      const result = await runtime.run(
        makeSpec({ tools: ["read_file"] }),
        "Read the index file",
        makeContext()
      );

      expect(result.stopReason).toBe("end_turn");
      expect(result.output).toBe("Done reading");
      expect(result.rounds).toBe(2);
    });

    it("beforeTool hook이 'cancel'을 반환하면 도구를 건너뛴다", async () => {
      const executeStub = vi.fn();
      registry.register(
        defineTool({
          name: "dangerous_tool",
          description: "Dangerous",
          inputSchema: z.object({}),
          category: "custom",
          execute: executeStub,
        })
      );

      const toolUseResponse = {
        content: [
          { type: "tool_use", id: "tu_1", name: "dangerous_tool", input: {} },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 50, output_tokens: 20 },
      };
      const finalResponse = {
        content: [{ type: "text", text: "Skipped" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 20 },
      };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(toolUseResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(finalResponse) });

      const ctx = {
        ...makeContext(),
        hooks: {
          beforeTool: vi.fn().mockResolvedValue("cancel" as const),
        },
      };

      await runtime.run(makeSpec({ tools: ["dangerous_tool"] }), "Do dangerous thing", ctx);

      expect(executeStub).not.toHaveBeenCalled();
      expect(ctx.hooks.beforeTool).toHaveBeenCalled();
    });

    it("maxRounds 초과 시 max_rounds로 중단된다", async () => {
      const toolUseResponse = {
        content: [
          { type: "tool_use", id: "tu_1", name: "loop_tool", input: {} },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 50, output_tokens: 20 },
      };
      // 항상 tool_use 반환 → 루프 지속
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(toolUseResponse),
      });

      registry.register(
        defineTool({
          name: "loop_tool",
          description: "Loops forever",
          inputSchema: z.object({}),
          category: "custom",
          execute: async () => "looping",
        })
      );

      const result = await runtime.run(
        makeSpec({ tools: ["loop_tool"], constraints: { maxRounds: 3 } }),
        "Loop",
        makeContext()
      );

      expect(result.stopReason).toBe("max_rounds");
      expect(result.rounds).toBe(3);
    });
  });
});
