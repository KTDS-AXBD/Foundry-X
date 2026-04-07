/**
 * Sprint 57 F179: AgentCollector — LLM 기반 사업 아이템 자동 수집
 * ItemClassifier/StartingPointClassifier와 동일 패턴: AgentRunner.execute() + JSON parseResponse
 */
import type { AgentRunner } from "../../agent/services/agent-runner.js";
import type { AgentExecutionResult } from "../../agent/services/execution-types.js";
import type { CollectionCandidate } from "./collection-pipeline.js";
import {
  AGENT_COLLECTOR_SYSTEM_PROMPT,
  buildCollectorPrompt,
} from "./agent-collector-prompts.js";

export interface AgentCollectRequest {
  keywords: string[];
  maxItems?: number;
  focusArea?: string;
}

export interface AgentCollectResult {
  items: CollectionCandidate[];
  tokensUsed: number;
  model: string;
  duration: number;
}

export class CollectorError extends Error {
  constructor(
    message: string,
    public code: "LLM_EXECUTION_FAILED" | "LLM_PARSE_ERROR" | "EMPTY_RESULT",
  ) {
    super(message);
    this.name = "CollectorError";
  }
}

export class AgentCollector {
  constructor(private runner: AgentRunner) {}

  async collect(request: AgentCollectRequest): Promise<AgentCollectResult> {
    const maxItems = request.maxItems ?? 5;
    const prompt = buildCollectorPrompt(request.keywords, maxItems, request.focusArea);
    const startTime = Date.now();

    const result: AgentExecutionResult = await this.runner.execute({
      taskId: `collect-${Date.now()}`,
      agentId: "agent-collector",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: AGENT_COLLECTOR_SYSTEM_PROMPT,
      },
      constraints: [],
    });

    if (result.status === "failed") {
      throw new CollectorError("LLM execution failed", "LLM_EXECUTION_FAILED");
    }

    const rawText = result.output.analysis ?? "";
    const parsed = this.parseResponse(rawText, request.keywords);
    const duration = Date.now() - startTime;

    if (parsed.length === 0) {
      throw new CollectorError("LLM returned no items", "EMPTY_RESULT");
    }

    return {
      items: parsed,
      tokensUsed: result.tokensUsed ?? 0,
      model: result.model ?? "unknown",
      duration,
    };
  }

  private parseResponse(rawText: string, keywords: string[]): CollectionCandidate[] {
    let jsonStr = rawText.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!.trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new CollectorError(
        `Failed to parse LLM response as JSON: ${rawText.slice(0, 200)}`,
        "LLM_PARSE_ERROR",
      );
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return items.map((item: Record<string, unknown>) => ({
      title: String(item.title ?? "").slice(0, 200),
      description: String(item.description ?? "").slice(0, 5000),
      source: "agent" as const,
      sourceUrl: item.sourceUrl ? String(item.sourceUrl) : undefined,
      keywords: Array.isArray(item.keywords)
        ? item.keywords.map(String)
        : keywords,
    }));
  }
}
