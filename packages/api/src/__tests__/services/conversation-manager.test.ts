// F528 Graph Orchestration (L3) — ConversationManager TDD Red Phase
import { describe, it, expect, vi } from "vitest";
import { ConversationManager } from "../../agent/orchestration/conversation-manager.js";
import type { AnthropicMessage } from "@foundry-x/shared";

function makeMessages(count: number): AnthropicMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Message ${i + 1}`,
  } as AnthropicMessage));
}

describe("F528 ConversationManager", () => {
  it("sliding-window: maxMessages 초과 시 오래된 메시지가 제거된다", () => {
    const manager = new ConversationManager({ strategy: "sliding-window", maxMessages: 3 });
    const messages = makeMessages(5); // user/assistant 5개

    const trimmed = manager.trimMessages(messages);

    expect(trimmed.length).toBeLessThanOrEqual(3);
    // 마지막 메시지는 유지
    expect(trimmed[trimmed.length - 1]).toEqual(messages[messages.length - 1]);
  });

  it("sliding-window: maxMessages 이하 시 메시지가 그대로 유지된다", () => {
    const manager = new ConversationManager({ strategy: "sliding-window", maxMessages: 10 });
    const messages = makeMessages(5);

    const trimmed = manager.trimMessages(messages);

    expect(trimmed.length).toBe(5);
    expect(trimmed).toEqual(messages);
  });

  it("sliding-window: 메시지가 없으면 빈 배열을 반환한다", () => {
    const manager = new ConversationManager({ strategy: "sliding-window", maxMessages: 5 });

    const trimmed = manager.trimMessages([]);

    expect(trimmed).toEqual([]);
  });

  it("summarizing: apply() 호출 시 압축된 메시지 배열을 반환한다", async () => {
    // summarizing은 LLM 호출이 필요하므로 mock fetch 사용
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Summary of previous conversation" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const manager = new ConversationManager({
      strategy: "summarizing",
      maxMessages: 2,
      summaryModel: "claude-haiku-4-5",
    });
    const messages = makeMessages(6); // 6개 메시지

    const result = await manager.apply(messages, "test-api-key");

    // 압축 후 메시지 수가 원본보다 적어야 함
    expect(result.length).toBeLessThan(messages.length);

    vi.unstubAllGlobals();
  });
});
