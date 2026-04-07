/**
 * Sprint 57 F190: CompetitorScanner — 경쟁사/유사 서비스 스캔
 * AgentRunner를 통해 LLM 호출 → JSON 파싱.
 */
import type { AgentRunner } from "../../agent/services/agent-runner.js";
import type { AgentExecutionResult } from "../../agent/services/execution-types.js";
import { COMPETITOR_SCAN_SYSTEM_PROMPT, buildCompetitorPrompt } from "./competitor-scanner-prompts.js";

export interface CompetitorScanResult {
  competitors: Array<{
    name: string;
    description: string;
    url?: string;
    relevance: "high" | "medium" | "low";
    strengths: string[];
    weaknesses: string[];
  }>;
  marketPosition: string;
  tokensUsed: number;
  model: string;
}

export class CompetitorScanner {
  constructor(private runner: AgentRunner) {}

  async scan(
    item: { title: string; description: string | null },
    context?: { itemType?: string; startingPoint?: string },
  ): Promise<CompetitorScanResult> {
    const prompt = buildCompetitorPrompt(item, context);

    const result: AgentExecutionResult = await this.runner.execute({
      taskId: `competitor-scan-${Date.now()}`,
      agentId: "competitor-scanner",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: COMPETITOR_SCAN_SYSTEM_PROMPT,
      },
      constraints: [],
    });

    if (result.status === "failed") {
      throw new CompetitorScanError("LLM execution failed", "LLM_EXECUTION_FAILED");
    }

    const rawText = result.output.analysis ?? "";
    const parsed = this.parseResponse(rawText);

    return {
      ...parsed,
      tokensUsed: result.tokensUsed,
      model: result.model,
    };
  }

  private parseResponse(rawText: string): Omit<CompetitorScanResult, "tokensUsed" | "model"> {
    let jsonStr = rawText.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!.trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new CompetitorScanError(
        `Failed to parse LLM response as JSON: ${rawText.slice(0, 200)}`,
        "LLM_PARSE_ERROR",
      );
    }

    return {
      competitors: (parsed.competitors as CompetitorScanResult["competitors"]) ?? [],
      marketPosition: String(parsed.marketPosition ?? ""),
    };
  }
}

export class CompetitorScanError extends Error {
  constructor(
    message: string,
    public readonly code: "LLM_EXECUTION_FAILED" | "LLM_PARSE_ERROR",
  ) {
    super(message);
    this.name = "CompetitorScanError";
  }
}
