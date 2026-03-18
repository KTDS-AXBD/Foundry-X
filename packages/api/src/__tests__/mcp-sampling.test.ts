import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpSamplingHandler } from "../services/mcp-sampling.js";
import type { LLMService } from "../services/llm.js";
import { createMockD1 } from "./helpers/mock-d1.js";

// ─── Mock LLMService ───

function createMockLlm(overrides?: Partial<LLMService>): LLMService {
  return {
    generate: vi.fn().mockResolvedValue({
      content: "Hello from LLM",
      model: "claude-haiku-4-5",
      tokensUsed: 42,
    }),
    ...overrides,
  } as unknown as LLMService;
}

describe("McpSamplingHandler", () => {
  let db: D1Database;
  let llm: LLMService;
  let handler: McpSamplingHandler;

  beforeEach(() => {
    db = createMockD1() as unknown as D1Database;
    llm = createMockLlm();
    handler = new McpSamplingHandler(llm, db);
  });

  it("handles a normal sampling request and returns LLM response", async () => {
    const result = await handler.handleSamplingRequest("server-1", {
      messages: [{ role: "user", content: { type: "text", text: "Hello" } }],
      maxTokens: 1024,
    });

    expect(result.role).toBe("assistant");
    expect(result.content.type).toBe("text");
    expect(result.content.text).toBe("Hello from LLM");
    expect(result.model).toBe("claude-haiku-4-5");
    expect(result.stopReason).toBe("endTurn");

    expect(llm.generate).toHaveBeenCalledOnce();
  });

  it("rejects maxTokens exceeding the limit", async () => {
    await expect(
      handler.handleSamplingRequest("server-1", {
        messages: [{ role: "user", content: { type: "text", text: "Hi" } }],
        maxTokens: 9999,
      }),
    ).rejects.toThrow("maxTokens 9999 exceeds limit 4096");
  });

  it("enforces per-server rate limiting", async () => {
    const fastHandler = new McpSamplingHandler(llm, db, {
      allowedModels: ["claude-haiku-4-5-20250714"],
      maxTokensPerRequest: 4096,
      maxRequestsPerMinute: 2,
    });

    const req = {
      messages: [{ role: "user" as const, content: { type: "text" as const, text: "Hi" } }],
      maxTokens: 100,
    };

    await fastHandler.handleSamplingRequest("server-rate", req);
    await fastHandler.handleSamplingRequest("server-rate", req);

    await expect(
      fastHandler.handleSamplingRequest("server-rate", req),
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("rejects image content in messages", async () => {
    await expect(
      handler.handleSamplingRequest("server-1", {
        messages: [
          {
            role: "user",
            content: { type: "image", data: "base64data", mimeType: "image/png" },
          },
        ],
        maxTokens: 100,
      }),
    ).rejects.toThrow("Image content is not supported");
  });

  it("logs sampling request to D1 on success", async () => {
    await handler.handleSamplingRequest("server-log", {
      messages: [{ role: "user", content: { type: "text", text: "Log me" } }],
      maxTokens: 512,
    });

    const { results } = await db
      .prepare("SELECT * FROM mcp_sampling_log WHERE server_id = ?")
      .bind("server-log")
      .all();

    expect(results).toHaveLength(1);
    const log = results[0] as Record<string, unknown>;
    expect(log.status).toBe("success");
    expect(log.model).toBe("claude-haiku-4-5");
    expect(log.tokens_used).toBe(42);
  });

  it("converts messages to prompt correctly", () => {
    const prompt = handler.messagesToPrompt([
      { role: "user", content: { type: "text", text: "What is X?" } },
      { role: "assistant", content: { type: "text", text: "X is..." } },
      { role: "user", content: { type: "text", text: "Tell me more" } },
    ]);

    expect(prompt).toContain("User: What is X?");
    expect(prompt).toContain("Assistant: X is...");
    expect(prompt).toContain("User: Tell me more");
  });
});
