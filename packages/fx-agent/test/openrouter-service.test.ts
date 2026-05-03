import { describe, it, expect, vi, afterEach } from "vitest";
import { OpenRouterService } from "../src/services/openrouter-service.js";

describe("OpenRouterService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("올바른 헤더와 바디로 OpenRouter API 호출", async () => {
    const mockResponse = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n'));
          controller.close();
        },
      }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const service = new OpenRouterService("test-api-key", "anthropic/claude-sonnet-4-6");
    const response = await service.streamChat(
      [{ role: "user", content: "hello" }],
      "You are a helpful assistant",
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((init as RequestInit).method).toBe("POST");

    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-api-key");

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.stream).toBe(true);
    expect(body.model).toBe("anthropic/claude-sonnet-4-6");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].content).toBe("hello");

    expect(response.status).toBe(200);
  });

  it("기본 모델 사용 (미지정 시)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );

    const service = new OpenRouterService("key");
    await service.streamChat([], "system");

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]?.body as string);
    expect(body.model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("API 에러 시 Error throw", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    const service = new OpenRouterService("key");
    await expect(
      service.streamChat([{ role: "user", content: "hi" }], "sys"),
    ).rejects.toThrow("OpenRouter API error 429");
  });

  it("네트워크 에러 전파", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));

    const service = new OpenRouterService("key");
    await expect(
      service.streamChat([], "sys"),
    ).rejects.toThrow("network error");
  });
});
