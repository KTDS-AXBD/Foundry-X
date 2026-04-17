import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";
import { TASK_SYSTEM_PROMPTS, buildUserPrompt, getSystemPrompt } from "./prompt-utils.js";

// Re-export for backward compatibility (tests import from this module)
export { UIHINT_INSTRUCTION, TASK_SYSTEM_PROMPTS, DEFAULT_LAYOUT_MAP, buildUserPrompt } from "./prompt-utils.js";

export class ClaudeApiRunner implements AgentRunner {
  readonly type = "claude-api" as const;

  constructor(
    private apiKey: string,
    private model: string = "claude-haiku-4-5-20251001",
  ) {}

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    const systemPrompt = getSystemPrompt(request);
    const userPrompt = buildUserPrompt(request);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      return {
        status: "failed",
        output: {
          analysis: `Claude API error: ${res.status} ${res.statusText}`,
        },
        tokensUsed: 0,
        model: this.model,
        duration: Date.now() - startTime,
      };
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    const tokensUsed = data.usage.input_tokens + data.usage.output_tokens;

    try {
      const parsed = JSON.parse(text);
      return {
        status: "success",
        output: {
          analysis: parsed.analysis ?? text,
          generatedCode: parsed.generatedCode,
          reviewComments: parsed.reviewComments,
          uiHint: parsed.uiHint,  // F60
        },
        tokensUsed,
        model: this.model,
        duration: Date.now() - startTime,
      };
    } catch {
      return {
        status: "partial",
        output: { analysis: text },
        tokensUsed,
        model: this.model,
        duration: Date.now() - startTime,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  supportsTaskType(taskType: string): boolean {
    return taskType in TASK_SYSTEM_PROMPTS;
  }
}

/**
 * Mock Runner — 테스트/오프라인용
 */
export class MockRunner implements AgentRunner {
  readonly type = "mock" as const;

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      status: "success",
      output: {
        analysis: `[Mock] Task ${request.taskType} completed for ${request.context.targetFiles?.join(", ") ?? "no files"}`,
      },
      tokensUsed: 0,
      model: "mock",
      duration: 100,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  supportsTaskType(_taskType: string): boolean {
    return true;
  }
}
