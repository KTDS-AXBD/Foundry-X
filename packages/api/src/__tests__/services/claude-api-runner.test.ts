import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ClaudeApiRunner, MockRunner, TASK_SYSTEM_PROMPTS, UIHINT_INSTRUCTION, DEFAULT_LAYOUT_MAP } from "../../core/agent/services/claude-api-runner.js";
import type { AgentExecutionRequest } from "../../core/agent/services/execution-types.js";
import { uiHintSchema } from "../../core/agent/schemas/agent.js";

const makeRequest = (overrides?: Partial<AgentExecutionRequest>): AgentExecutionRequest => ({
  taskId: "task-abc123",
  agentId: "agent-code-review",
  taskType: "code-review",
  context: {
    repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
    branch: "feat/test",
    targetFiles: ["src/index.ts"],
    instructions: "Review this file",
  },
  constraints: [],
  ...overrides,
});

describe("ClaudeApiRunner", () => {
  let runner: ClaudeApiRunner;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    runner = new ClaudeApiRunner("test-api-key");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("execute() returns success on valid JSON response", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            reviewComments: [
              { file: "src/index.ts", line: 10, comment: "Consider error handling", severity: "warning" },
            ],
          }),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("success");
    expect(result.output.reviewComments).toHaveLength(1);
    expect(result.output.reviewComments![0]!.file).toBe("src/index.ts");
    expect(result.tokensUsed).toBe(150);
    expect(result.model).toBe("claude-haiku-4-5");
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("execute() returns failed on API error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("failed");
    expect(result.output.analysis).toContain("Claude API error: 429");
    expect(result.tokensUsed).toBe(0);
  });

  it("execute() returns partial on non-JSON response", async () => {
    const mockResponse = {
      content: [{ type: "text", text: "This is plain text, not JSON" }],
      usage: { input_tokens: 50, output_tokens: 30 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("partial");
    expect(result.output.analysis).toBe("This is plain text, not JSON");
    expect(result.tokensUsed).toBe(80);
  });

  it("isAvailable() returns true when apiKey exists", async () => {
    expect(await runner.isAvailable()).toBe(true);
  });

  it("isAvailable() returns false when apiKey is empty", async () => {
    const emptyRunner = new ClaudeApiRunner("");
    expect(await emptyRunner.isAvailable()).toBe(false);
  });

  it("supportsTaskType() returns true for known types", () => {
    expect(runner.supportsTaskType("code-review")).toBe(true);
    expect(runner.supportsTaskType("code-generation")).toBe(true);
    expect(runner.supportsTaskType("spec-analysis")).toBe(true);
    expect(runner.supportsTaskType("test-generation")).toBe(true);
  });

  it("supportsTaskType() returns false for unknown types", () => {
    expect(runner.supportsTaskType("unknown-type")).toBe(false);
  });

  it("type is claude-api", () => {
    expect(runner.type).toBe("claude-api");
  });

  it("sends correct request to Anthropic API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ type: "text", text: '{"analysis":"ok"}' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
    });
    globalThis.fetch = mockFetch;

    await runner.execute(makeRequest({ taskType: "spec-analysis" }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(options.method).toBe("POST");
    expect(options.headers["x-api-key"]).toBe("test-api-key");

    const body = JSON.parse(options.body);
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.system).toBe(TASK_SYSTEM_PROMPTS["spec-analysis"]);
  });

  // ─── F60: Generative UI Tests ───

  it("UIHINT_INSTRUCTION is appended to all task prompts", () => {
    const taskTypes = ["code-review", "code-generation", "spec-analysis", "test-generation"] as const;
    for (const taskType of taskTypes) {
      expect(TASK_SYSTEM_PROMPTS[taskType]).toContain("uiHint");
      expect(TASK_SYSTEM_PROMPTS[taskType]).toContain(UIHINT_INSTRUCTION);
    }
  });

  it("execute() extracts uiHint from JSON response", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            analysis: "Spec is complete",
            uiHint: {
              layout: "card",
              sections: [{ type: "text", title: "Summary", data: "All good" }],
            },
          }),
        },
      ],
      usage: { input_tokens: 40, output_tokens: 20 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await runner.execute(makeRequest({ taskType: "spec-analysis" }));

    expect(result.status).toBe("success");
    expect(result.output.uiHint).toBeDefined();
    expect(result.output.uiHint!.layout).toBe("card");
    expect(result.output.uiHint!.sections).toHaveLength(1);
  });

  it("execute() works without uiHint (backward compat)", async () => {
    const mockResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            analysis: "No hints here",
          }),
        },
      ],
      usage: { input_tokens: 20, output_tokens: 10 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await runner.execute(makeRequest({ taskType: "spec-analysis" }));

    expect(result.status).toBe("success");
    expect(result.output.uiHint).toBeUndefined();
    expect(result.output.analysis).toBe("No hints here");
  });

  it("DEFAULT_LAYOUT_MAP covers all task types", () => {
    expect(DEFAULT_LAYOUT_MAP["code-review"]).toBe("tabs");
    expect(DEFAULT_LAYOUT_MAP["code-generation"]).toBe("accordion");
    expect(DEFAULT_LAYOUT_MAP["spec-analysis"]).toBe("card");
    expect(DEFAULT_LAYOUT_MAP["test-generation"]).toBe("accordion");
  });
});

describe("MockRunner", () => {
  const runner = new MockRunner();

  it("execute() returns success with mock data", async () => {
    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("success");
    expect(result.output.analysis).toContain("[Mock]");
    expect(result.output.analysis).toContain("code-review");
    expect(result.output.analysis).toContain("src/index.ts");
    expect(result.tokensUsed).toBe(0);
    expect(result.model).toBe("mock");
    expect(result.duration).toBe(100);
  });

  it("isAvailable() always returns true", async () => {
    expect(await runner.isAvailable()).toBe(true);
  });

  it("supportsTaskType() always returns true", () => {
    expect(runner.supportsTaskType("anything")).toBe(true);
  });

  it("type is mock", () => {
    expect(runner.type).toBe("mock");
  });
});

// ─── F60: uiHintSchema Zod Validation (3건) ───

describe("uiHintSchema", () => {
  it("validates a valid UIHint object", () => {
    const validHint = {
      layout: "card",
      sections: [
        { type: "text", title: "Summary", data: "All checks passed" },
        { type: "code", title: "Output", data: "const x = 1;", interactive: false },
      ],
    };
    const result = uiHintSchema.safeParse(validHint);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layout).toBe("card");
      expect(result.data.sections).toHaveLength(2);
    }
  });

  it("rejects invalid layout type", () => {
    const invalid = {
      layout: "grid",
      sections: [{ type: "text", title: "T", data: "D" }],
    };
    const result = uiHintSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates UIHint with optional html and actions", () => {
    const hintWithExtras = {
      layout: "iframe",
      sections: [{ type: "chart", title: "Graph", data: { labels: [1, 2] } }],
      html: "<canvas id='chart'></canvas>",
      actions: [
        { type: "approve", label: "Accept" },
        { type: "edit", label: "Modify", targetSection: 0 },
      ],
    };
    const result = uiHintSchema.safeParse(hintWithExtras);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.html).toContain("canvas");
      expect(result.data.actions).toHaveLength(2);
    }
  });
});
