import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";
import { TASK_SYSTEM_PROMPTS, buildUserPrompt, getSystemPrompt } from "./prompt-utils.js";

export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
export const DEFAULT_MAX_TOKENS = 4096;
export const REQUEST_TIMEOUT_MS = 30_000;

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterRunner implements AgentRunner {
  readonly type = "openrouter" as const;

  constructor(
    private apiKey: string,
    private model: string = DEFAULT_MODEL,
    private baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const systemPrompt = getSystemPrompt(request);
      const userPrompt = buildUserPrompt(request);

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://foundry-x-api.ktds-axbd.workers.dev",
          "X-Title": "Foundry-X",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: DEFAULT_MAX_TOKENS,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          status: "failed",
          output: {
            analysis: `OpenRouter API error: ${res.status} ${res.statusText}`,
          },
          tokensUsed: 0,
          model: this.model,
          duration: Date.now() - startTime,
        };
      }

      const data = (await res.json()) as OpenRouterResponse;
      const text = data.choices[0]?.message?.content ?? "";
      const tokensUsed =
        (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);
      const actualModel = data.model ?? this.model;

      try {
        const parsed = JSON.parse(text);
        return {
          status: "success",
          output: {
            analysis: parsed.analysis,
            generatedCode: parsed.generatedCode,
            reviewComments: parsed.reviewComments,
            uiHint: parsed.uiHint,
          },
          tokensUsed,
          model: actualModel,
          duration: Date.now() - startTime,
        };
      } catch {
        return {
          status: "partial",
          output: { analysis: text },
          tokensUsed,
          model: actualModel,
          duration: Date.now() - startTime,
        };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return {
          status: "failed",
          output: {
            analysis: `OpenRouter request timed out after ${REQUEST_TIMEOUT_MS}ms`,
          },
          tokensUsed: 0,
          model: this.model,
          duration: Date.now() - startTime,
        };
      }
      return {
        status: "failed",
        output: {
          analysis: `OpenRouter error: ${err instanceof Error ? err.message : String(err)}`,
        },
        tokensUsed: 0,
        model: this.model,
        duration: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  supportsTaskType(taskType: string): boolean {
    return taskType in TASK_SYSTEM_PROMPTS;
  }
}
