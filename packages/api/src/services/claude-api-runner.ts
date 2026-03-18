import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentTaskType,
} from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";

const TASK_SYSTEM_PROMPTS: Record<AgentTaskType, string> = {
  "code-review": `You are a code review agent for the Foundry-X project.
Analyze the provided code files against the spec requirements.
Return a JSON object with "reviewComments" array.
Each comment: { "file": string, "line": number, "comment": string, "severity": "error"|"warning"|"info" }`,

  "code-generation": `You are a code generation agent for the Foundry-X project.
Generate TypeScript code based on the spec requirements.
Return a JSON object with "generatedCode" array.
Each item: { "path": string, "content": string, "action": "create"|"modify" }`,

  "spec-analysis": `You are a spec analysis agent for the Foundry-X project.
Analyze the provided spec for completeness, consistency, and feasibility.
Return a JSON object with "analysis" field containing your assessment.`,

  "test-generation": `You are a test generation agent for the Foundry-X project.
Generate vitest test cases for the provided code and spec.
Return a JSON object with "generatedCode" array containing test files.`,
};

export { TASK_SYSTEM_PROMPTS };

export class ClaudeApiRunner implements AgentRunner {
  readonly type = "claude-api" as const;

  constructor(
    private apiKey: string,
    private model: string = "claude-haiku-4-5-20250714",
  ) {}

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    const systemPrompt = TASK_SYSTEM_PROMPTS[request.taskType];
    const userPrompt = this.buildUserPrompt(request);

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
          analysis: parsed.analysis,
          generatedCode: parsed.generatedCode,
          reviewComments: parsed.reviewComments,
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

  private buildUserPrompt(request: AgentExecutionRequest): string {
    const parts: string[] = [];

    if (request.context.spec) {
      parts.push(
        `## Spec\nTitle: ${request.context.spec.title}\nDescription: ${request.context.spec.description}`,
      );
      if (request.context.spec.acceptanceCriteria.length > 0) {
        parts.push(
          `\nAcceptance Criteria:\n${request.context.spec.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`,
        );
      }
    }

    if (request.context.instructions) {
      parts.push(`\n## Instructions\n${request.context.instructions}`);
    }

    if (request.context.targetFiles?.length) {
      parts.push(
        `\n## Target Files\n${request.context.targetFiles.join("\n")}`,
      );
    }

    parts.push(`\n## Context\nRepo: ${request.context.repoUrl}`);
    parts.push(`Branch: ${request.context.branch}`);

    return parts.join("\n");
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
