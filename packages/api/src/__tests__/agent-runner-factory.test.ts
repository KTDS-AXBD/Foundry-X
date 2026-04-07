import { describe, it, expect } from "vitest";
import { createAgentRunner } from "../core/agent/services/agent-runner.js";

describe("createAgentRunner (factory)", () => {
  // 1. OPENROUTER_API_KEY만 → openrouter
  it("returns openrouter runner when OPENROUTER_API_KEY is set", () => {
    const runner = createAgentRunner({
      OPENROUTER_API_KEY: "or-test-key",
    });
    expect(runner.type).toBe("openrouter");
  });

  // 2. 둘 다 → openrouter 우선
  it("prefers openrouter when both keys are set", () => {
    const runner = createAgentRunner({
      OPENROUTER_API_KEY: "or-test-key",
      ANTHROPIC_API_KEY: "ant-test-key",
    });
    expect(runner.type).toBe("openrouter");
  });

  // 3. ANTHROPIC_API_KEY만 → claude-api
  it("returns claude-api runner when only ANTHROPIC_API_KEY is set", () => {
    const runner = createAgentRunner({
      ANTHROPIC_API_KEY: "ant-test-key",
    });
    expect(runner.type).toBe("claude-api");
  });

  // 4. 둘 다 없음 → mock
  it("returns mock runner when no API keys are set", () => {
    const runner = createAgentRunner({});
    expect(runner.type).toBe("mock");
  });

  // 5. OPENROUTER_DEFAULT_MODEL 지정 시 해당 모델 사용
  it("creates openrouter runner with custom model when OPENROUTER_DEFAULT_MODEL is set", () => {
    const runner = createAgentRunner({
      OPENROUTER_API_KEY: "or-test-key",
      OPENROUTER_DEFAULT_MODEL: "google/gemini-2.5-pro",
    });
    expect(runner.type).toBe("openrouter");
  });
});
