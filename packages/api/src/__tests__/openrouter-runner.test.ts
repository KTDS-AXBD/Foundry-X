import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OpenRouterRunner,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  REQUEST_TIMEOUT_MS,
} from "../services/openrouter-runner.js";
import type { AgentExecutionRequest } from "../services/execution-types.js";

const makeRequest = (
  overrides?: Partial<AgentExecutionRequest>,
): AgentExecutionRequest => ({
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

const mockOpenRouterResponse = {
  id: "gen-abc123",
  model: "anthropic/claude-sonnet-4",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: JSON.stringify({
          reviewComments: [
            {
              file: "src/index.ts",
              line: 10,
              comment: "Consider error handling",
              severity: "warning",
            },
          ],
        }),
      },
      finish_reason: "stop",
    },
  ],
  usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
};

describe("OpenRouterRunner", () => {
  let runner: OpenRouterRunner;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    runner = new OpenRouterRunner("test-openrouter-key");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // 1. type 확인
  it("type is openrouter", () => {
    expect(runner.type).toBe("openrouter");
  });

  // 2. 유효한 JSON 응답 시 success
  it("execute() returns success on valid JSON response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenRouterResponse),
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("success");
    expect(result.output.reviewComments).toHaveLength(1);
    expect(result.output.reviewComments![0]!.file).toBe("src/index.ts");
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  // 3. uiHint 포함 응답
  it("execute() extracts uiHint from response (F60 compat)", async () => {
    const responseWithHint = {
      ...mockOpenRouterResponse,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              analysis: "Spec is complete",
              uiHint: {
                layout: "card",
                sections: [
                  { type: "text", title: "Summary", data: "All good" },
                ],
              },
            }),
          },
          finish_reason: "stop",
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithHint),
    });

    const result = await runner.execute(
      makeRequest({ taskType: "spec-analysis" }),
    );

    expect(result.status).toBe("success");
    expect(result.output.uiHint).toBeDefined();
    expect(result.output.uiHint!.layout).toBe("card");
    expect(result.output.uiHint!.sections).toHaveLength(1);
  });

  // 4. uiHint 없는 응답도 정상 동작
  it("execute() works without uiHint (backward compat)", async () => {
    const responseNoHint = {
      ...mockOpenRouterResponse,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({ analysis: "No hints here" }),
          },
          finish_reason: "stop",
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseNoHint),
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("success");
    expect(result.output.uiHint).toBeUndefined();
    expect(result.output.analysis).toBe("No hints here");
  });

  // 5. API 에러 429
  it("execute() returns failed on API error 429", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("failed");
    expect(result.output.analysis).toContain("OpenRouter API error: 429");
    expect(result.tokensUsed).toBe(0);
  });

  // 6. API 에러 500
  it("execute() returns failed on API error 500", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("failed");
    expect(result.output.analysis).toContain("OpenRouter API error: 500");
  });

  // 7. 비JSON 응답 시 partial
  it("execute() returns partial on non-JSON response", async () => {
    const plainTextResponse = {
      ...mockOpenRouterResponse,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "This is plain text, not JSON",
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(plainTextResponse),
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("partial");
    expect(result.output.analysis).toBe("This is plain text, not JSON");
    expect(result.tokensUsed).toBe(80);
  });

  // 8. 타임아웃
  it("execute() returns failed on timeout (AbortError)", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    const result = await runner.execute(makeRequest());

    expect(result.status).toBe("failed");
    expect(result.output.analysis).toContain("timed out");
    expect(result.output.analysis).toContain(String(REQUEST_TIMEOUT_MS));
  });

  // 9. 올바른 URL 호출 확인
  it("execute() calls correct URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenRouterResponse),
    });
    globalThis.fetch = mockFetch;

    await runner.execute(makeRequest());

    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toBe(`${DEFAULT_BASE_URL}/chat/completions`);
  });

  // 10. 헤더 확인
  it("execute() sends correct headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenRouterResponse),
    });
    globalThis.fetch = mockFetch;

    await runner.execute(makeRequest());

    const [, options] = mockFetch.mock.calls[0]!;
    expect(options.headers.Authorization).toBe("Bearer test-openrouter-key");
    expect(options.headers["HTTP-Referer"]).toBe(
      "https://foundry-x-api.ktds-axbd.workers.dev",
    );
    expect(options.headers["X-Title"]).toBe("Foundry-X");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  // 11. tokensUsed 합산
  it("execute() computes tokensUsed from prompt + completion tokens", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenRouterResponse),
    });

    const result = await runner.execute(makeRequest());

    expect(result.tokensUsed).toBe(150); // 100 + 50
  });

  // 12. 응답 model 필드 반영
  it("execute() uses response model field in result", async () => {
    const responseWithModel = {
      ...mockOpenRouterResponse,
      model: "anthropic/claude-haiku-4-5",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithModel),
    });

    const result = await runner.execute(makeRequest());

    expect(result.model).toBe("anthropic/claude-haiku-4-5");
  });

  // 13. isAvailable — key 있으면 true
  it("isAvailable() returns true when API key exists", async () => {
    expect(await runner.isAvailable()).toBe(true);
  });

  // 14. isAvailable — key 비어있으면 false
  it("isAvailable() returns false when API key is empty", async () => {
    const emptyRunner = new OpenRouterRunner("");
    expect(await emptyRunner.isAvailable()).toBe(false);
  });

  // 15. supportsTaskType
  it("supportsTaskType() returns true for known types, false for unknown", () => {
    expect(runner.supportsTaskType("code-review")).toBe(true);
    expect(runner.supportsTaskType("code-generation")).toBe(true);
    expect(runner.supportsTaskType("spec-analysis")).toBe(true);
    expect(runner.supportsTaskType("unknown-type")).toBe(false);
  });
});
