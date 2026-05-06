import { describe, it, expect, vi, afterEach } from "vitest";
import { LLMService, buildUserPrompt, NL_TO_SPEC_SYSTEM_PROMPT } from "../../core/infra/llm.js";

describe("LLMService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates with Workers AI when available", async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({ response: '{"title":"Test Feature"}' }),
    };

    const llm = new LLMService(mockAi);
    const result = await llm.generate("system prompt", "user prompt");

    expect(result.content).toBe('{"title":"Test Feature"}');
    expect(result.model).toBe("llama-3.1-8b-instruct");
    expect(mockAi.run).toHaveBeenCalledWith("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "system prompt" },
        { role: "user", content: "user prompt" },
      ],
      max_tokens: 1024,
    });
  });

  it("falls back to Claude API when Workers AI fails", async () => {
    const mockAi = {
      run: vi.fn().mockRejectedValue(new Error("Workers AI unavailable")),
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        content: [{ text: '{"title":"Claude Feature"}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as any);

    const llm = new LLMService(mockAi, "sk-test-key");
    const result = await llm.generate("system prompt", "user prompt");

    expect(result.content).toBe('{"title":"Claude Feature"}');
    expect(result.model).toBe("claude-haiku-4-5");
    expect(result.tokensUsed).toBe(150);
  });

  it("throws when no provider is configured", async () => {
    const llm = new LLMService();
    await expect(llm.generate("system", "user")).rejects.toThrow(
      "No LLM provider configured",
    );
  });
});

describe("buildUserPrompt", () => {
  it("builds prompt without context", () => {
    const prompt = buildUserPrompt("Add login feature");
    expect(prompt).toContain("Add login feature");
    expect(prompt).not.toContain("Project context");
  });

  it("builds prompt with context", () => {
    const prompt = buildUserPrompt("Add login feature", "Next.js project");
    expect(prompt).toContain("Add login feature");
    expect(prompt).toContain("Project context: Next.js project");
  });
});
